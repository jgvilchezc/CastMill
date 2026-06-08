# Memory — Unified Second Brain (Design)

**Date:** 2026-06-08
**Status:** Approved (design)
**Branch:** `feat/memory`

## Summary

"Memory" is a unified semantic second brain for the user. It is fed by two
kinds of input — **auto-ingested sources** (Instagram, Quick Transcribe
transcripts, podcast episodes) and **manual notes** the user curates by hand —
and the AI Chat draws on it as context. A new `/memory` page lets the user
browse, search, add, pin, and delete what the brain knows.

The feature reuses the existing RAG infrastructure (pgvector `rag_documents`
table, `match_documents` RPC, Gemini embeddings in `src/lib/rag/`) rather than
introducing a parallel vector store.

## Goals

- One unified memory the Chat uses as context, spanning all sources.
- Manual notes with a **hybrid** retrieval model: each note can be *pinned*
  (always injected into Chat) or left unpinned (retrieved semantically).
- A `/memory` UI to browse, search, add, pin/unpin, and delete memories.
- Thin per-source adapters that all funnel into one embed → store path.

## Non-Goals (v1)

- Auto-ingestion of transcripts/episodes — ingestion is **opt-in per item**.
- Pinning arbitrary (non-manual) memories — pin is manual-only in v1.
- A dedicated `memories` table — we extend `rag_documents` instead.
- Re-architecting the Instagram sync pipeline — it already writes to
  `rag_documents` and is surfaced read-only in the UI.

## Architecture (Approach A — extend `rag_documents`)

### Key finding

`match_documents` already filters **only by `user_id`** and returns all
sources. The Chat's semantic retrieval is therefore already cross-source — the
only reason it is "Instagram-only" today is that Instagram is the only data in
the table. Generalizing retrieval is nearly free; the work is writing the other
sources in and softening the Chat's hardcoded Instagram persona.

### 1. Data model — migration `005`

Extend `public.rag_documents`:

- Relax the `source` CHECK constraint to also allow: `manual`, `transcript`,
  `episode` (keep the existing `instagram_*` values).
- Add `pinned boolean not null default false`.
- Add `title text` (nullable) — display label for the UI.
- Reuse existing `metadata jsonb` for per-source extras (duration, language,
  episode title, topics).
- `source_id` conventions:
  - `manual` → generated uuid
  - `transcript` → transcribe job id / content hash
  - `episode` → `episodeId`, with `#<index>` suffix when chunked
- The existing `unique (user_id, source, source_id)` makes re-indexing the same
  item an upsert instead of a duplicate.

No new vector index (the 3072-dim constraint documented in migration `003`
still applies — exact scan via `match_documents` is fine at this scale).

### 2. Memory engine — `src/lib/memory/`

`store.ts` exposes the single funnel all sources use:

- `saveMemory({ userId, source, sourceId, title, content, metadata, pinned })`
  → `generateEmbedding(content)` + upsert into `rag_documents`.
- `deleteMemory(id, userId)`
- `togglePin(id, userId, pinned)`
- `listMemories(userId, { source? })` — browse list, ordered by `created_at`.
- `getPinned(userId)` — pinned manual notes for Chat injection.

`chunk.ts` — split long text (episodes/transcripts) into ~800-char chunks on
paragraph boundaries, stored as multiple rows with `source_id = <id>#<i>`.
Manual notes are short and are not chunked.

Adapters (all terminate in `saveMemory()`):

- **manual** — `/api/memory` route: `POST` create, `PATCH` edit/pin, `DELETE`.
- **transcribe** — "Save to Memory" button in `TranscribeTool` →
  `source: "transcript"`, `content: text`, `title: filename`.
- **episode** — "Index" action over an episode's transcript →
  `source: "episode"`, `sourceId: episodeId`, chunked.
- **instagram** — already writes to `rag_documents`; only surfaced read-only in
  the UI, no new ingest code.

### 3. Chat integration (modifies existing `/chat` behavior)

- `getPinned(userId)` results are injected **always** into the system prompt as
  a "PINNED FACTS" block, regardless of the query.
- Semantic retrieval is already cross-source — no query change; more data
  simply flows in once other sources are populated.
- Generalize the persona: from the hardcoded "Instagram content strategist" to
  a "content strategist with access to your memory (Instagram, transcripts,
  episodes, your notes)". Update `getDocumentCounts` / `buildSystemPrompt` to be
  source-aware rather than Instagram-specific.

### 4. UI — `/memory` route

- Enable the existing sidebar item (remove `disabled: true`) and add `/memory`
  to the proxy auth-gated routes.
- Page composition:
  - Header + "Add note" button (modal: title, content, pin toggle).
  - Semantic search bar.
  - Source filter chips: All / Manual / Transcribe / Episodes / Instagram.
  - Memory cards: title, snippet, source badge, pin star (manual only), delete.
  - Empty states per filter.
- **Pin is manual-only** in v1.

## Data flow

```
Manual note ─┐
Transcribe ──┤
Episode ─────┼─→ saveMemory() ─→ generateEmbedding() ─→ rag_documents
Instagram ───┘                                              │
                                                            ▼
Chat ── getPinned() (always) ───────────────────→ system prompt
     └─ searchSimilarDocuments() (semantic top-K) ─┘
```

## Error handling

- Missing `GOOGLE_GENERATIVE_AI_API_KEY` → memory writes return a clear 503
  (embeddings unavailable), consistent with the existing RAG code path.
- Embedding failure on a single chunk → fail that item, surface a partial-index
  message; do not leave half-written rows for that `source_id`.
- All `/api/memory` routes are auth-gated; unauthenticated → 401.
- Delete/pin enforce `user_id` ownership via RLS (`auth.uid() = user_id`).

## Testing

- `chunk.ts` — pure function: paragraph splitting, length bounds, edge cases
  (empty, single short paragraph, no paragraph breaks).
- `store.ts` — upsert vs insert on duplicate `source_id`; pin toggle; list
  filtering by source; ownership scoping.
- `/api/memory` — auth gating, validation, create/edit/delete happy paths.
- Chat — pinned facts appear in the prompt; source-aware status text.

## Phasing (chained PRs)

1. **Foundation** — migration `005` + `store.ts` + `chunk.ts` + `/api/memory` +
   `/memory` UI with manual memory. Ships the curated brain + browse.
2. **Chat integration** — pinned injection + source-aware prompt.
3. **Transcribe adapter** — "Save to Memory" button.
4. **Episode adapter** — index transcripts + chunking.

Instagram appears in the UI for free once the list renders all sources.

## Risks / open questions

- Generalizing the Chat persona (Phase 2) changes existing behavior; verify the
  Instagram-specific flows still read well under the broader prompt.
- Embedding cost scales with opt-in ingestion volume; opt-in (not auto) keeps
  this bounded and user-controlled.
