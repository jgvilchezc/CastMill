import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/neon/auth";
import { getConnectedAccount, updateConnectedAccountMeta } from "@/lib/neon/queries";

export async function POST() {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await getConnectedAccount(user.id, "tiktok");

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

  await updateConnectedAccountMeta(user.id, "tiktok", meta);

  return NextResponse.json({ platform_meta: meta });
}
