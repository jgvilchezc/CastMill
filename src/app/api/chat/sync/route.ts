import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/neon/auth";
import { getSql } from "@/lib/neon/db";
import { ingestInstagramData } from "@/lib/rag/ingest";

export const maxDuration = 120;

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = (await getSql()`
      select source, updated_at::text as updated_at
      from rag_documents
      where user_id = ${user.id}
    `) as { source: string; updated_at: string }[];

    if (rows.length === 0) {
      return NextResponse.json({ synced: false });
    }

    const lastUpdated = rows.reduce((latest, r) => {
      const d = new Date(r.updated_at);
      return d > latest ? d : latest;
    }, new Date(0));

    return NextResponse.json({
      synced: true,
      captions: rows.filter((r) => r.source === "instagram_caption").length,
      comments: rows.filter((r) => r.source === "instagram_comment").length,
      profile: rows.filter((r) => r.source === "instagram_profile").length,
      total: rows.length,
      lastSyncedAt: lastUpdated.toISOString(),
    });
  } catch (err) {
    console.error("[chat/sync] Status check failed:", err);
    return NextResponse.json({ synced: false });
  }
}

export async function POST() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: "AI is not configured" },
      { status: 501 }
    );
  }

  try {
    const result = await ingestInstagramData(user.id);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[chat/sync] Ingestion failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
