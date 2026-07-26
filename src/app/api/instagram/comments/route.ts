import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/neon/auth";
import { getConnectedAccount } from "@/lib/neon/queries";

export async function GET(req: Request) {
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
