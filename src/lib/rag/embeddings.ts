import { embed } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getSql } from "@/lib/neon/db";

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
  pinned?: boolean;
  title?: string | null;
}

export async function searchSimilarDocuments(
  queryEmbedding: number[],
  userId: string,
  limit = 10
): Promise<MatchedDocument[]> {
  const sql = getSql();
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  try {
    const rows = await sql`
      select id, source, source_id, content, metadata, similarity, pinned, title
      from match_documents(${embeddingStr}::vector, ${userId}::uuid, ${limit})
    `;
    return rows as MatchedDocument[];
  } catch (error) {
    console.error("[rag/embeddings] match_documents error:", error);
    return [];
  }
}
