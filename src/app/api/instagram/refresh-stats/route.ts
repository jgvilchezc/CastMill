import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/neon/auth";
import { getConnectedAccount, updateConnectedAccountMeta } from "@/lib/neon/queries";

export async function POST() {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await getConnectedAccount(user.id, "instagram");

  if (!account) {
    return NextResponse.json(
      { error: "Instagram account not connected" },
      { status: 400 }
    );
  }

  if (account.expires_at && new Date(account.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Instagram token expired. Please reconnect in Settings." },
      { status: 401 }
    );
  }

  const fields =
    "username,name,profile_picture_url,followers_count,follows_count,media_count,biography";

  const res = await fetch(
    `https://graph.instagram.com/v21.0/me?fields=${fields}&access_token=${account.access_token}`
  );

  let meta: Record<string, unknown> = account.platform_meta ?? {};

  if (res.ok) {
    const d = await res.json();
    meta = {
      ...meta,
      display_name: d.name,
      avatar_url: d.profile_picture_url,
      bio: d.biography,
      follower_count: d.followers_count,
      following_count: d.follows_count,
      media_count: d.media_count,
    };
  } else {
    const err = await res.json().catch(() => ({}));
    console.error("Instagram refresh-stats error:", err);
    return NextResponse.json(
      { error: "Failed to refresh stats from Instagram" },
      { status: 502 }
    );
  }

  await updateConnectedAccountMeta(user.id, "instagram", meta);

  return NextResponse.json({ platform_meta: meta });
}
