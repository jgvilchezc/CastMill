import { generateEmbedding } from "@/lib/rag/embeddings";
import { getSql } from "@/lib/neon/db";
import { normalizeRows } from "@/lib/neon/rows";

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

export async function saveMemory(
  input: SaveMemoryInput,
): Promise<{ id: string }> {
  const embedding = await generateEmbedding(input.content);
  const sql = getSql();

  const rows = (await sql`
    insert into rag_documents
      (user_id, source, source_id, title, content, metadata, pinned, embedding, updated_at)
    values (
      ${input.userId},
      ${input.source},
      ${input.sourceId},
      ${input.title ?? null},
      ${input.content},
      ${JSON.stringify(input.metadata ?? {})}::jsonb,
      ${input.pinned ?? false},
      ${`[${embedding.join(",")}]`}::vector,
      now()
    )
    on conflict (user_id, source, source_id) do update set
      title      = excluded.title,
      content    = excluded.content,
      metadata   = excluded.metadata,
      pinned     = excluded.pinned,
      embedding  = excluded.embedding,
      updated_at = now()
    returning id
  `) as { id: string }[];

  return { id: rows[0].id };
}

export async function listMemories(
  userId: string,
  opts?: { source?: string },
): Promise<MemoryRecord[]> {
  const sql = getSql();

  const rows = opts?.source
    ? await sql`
        select id, source, source_id, title, content, metadata, pinned, created_at
        from rag_documents
        where user_id = ${userId} and source = ${opts.source}
        order by created_at desc
      `
    : await sql`
        select id, source, source_id, title, content, metadata, pinned, created_at
        from rag_documents
        where user_id = ${userId}
        order by created_at desc
      `;

  return normalizeRows<MemoryRecord>(rows as Record<string, unknown>[]);
}

export async function deleteMemory(id: string, userId: string): Promise<void> {
  const sql = getSql();
  await sql`delete from rag_documents where id = ${id} and user_id = ${userId}`;
}

export async function togglePin(
  id: string,
  userId: string,
  pinned: boolean,
): Promise<void> {
  const sql = getSql();
  await sql`
    update rag_documents set pinned = ${pinned}
    where id = ${id} and user_id = ${userId}
  `;
}

export async function getPinned(userId: string): Promise<MemoryRecord[]> {
  const sql = getSql();
  const rows = await sql`
    select id, source, source_id, title, content, metadata, pinned, created_at
    from rag_documents
    where user_id = ${userId} and pinned = true
  `;
  return normalizeRows<MemoryRecord>(rows as Record<string, unknown>[]);
}
