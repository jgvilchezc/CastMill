import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateEmbedding,
  searchSimilarDocuments,
} from "@/lib/rag/embeddings";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { q?: string };
  const q = typeof body.q === "string" ? body.q.trim() : "";
  if (!q) {
    return NextResponse.json({ matches: [] });
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: "Embeddings not configured" },
      { status: 503 },
    );
  }

  const embedding = await generateEmbedding(q);
  const matches = await searchSimilarDocuments(embedding, user.id, 20);
  return NextResponse.json({ matches });
}
