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
  const after = searchParams.get("after");
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

  const fields =
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";

  const url = new URL("https://graph.instagram.com/v21.0/me/media");
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("access_token", account.access_token);
  if (after) url.searchParams.set("after", after);

  const res = await fetch(url.toString());

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Instagram media list error:", err);
    return NextResponse.json(
      { error: "Failed to fetch media from Instagram" },
      { status: 502 }
    );
  }

  const data = await res.json();
  const nextCursor = data?.paging?.cursors?.after ?? null;
  const hasMore = !!data?.paging?.next;

  return NextResponse.json({
    media: data?.data ?? [],
    cursor: nextCursor,
    has_more: hasMore,
  });
}
