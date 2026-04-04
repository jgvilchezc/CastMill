import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/settings?error=instagram_oauth_failed`);
  }

  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    userId = decoded.userId;
  } catch {
    return NextResponse.redirect(`${appUrl}/settings?error=instagram_invalid_state`);
  }

  const redirectUri = `${appUrl}/api/auth/instagram/callback`;

  const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID ?? "",
      client_secret: process.env.INSTAGRAM_APP_SECRET ?? "",
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/settings?error=instagram_token_failed`);
  }

  const tokenData = await tokenRes.json();
  const { access_token, user_id: platformUserId } = tokenData;

  const longRes = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_APP_SECRET}&access_token=${access_token}`
  );

  let finalToken = access_token;
  let expiresAt: string | null = null;
  if (longRes.ok) {
    const longData = await longRes.json();
    finalToken = longData.access_token ?? access_token;
    if (longData.expires_in) {
      expiresAt = new Date(Date.now() + longData.expires_in * 1000).toISOString();
    }
  }

  const meRes = await fetch(
    `https://graph.instagram.com/${platformUserId}?fields=username&access_token=${finalToken}`
  );
  let platformUsername: string | null = null;
  if (meRes.ok) {
    const meData = await meRes.json();
    platformUsername = meData.username ?? null;
  }

  const supabase = await createClient();
  await supabase.from("connected_accounts").upsert(
    {
      user_id: userId,
      platform: "instagram",
      access_token: finalToken,
      refresh_token: null,
      expires_at: expiresAt,
      platform_user_id: String(platformUserId),
      platform_username: platformUsername,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" }
  );

  return NextResponse.redirect(`${appUrl}/settings?connected=instagram`);
}
