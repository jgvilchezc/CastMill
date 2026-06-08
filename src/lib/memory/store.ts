import { generateEmbedding } from "@/lib/rag/embeddings";
import { createAdminClient } from "@/lib/supabase/admin";

export type MemorySource =
  | "manual"
  | "transcript"
  | "episode"
  | "instagram_caption"
  | "instagram_comment"
  | "instagram_profile"
  | "instagram_insights";

export interface MemoryRecord {
  id: string;
  source: string;
  source_id: string;
  title: string | null;
  content: string;
  metadata: Record<string, unknown>;
  pinned: boolean;
  created_at: string;
}

export interface SaveMemoryInput {
  userId: string;
  source: MemorySource;
  sourceId: string;
  title?: string | null;
  content: string;
  metadata?: Record<string, unknown>;
  pinned?: boolean;
}

const COLUMNS =
  "id, source, source_id, title, content, metadata, pinned, created_at";

export async function saveMemory(
  input: SaveMemoryInput,
): Promise<{ id: string }> {
  const embedding = await generateEmbedding(input.content);
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("rag_documents")
    .upsert(
      {
        user_id: input.userId,
        source: input.source,
        source_id: input.sourceId,
        title: input.title ?? null,
        content: input.content,
        metadata: input.metadata ?? {},
        pinned: input.pinned ?? false,
        embedding: `[${embedding.join(",")}]`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,source,source_id" },
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function listMemories(
  userId: string,
  opts?: { source?: string },
): Promise<MemoryRecord[]> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("rag_documents")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (opts?.source) query = query.eq("source", opts.source);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as MemoryRecord[];
}

export async function deleteMemory(id: string, userId: string): Promise<void> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("rag_documents")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function togglePin(
  id: string,
  userId: string,
  pinned: boolean,
): Promise<void> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("rag_documents")
    .update({ pinned })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function getPinned(userId: string): Promise<MemoryRecord[]> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("rag_documents")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("pinned", true);
  if (error) throw new Error(error.message);
  return (data ?? []) as MemoryRecord[];
}
