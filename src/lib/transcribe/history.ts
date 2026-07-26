import { getSql } from "@/lib/neon/db";
import { normalizeRows } from "@/lib/neon/rows";

export interface TranscriptionRow {
  id: string;
  title: string;
  text: string;
  language: string | null;
  duration: number | null;
  filename: string | null;
  provider: string | null;
  created_at: string;
}

export interface SaveTranscriptionInput {
  userId: string;
  title: string;
  text: string;
  language: string | null;
  duration: number;
  filename: string;
  provider: string;
}

const LIST_LIMIT = 50;

export async function saveTranscription(
  input: SaveTranscriptionInput,
): Promise<string | null> {
  try {
    const rows = (await getSql()`
      insert into transcriptions
        (user_id, title, text, language, duration, filename, provider)
      values (
        ${input.userId}, ${input.title}, ${input.text}, ${input.language},
        ${input.duration}, ${input.filename}, ${input.provider}
      )
      returning id
    `) as { id: string }[];
    return rows[0]?.id ?? null;
  } catch (error) {
    console.error(
      "[transcribe/history] save failed:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export async function listTranscriptions(
  userId: string,
): Promise<TranscriptionRow[]> {
  const rows = await getSql()`
    select id, title, text, language, duration, filename, provider, created_at
    from transcriptions
    where user_id = ${userId}
    order by created_at desc
    limit ${LIST_LIMIT}
  `;
  return normalizeRows<TranscriptionRow>(rows as Record<string, unknown>[]);
}

export async function deleteTranscription(
  id: string,
  userId: string,
): Promise<void> {
  await getSql()`
    delete from transcriptions where id = ${id} and user_id = ${userId}
  `;
}
