import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = await (supabase as any)
    .from("connected_accounts")
    .select("access_token, expires_at")
    .eq("user_id", user.id)
    .eq("platform", "tiktok")
    .single();

  if (!account) {
    return NextResponse.json(
      { error: "TikTok account not connected" },
      { status: 400 }
    );
  }

  if (account.expires_at && new Date(account.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "TikTok token expired. Please reconnect in Settings." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const maxCount = Math.min(Number(searchParams.get("max_count") ?? 20), 20);

  const fields =
    "id,title,video_description,create_time,cover_image_url,share_url," +
    "view_count,like_count,comment_count,share_count,duration";

  const body: Record<string, unknown> = { max_count: maxCount };
  if (cursor) body.cursor = Number(cursor);

  const res = await fetch(
    `https://open.tiktokapis.com/v2/video/list/?fields=${fields}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("TikTok video list error:", err);
    return NextResponse.json(
      { error: "Failed to fetch videos from TikTok" },
      { status: 502 }
    );
  }

  const data = await res.json();
  return NextResponse.json({
    videos: data?.data?.videos ?? [],
    cursor: data?.data?.cursor,
    has_more: data?.data?.has_more ?? false,
  });
}
