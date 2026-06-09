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
const LIST_COLUMNS =
  "id, title, text, language, duration, filename, provider, created_at";

// The transcriptions table is not in the hand-maintained types.ts, so callers
// pass an untyped Supabase client and we cast — matching the rag/memory pattern.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function saveTranscription(
  supabase: AnyClient,
  input: SaveTranscriptionInput,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("transcriptions")
    .insert({
      user_id: input.userId,
      title: input.title,
      text: input.text,
      language: input.language,
      duration: input.duration,
      filename: input.filename,
      provider: input.provider,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[transcribe/history] save failed:", error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function listTranscriptions(
  supabase: AnyClient,
  userId: string,
): Promise<TranscriptionRow[]> {
  const { data, error } = await supabase
    .from("transcriptions")
    .select(LIST_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (error) throw new Error(error.message);
  return (data ?? []) as TranscriptionRow[];
}

export async function deleteTranscription(
  supabase: AnyClient,
  id: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("transcriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
