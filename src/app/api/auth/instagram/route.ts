import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appId = process.env.INSTAGRAM_APP_ID;
  if (!appId) {
    return NextResponse.json(
      { error: "Instagram OAuth not configured" },
      { status: 500 }
    );
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`;
  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString("base64url");
  const scope = "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments";

  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scope);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
