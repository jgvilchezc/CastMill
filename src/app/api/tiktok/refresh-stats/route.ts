import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = await (supabase as any)
    .from("connected_accounts")
    .select("access_token, expires_at, platform_meta")
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

  const basicFields = "display_name,avatar_url,avatar_large_url";
  const profileFields = "bio_description,is_verified,profile_deep_link";
  const statsFields = "follower_count,following_count,likes_count,video_count";

  const [basicRes, profileRes, statsRes] = await Promise.all([
    fetch(
      `https://open.tiktokapis.com/v2/user/info/?fields=${basicFields}`,
      { headers: { Authorization: `Bearer ${account.access_token}` } }
    ),
    fetch(
      `https://open.tiktokapis.com/v2/user/info/?fields=${profileFields}`,
      { headers: { Authorization: `Bearer ${account.access_token}` } }
    ),
    fetch(
      `https://open.tiktokapis.com/v2/user/info/?fields=${statsFields}`,
      { headers: { Authorization: `Bearer ${account.access_token}` } }
    ),
  ]);

  let meta: Record<string, unknown> = account.platform_meta ?? {};

  if (basicRes.ok) {
    const d = await basicRes.json();
    const b = d?.data?.user ?? {};
    meta = {
      ...meta,
      display_name: b.display_name,
      avatar_url: b.avatar_large_url ?? b.avatar_url,
    };
  }

  if (profileRes.ok) {
    const d = await profileRes.json();
    const u = d?.data?.user ?? {};
    meta = {
      ...meta,
      bio: u.bio_description,
      is_verified: u.is_verified,
    };
  }

  if (statsRes.ok) {
    const d = await statsRes.json();
    const s = d?.data?.user ?? {};
    meta = {
      ...meta,
      follower_count: s.follower_count,
      following_count: s.following_count,
      likes_count: s.likes_count,
      video_count: s.video_count,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("connected_accounts")
    .update({
      platform_meta: meta,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("platform", "tiktok");

  return NextResponse.json({ platform_meta: meta });
}
