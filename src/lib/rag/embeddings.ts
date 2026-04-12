import { embed } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAdminClient } from "@/lib/supabase/admin";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
});

const embeddingModel = google.embedding("gemini-embedding-001");

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });
  return embedding;
}

export interface MatchedDocument {
  id: string;
  source: string;
  source_id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export async function searchSimilarDocuments(
  queryEmbedding: number[],
  userId: string,
  limit = 10
): Promise<MatchedDocument[]> {
  const supabase = createAdminClient();

  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("match_documents", {
    query_embedding: embeddingStr,
    filter_user_id: userId,
    match_count: limit,
  });

  if (error) {
    console.error("[rag/embeddings] match_documents error:", error);
    return [];
  }

  return (data ?? []) as MatchedDocument[];
}
