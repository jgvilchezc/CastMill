import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = await (supabase as any)
    .from("connected_accounts")
    .select("access_token, expires_at")
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

  const { searchParams } = new URL(req.url);
  const mediaId = searchParams.get("media_id");

  if (!mediaId) {
    return NextResponse.json(
      { error: "media_id is required" },
      { status: 400 }
    );
  }

  const fields = "id,text,timestamp,username,like_count";

  const url = new URL(
    `https://graph.instagram.com/v21.0/${mediaId}/comments`
  );
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", "50");
  url.searchParams.set("access_token", account.access_token);

  const res = await fetch(url.toString());

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Instagram comments error:", err);
    return NextResponse.json(
      { error: "Failed to fetch comments from Instagram" },
      { status: 502 }
    );
  }

  const data = await res.json();

  return NextResponse.json({
    comments: data?.data ?? [],
  });
}
