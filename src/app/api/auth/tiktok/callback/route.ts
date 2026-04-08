import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/security/validate";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/settings?error=tiktok_oauth_failed`);
  }

  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    userId = decoded.userId;
    if (!isValidUUID(userId)) {
      return NextResponse.redirect(`${appUrl}/settings?error=tiktok_invalid_state`);
    }
  } catch {
    return NextResponse.redirect(`${appUrl}/settings?error=tiktok_invalid_state`);
  }

  const supabaseCheck = await createClient();
  const { data: { user: sessionUser } } = await supabaseCheck.auth.getUser();
  if (!sessionUser || sessionUser.id !== userId) {
    return NextResponse.redirect(`${appUrl}/settings?error=tiktok_session_mismatch`);
  }

  const redirectUri = `${appUrl}/api/auth/tiktok/callback`;

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
      client_secret: process.env.TIKTOK_CLIENT_SECRET ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/settings?error=tiktok_token_failed`);
  }

  const tokenData = await tokenRes.json();
  const {
    access_token,
    refresh_token,
    expires_in,
    open_id: platformUserId,
  } = tokenData;

  const profileFields = "bio_description,is_verified,profile_deep_link,profile_web_link";
  const statsFields = "follower_count,following_count,likes_count,video_count";

  const [profileRes, statsRes] = await Promise.all([
    fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${profileFields}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    }),
    fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${statsFields}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    }),
  ]);

  let platformUsername: string | null = null;
  let platformMeta: Record<string, unknown> = {};

  if (profileRes.ok) {
    const profileData = await profileRes.json();
    const u = profileData?.data?.user ?? {};
    platformUsername = u.profile_deep_link?.split("@")?.[1] ?? null;
    platformMeta = { ...platformMeta, bio: u.bio_description, is_verified: u.is_verified };
  }

  if (statsRes.ok) {
    const statsData = await statsRes.json();
    const s = statsData?.data?.user ?? {};
    platformMeta = {
      ...platformMeta,
      follower_count: s.follower_count,
      following_count: s.following_count,
      likes_count: s.likes_count,
      video_count: s.video_count,
    };
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("connected_accounts").upsert(
    {
      user_id: userId,
      platform: "tiktok",
      access_token,
      refresh_token: refresh_token ?? null,
      expires_at: expires_in
        ? new Date(Date.now() + expires_in * 1000).toISOString()
        : null,
      platform_user_id: platformUserId ?? null,
      platform_username: platformUsername,
      platform_meta: platformMeta,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" }
  );

  return NextResponse.redirect(`${appUrl}/settings?connected=tiktok`);
}
