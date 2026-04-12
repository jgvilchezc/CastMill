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
    .eq("platform", "instagram")
    .single();

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("connected_accounts")
    .update({
      platform_meta: meta,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("platform", "instagram");

  return NextResponse.json({ platform_meta: meta });
}
