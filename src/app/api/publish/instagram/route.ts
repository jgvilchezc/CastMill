import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidPublicUrl, sanitizeString } from "@/lib/security/validate";

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
    .select("access_token, platform_user_id, expires_at")
    .eq("user_id", user.id)
    .eq("platform", "instagram")
    .single();

  if (!account) {
    return NextResponse.json(
      { error: "Instagram account not connected. Visit Settings to connect." },
      { status: 400 }
    );
  }

  if (account.expires_at && new Date(account.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Instagram token expired. Please reconnect in Settings." },
      { status: 401 }
    );
  }

  const { videoUrl, caption } = await req.json();

  if (!videoUrl || typeof videoUrl !== "string") {
    return NextResponse.json(
      { error: "videoUrl is required (publicly accessible URL)" },
      { status: 400 }
    );
  }

  if (!isValidPublicUrl(videoUrl)) {
    return NextResponse.json(
      { error: "videoUrl must be a valid public HTTPS URL" },
      { status: 400 }
    );
  }

  const safeCaption = sanitizeString(caption, 2200);

  const igUserId = account.platform_user_id;
  const token = account.access_token;

  const containerRes = await fetch(
    `https://graph.instagram.com/v19.0/${igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: videoUrl,
        caption: safeCaption,
        share_to_feed: true,
        access_token: token,
      }),
    }
  );

  if (!containerRes.ok) {
    const err = await containerRes.json().catch(() => ({}));
    console.error("Instagram container error:", err);
    return NextResponse.json(
      { error: "Failed to create Instagram media container" },
      { status: 502 }
    );
  }

  const containerData = await containerRes.json();
  const containerId = containerData.id;

  const publishRes = await fetch(
    `https://graph.instagram.com/v19.0/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: token,
      }),
    }
  );

  if (!publishRes.ok) {
    const err = await publishRes.json().catch(() => ({}));
    console.error("Instagram publish error:", err);
    return NextResponse.json(
      { error: "Failed to publish to Instagram" },
      { status: 502 }
    );
  }

  const publishData = await publishRes.json();
  return NextResponse.json({
    success: true,
    mediaId: publishData.id,
    message: "Reel published to Instagram successfully.",
  });
}
