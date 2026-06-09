# Quick Transcribe — History (Design)

**Date:** 2026-06-08
**Status:** Approved (design)
**Branch:** `feat/transcribe-history`

## Summary

Quick Transcribe is currently ephemeral: a logged-in or anonymous user transcribes
an audio, copies/downloads the text, and it is gone. This feature adds a **persistent
history** for logged-in users: every successful transcription is automatically saved
to a cheap text table, given an **AI-generated title** via a low-cost Groq model, and
surfaced in a history panel on the transcribe page so it is always available.

The defining constraint is **cost** — this is a free feature. So: text only (no audio
storage), no embeddings (the existing "Save to Memory" button remains the opt-in
semantic/paid layer), and a tiny Groq `llama-3.1-8b-instant` call for the title.

## Goals

- Logged-in users' transcriptions are auto-saved and always retrievable.
- Each saved transcription gets a short, relevant AI title (cheap), with a free
  heuristic fallback.
- A history panel on the transcribe page lists, reloads, and deletes past items.
- Near-zero marginal cost per transcription.

## Non-Goals (v1)

- Anonymous-user history (anonymous use continues unchanged, no persistence — history
  is a sign-up incentive).
- Storing the audio file (text only).
- Embedding transcriptions for semantic search (that is the existing opt-in
  "Save to Memory" path via `rag_documents`).
- Cross-feature unification with Memory — history and Memory stay separate layers.

## Architecture (Approach A — dedicated `transcriptions` table)

### 1. Data model — migration `007_transcriptions.sql`

```sql
create table if not exists public.transcriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  text       text not null,
  language   text,
  duration   real,
  filename   text,
  provider   text,
  created_at timestamptz not null default now()
);

create index if not exists transcriptions_user_created_idx
  on public.transcriptions (user_id, created_at desc);

alter table public.transcriptions enable row level security;

create policy "Users manage own transcriptions"
  on public.transcriptions for all
  using (auth.uid() = user_id);
```

No vectors, no audio. The table is accessed with the existing `(supabase as any)`
cast pattern used by the RAG/memory code (the table is not added to the
hand-maintained `src/lib/supabase/types.ts`).

### 2. Title generation — `src/lib/transcribe/title.ts`

`generateTitle(text: string): Promise<string>`:
- If `GROQ_API_KEY` is set, call Groq `llama-3.1-8b-instant` with a system prompt:
  "Generate a short, specific title (max 6 words) for this audio transcription.
  Reply with ONLY the title, no quotes, in the same language as the text."
  `max_tokens: 20`, `temperature: 0.3`. Pass only the first ~1200 chars of the
  transcript to bound input cost.
- Trim the result to 80 chars. On empty result, error, or missing key, fall back to
  `fallbackTitle(text)` — the first ~8 words of the text, or "Transcripción" if empty.

This isolates the one recurring cost into a single, mockable unit.

### 3. Auto-save — modify `src/app/api/tools/transcribe/route.ts`

The route already resolves `user` (for anonymous rate-limiting). After a successful
transcription, and only when `user` is present:

```ts
let savedId: string | null = null;
let savedTitle: string | null = null;
if (user) {
  try {
    savedTitle = await generateTitle(text);
    const { data } = await supabase
      .from("transcriptions")
      .insert({
        user_id: user.id,
        title: savedTitle,
        text,
        language: result.language,
        duration,
        filename: audio.name,
        provider: result.provider,
      })
      .select("id")
      .single();
    savedId = data?.id ?? null;
  } catch (err) {
    console.error("[transcribe] history save failed:", err);
  }
}
```

The save is wrapped so a failure never breaks the transcription response. The
response gains `historyId` and `title` fields (additive; existing consumers ignore
them). Anonymous users hit none of this.

### 4. History API — `src/app/api/tools/transcribe/history/route.ts`

- `GET` → 401 if no user; else the user's transcriptions ordered `created_at desc`,
  limited to 50, returned as `{ items }` (each item includes `id, title, text,
  language, duration, filename, created_at`).
- `DELETE` → body `{ id }`; 401 if no user; deletes scoped by `id` AND `user_id`;
  returns `{ ok: true }`.

### 5. UI — history panel in `TranscribeTool`

- A "Historial" section rendered **only for logged-in users** (via `useUser()`).
- Loads `GET /api/tools/transcribe/history` on mount; renders a list of past items
  (title, relative date, language badge).
- Clicking an item loads its text into the existing result/edit view (sets
  `result` + `editedText` so copy/download/Save-to-Memory all work on it).
- A delete button per item calls `DELETE` and removes it from the list.
- After a new successful transcription, the new item (from the response `historyId`
  + `title`) is prepended to the list without a refetch.

## Data flow

```
Logged-in transcribe ─→ Whisper (Groq/HF) ─→ text
                                              ├─→ generateTitle() [Groq 8b, cheap]
                                              └─→ INSERT transcriptions (text only)
History panel ─→ GET /history (list) / DELETE (remove)
Anonymous transcribe ─→ Whisper ─→ text (no save)
```

## Error handling

- History save failure (title or insert) is caught and logged; the transcription
  response still succeeds.
- Title generation failure or missing `GROQ_API_KEY` → free heuristic fallback title.
- History API routes are auth-gated (401) and RLS-scoped (`auth.uid() = user_id`).
- Delete enforces `user_id` ownership.

## Cost summary

Per logged-in transcription: 1 text `INSERT` + 1 Groq `llama-3.1-8b-instant` call
(~20 output tokens, ≤1200-char input). No embeddings, no blob/audio storage.
Effectively free at scale. Memory's embedding path is untouched and remains opt-in.

## Testing

- `title.ts` — `generateTitle`: AI title happy path (Groq mocked), fallback on Groq
  error, fallback when no API key; `fallbackTitle` word/length bounds.
- `history/route.ts` — auth gating (401), list happy path (mocked supabase, asserts
  user scoping + order + limit), delete scoping.
- Auto-save in the transcribe route + the UI panel — verified via build/lint +
  manual checks (the transcribe route handles multipart files and is covered
  end-to-end manually).

## Open decisions (resolved)

- History list capped at 50 most-recent items (rows retained, not auto-deleted).
- Title is auto-generated only; manual title editing is out of scope for v1.
- The transcribe response returns the generated title so the UI shows it immediately.
