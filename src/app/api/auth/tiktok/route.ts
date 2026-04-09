import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    return NextResponse.json(
      { error: "TikTok OAuth not configured" },
      { status: 500 }
    );
  }

  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

  const cookieStore = await cookies();
  cookieStore.set("tiktok_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`;
  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString("base64url");
  const scope = "user.info.basic,user.info.profile,user.info.stats,video.list,video.upload";

  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", clientKey);
  url.searchParams.set("scope", scope);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(url.toString());
}
