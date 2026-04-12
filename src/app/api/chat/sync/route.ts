import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ingestInstagramData } from "@/lib/rag/ingest";

export const maxDuration = 120;

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
