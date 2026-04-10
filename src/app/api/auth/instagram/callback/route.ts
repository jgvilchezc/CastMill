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
    return NextResponse.redirect(`${appUrl}/settings?error=instagram_oauth_failed`);
  }

  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    userId = decoded.userId;
    if (!isValidUUID(userId)) {
      return NextResponse.redirect(`${appUrl}/settings?error=instagram_invalid_state`);
    }
  } catch {
    return NextResponse.redirect(`${appUrl}/settings?error=instagram_invalid_state`);
  }

  const supabaseCheck = await createClient();
  const { data: { user: sessionUser } } = await supabaseCheck.auth.getUser();
  if (!sessionUser || sessionUser.id !== userId) {
    return NextResponse.redirect(`${appUrl}/settings?error=instagram_session_mismatch`);
  }

  const redirectUri = `${appUrl}/api/auth/instagram/callback`;

  const tokenRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?` +
    new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID ?? "",
      client_secret: process.env.INSTAGRAM_APP_SECRET ?? "",
      redirect_uri: redirectUri,
      code,
    })
  );

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    console.error("Facebook token exchange failed:", errBody);
    return NextResponse.redirect(`${appUrl}/settings?error=instagram_token_failed`);
  }

  const tokenData = await tokenRes.json();
  const shortToken = tokenData.access_token;

  const longRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?` +
    new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: process.env.INSTAGRAM_APP_ID ?? "",
      client_secret: process.env.INSTAGRAM_APP_SECRET ?? "",
      fb_exchange_token: shortToken,
    })
  );

  let finalToken = shortToken;
  let expiresAt: string | null = null;
  if (longRes.ok) {
    const longData = await longRes.json();
    finalToken = longData.access_token ?? shortToken;
    if (longData.expires_in) {
      expiresAt = new Date(Date.now() + longData.expires_in * 1000).toISOString();
    }
  }

  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account&access_token=${finalToken}`
  );

  let igAccountId: string | null = null;
  let pageName: string | null = null;
  if (pagesRes.ok) {
    const pagesData = await pagesRes.json();
    const pageWithIg = pagesData.data?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.instagram_business_account?.id
    );
    if (pageWithIg) {
      igAccountId = pageWithIg.instagram_business_account.id;
      pageName = pageWithIg.name;
    }
  }

  if (!igAccountId) {
    return NextResponse.redirect(`${appUrl}/settings?error=instagram_no_business_account`);
  }

  const igFields = "username,name,profile_picture_url,followers_count,follows_count,media_count,biography";
  const igRes = await fetch(
    `https://graph.facebook.com/v21.0/${igAccountId}?fields=${igFields}&access_token=${finalToken}`
  );

  let platformUsername: string | null = null;
  let platformMeta: Record<string, unknown> = {};

  if (igRes.ok) {
    const igData = await igRes.json();
    platformUsername = igData.username ?? null;
    platformMeta = {
      display_name: igData.name,
      avatar_url: igData.profile_picture_url,
      bio: igData.biography,
      follower_count: igData.followers_count,
      following_count: igData.follows_count,
      media_count: igData.media_count,
      facebook_page_name: pageName,
    };
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("connected_accounts").upsert(
    {
      user_id: userId,
      platform: "instagram",
      access_token: finalToken,
      refresh_token: null,
      expires_at: expiresAt,
      platform_user_id: igAccountId,
      platform_username: platformUsername,
      platform_meta: platformMeta,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" }
  );

  return NextResponse.redirect(`${appUrl}/settings?connected=instagram`);
}
