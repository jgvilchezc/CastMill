import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  } catch {
    return NextResponse.redirect(`${appUrl}/settings?error=tiktok_invalid_state`);
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

  const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name,username", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  let platformUsername: string | null = null;
  if (userRes.ok) {
    const userData = await userRes.json();
    platformUsername = userData?.data?.user?.username ?? userData?.data?.user?.display_name ?? null;
  }

  const supabase = await createClient();
  await supabase.from("connected_accounts").upsert(
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
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" }
  );

  return NextResponse.redirect(`${appUrl}/settings?connected=tiktok`);
}
