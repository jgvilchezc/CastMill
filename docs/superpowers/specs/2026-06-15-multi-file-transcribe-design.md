# Quick Transcribe — Multi-file batch transcription

**Date:** 2026-06-15
**Status:** Approved (design)

## Problem

Quick Transcribe handles one audio file at a time. A common real-world case —
transcribing a WhatsApp conversation made of many voice notes — forces the user
to upload, transcribe, and copy each note individually, then stitch the text by
hand before feeding it to an LLM. We want to transcribe N audios in one pass and
produce a single conversation-ordered text ready to paste into an LLM.

## Goals

- Accept multiple audio files in one batch (1..N).
- Transcribe sequentially with visible per-file progress; one failure does not
  abort the rest.
- Order files chronologically by default (WhatsApp filenames sort
  chronologically), with `lastModified` as tiebreaker, and allow manual drag
  reordering.
- Offer both a **combined** view (single concatenated text, ideal for an LLM)
  and a **separate** view (per-file blocks), toggled in the UI.
- For logged-in users, persist a batch as a **single combined** history entry.
- The n=1 case keeps behaving like today (no extra UI chrome).

## Non-goals

- No batch-dedicated server endpoint that ingests all files in one request
  (rejected: hides per-file progress, risks serverless timeouts).
- No new drag-and-drop dependency (use native HTML5 drag).
- No speaker diarization or per-speaker labeling.
- No change to provider logic (Groq primary, HuggingFace fallback).

## Architecture

The tool becomes a **client-orchestrated queue of 1..N audios**. The frontend
calls the existing single-file endpoint once per file, sequentially, then (for
logged-in users) saves one combined history entry. The n=1 case is naturally
subsumed by the queue.

### Why front-orchestration over a single batch endpoint

- The user wants each audio visible separately and with live progress — a single
  request that ingests everything would block with no per-file feedback.
- Many audios in one serverless invocation risks hitting the function timeout.
- Sequential per-file calls reuse the current endpoint almost unchanged and
  respect ordering and the Groq rate limit.

## Components

### 1. Frontend — `src/components/transcribe/TranscribeTool.tsx` (rewrite to queue)

- Dropzone accepts `multiple`. Cap: **25 audios per batch**; each file still
  ≤25 MB (unchanged per-file validation).
- File queue list. Each item shows: drag handle, filename, size, status icon,
  remove button. Status states: `queued | transcribing | done | error`.
- Default order: filename ascending, `lastModified` ascending as tiebreaker.
  Manual reorder via native HTML5 drag. Reorder is locked while transcribing.
- Single shared glossary input for the whole batch (unchanged behavior).
- "Transcribir N audios" button. Sequential processing; a failed file is marked
  `error` and the queue continues.
- Results area, shown after processing:
  - **Combined / Separate toggle** appears only when n≥2.
  - *Separate*: one editable textarea per audio, with per-file copy/download.
  - *Combined*: a derived, read-only (but selectable/copyable) textarea
    recomputed live from the per-file edited texts and current order. The
    per-file textareas are the editable source of truth. Block separator:
    ```
    --- Audio 1 · PTT-20240615-WA0001.opus (0m42s) ---
    <text>
    ```
  - Global actions: Copy all · Download .txt / .md · Save to Memory.
- History list: unchanged rendering; batches appear as a single entry. Loading a
  history item shows its text in the combined/result panel (read + edit + copy).

### 2. Pure logic — `src/lib/transcribe/queue.ts` (+ `queue.test.ts`)

Pure, React-free, vitest-tested helpers:

- `sortFiles(files)` → files ordered by name ascending, `lastModified`
  ascending as tiebreaker.
- `buildCombinedText(items)` → concatenated text with per-block headers.
- `buildCombinedMarkdown(items, meta)` → markdown variant with frontmatter,
  consistent with the existing `buildMarkdown` style in `format.ts`.

### 3. Backend — minimal changes, maximal reuse

- **`POST /api/tools/transcribe`** (existing): add an optional `skipHistory`
  form field. When present, transcribe and return
  `{ text, language, duration, provider, filename }` **without** generating a
  title or saving to history. The frontend sends this per file in batch mode.
  When absent, behavior is exactly as today.
- **`POST /api/tools/transcribe/history`** (new method on the route that already
  has GET/DELETE): saves a single combined entry. Reuses
  `generateTitle(combinedText)` + `saveTranscription`. Requires auth (returns
  401 for anonymous; the client only calls it when logged in). Stores
  `filename` like `Conversación (N audios)`, `duration` = sum of per-file
  durations, `language` = first non-unknown language (or null).

## Data flow

1. User drops/selects audios → queue built and sorted by `sortFiles`.
2. User may reorder (drag) and edit the shared glossary.
3. On submit, frontend iterates the queue **sequentially**: for each file, POST
   to `/api/tools/transcribe` with `skipHistory`, updating that item's status.
4. After all files settle, the combined text is derived from per-file results in
   the current order.
5. If logged in, frontend POSTs the combined text to
   `/api/tools/transcribe/history` → one history entry; the list is updated
   optimistically.

## Error handling

- Per-file failure → item marked `error` with its message; queue continues.
- File-level validation (empty, >25 MB, unsupported type) happens client-side on
  add and server-side per request (unchanged).
- Anonymous rate limit (3/day) is consumed **per file** in a batch — fair and
  unchanged; logged-in users are unlimited.
- Combined history save failure is non-fatal (logged, results still usable),
  matching the current best-effort history behavior.

## Testing

- `src/lib/transcribe/queue.test.ts` — `sortFiles` (name order, `lastModified`
  tiebreak), `buildCombinedText` and `buildCombinedMarkdown` (headers, ordering,
  single-item case).
- Extend `src/app/api/tools/transcribe/history/route.test.ts` — `POST` saves a
  combined entry, returns 401 when anonymous, generates a title.
- Existing single-file tests must keep passing (no behavior change when
  `skipHistory` is absent).

## Open decisions (settled)

- Output shape: both — separate view + combined toggle.
- Ordering: filename asc, `lastModified` tiebreak, manual drag reorder.
- History: one combined entry per batch.
- Processing: sequential.
- Max files per batch: 25.
