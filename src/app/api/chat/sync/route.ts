import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestInstagramData } from "@/lib/rag/ingest";

export const maxDuration = 120;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
      .from("rag_documents")
      .select("source, updated_at")
      .eq("user_id", user.id);

    const rows = (data ?? []) as { source: string; updated_at: string }[];

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
