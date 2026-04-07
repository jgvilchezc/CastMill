import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeString } from "@/lib/security/validate";

export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (!profile || profile.plan !== "pro") {
    return NextResponse.json(
      { error: "Direct publishing requires Pro plan" },
      { status: 403 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = await (supabase as any)
    .from("connected_accounts")
    .select("access_token, expires_at")
    .eq("user_id", user.id)
    .eq("platform", "tiktok")
    .single();

  if (!account) {
    return NextResponse.json(
      { error: "TikTok account not connected. Visit Settings to connect." },
      { status: 400 }
    );
  }

  if (account.expires_at && new Date(account.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "TikTok token expired. Please reconnect in Settings." },
      { status: 401 }
    );
  }

  const contentLength = req.headers.get("content-length");
  const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB
  if (contentLength && parseInt(contentLength, 10) > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Upload too large (max 100MB)" }, { status: 413 });
  }

  const formData = await req.formData();
  const videoFile = formData.get("video") as File | null;
  const caption = sanitizeString((formData.get("caption") as string) ?? "", 2200);

  if (!videoFile) {
    return NextResponse.json({ error: "video file is required" }, { status: 400 });
  }

  if (videoFile.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Video file too large (max 100MB)" }, { status: 413 });
  }

  const initRes = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: caption.slice(0, 150),
          privacy_level: "SELF_ONLY",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: videoFile.size,
          chunk_size: videoFile.size,
          total_chunk_count: 1,
        },
      }),
    }
  );

  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({}));
    console.error("TikTok init error:", err);
    return NextResponse.json(
      { error: "Failed to initiate TikTok upload" },
      { status: 502 }
    );
  }

  const initData = await initRes.json();
  const { publish_id, upload_url } = initData?.data ?? {};

  if (!upload_url) {
    return NextResponse.json(
      { error: "No upload URL from TikTok" },
      { status: 502 }
    );
  }

  const videoBuffer = await videoFile.arrayBuffer();
  const uploadRes = await fetch(upload_url, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Range": `bytes 0-${videoFile.size - 1}/${videoFile.size}`,
    },
    body: videoBuffer,
  });

  if (!uploadRes.ok) {
    return NextResponse.json(
      { error: "Failed to upload video to TikTok" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    publishId: publish_id,
    message: "Video uploaded to TikTok. It will be published shortly.",
  });
}
