# Quick Transcribe — Design Doc

**Date:** 2026-05-28
**Status:** Approved, ready to implement
**Owner:** Jose

---

## Goal

Standalone audio-to-text tool for short audios (WhatsApp `.opus` is the primary case). The user pastes an optional glossary so Whisper biases recognition toward proper nouns and jargon. Output is plain text formatted for an LLM to consume, with copy and download actions.

Two audiences:
- **Logged-in users** (the owner, eventually Castmill customers): unlimited use.
- **Anonymous visitors**: 3 transcriptions per IP per 24h. Acts as a free tool / lead magnet.

This is **not** the same as uploading an episode. It does not persist audio, does not create an episode row, does not appear in the user's library.

## Non-goals

- Speaker diarization (Whisper does not do it natively; WhatsApp audios are usually single-speaker anyway).
- Long-form transcription (>25 MB Groq limit, ~30–60 min). For long audio the existing episode flow is the right path.
- Real-time / streaming transcription.
- Storing transcripts server-side. Result lives only in the browser until copied or downloaded.
- Translation. Whisper returns the source language.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ /transcribe (page, client component)                    │
│  - DropZone (.opus, .mp3, .wav, .m4a, .ogg, .webm)      │
│  - Textarea: glossary (optional, ≤500 chars)            │
│  - Result: editable textarea + Copy / Download .txt /   │
│    Download .md                                          │
│  - Banner: "3/day free · sign in for unlimited" if      │
│    anonymous                                             │
└─────────────────────────────────────────────────────────┘
                          │
                          │ POST multipart
                          ▼
┌─────────────────────────────────────────────────────────┐
│ /api/tools/transcribe (route handler)                   │
│  1. Read FormData { audio, glossary? }                  │
│  2. Validate: mime, size (≤25 MB), glossary length      │
│  3. Auth check (createClient → user?)                   │
│     - logged in  → skip rate limit                      │
│     - anonymous  → checkRateLimit(`tools:transcribe:${ip}`, │
│                     { max: 3, window: 24h })            │
│  4. Call Groq Whisper:                                  │
│       model: whisper-large-v3-turbo                     │
│       file: passthrough                                 │
│       prompt: glossary || undefined                     │
│       response_format: verbose_json                     │
│  5. Return { text, language, duration }                 │
│  6. No storage, no DB writes                            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
                    Groq Whisper API
```

## Data flow

1. User drops a file. Browser keeps it as `File` in component state.
2. User optionally types glossary terms.
3. On submit, the page builds a `FormData` and POSTs to `/api/tools/transcribe`.
4. The route streams the file directly to Groq — no temp upload to Supabase, no buffer-to-bucket dance.
5. Groq returns `verbose_json`. We extract `text`, `language`, and compute `duration` from the last segment's `end` (or pass it through if Groq returns it).
6. Response lands in the page, fills the result textarea, enables Copy + Download.

## File limits and formats

- **Max size:** 25 MB (Groq hard limit). We validate client-side first to fail fast, then server-side as a safety net.
- **Accepted MIME / extensions:** `audio/ogg`, `audio/opus`, `audio/mpeg` (mp3), `audio/mp4` (m4a), `audio/wav`, `audio/webm`. Extension allowlist mirrors that.
- **WhatsApp `.opus`:** Groq accepts it natively. No FFmpeg conversion needed in v1.

## Glossary handling

- UI: a textarea labeled "Glosario (opcional)" with placeholder `Castmill, ExpandCast, pgvector, José Vilchez…`.
- Client-side: trim, collapse whitespace, cap at 500 chars (Groq's prompt is ~224 tokens; 500 chars is a safe character budget that maps to ~125 tokens for Spanish/English).
- Server-side: same cap, then passed straight as `prompt` to Groq.
- Empty string → omit the prompt parameter entirely (don't send `""`).

## Rate limiting

Reuse `src/lib/security/rate-limit.ts`. Add a new config locally in the route handler (do **not** add it to the global `RATE_LIMITS` map — it's a one-off, IP-keyed, daily window, distinct from the per-minute `ai` bucket):

```ts
const ANONYMOUS_LIMIT = { maxRequests: 3, windowMs: 24 * 60 * 60 * 1000 };
const key = `tools:transcribe:ip:${ip}`;
```

IP extraction: `req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"` (Vercel sets `x-forwarded-for` reliably).

**Known limitation:** the rate-limit store is in-memory per serverless instance, so an attacker rotating IPs or hitting cold-start replicas can exceed the cap. Acceptable for v1 of a free tool. If abuse appears, upgrade to Upstash Redis (separate change).

## Output for LLM

### `.txt` (default Copy and Download)

Plain text. Whisper's native punctuation. We join segments with `\n\n` when there is a gap > 1.5s between segments — that yields paragraph breaks at natural pauses.

### `.md` (Download alternative)

```md
---
source: whatsapp-audio
filename: WhatsApp Audio 2026-05-27 at 13.14.21.opus
duration: 47s
language: es
date: 2026-05-28
glossary: [Castmill, ExpandCast]
---

[transcripción acá, mismo formato que .txt]
```

The frontmatter is intentionally minimal. It gives an LLM (or a human pasting into ChatGPT/Claude) just enough context without ceremony.

## Error handling

| Case | UI | Status |
|---|---|---|
| File > 25 MB | Toast: "Máximo 25 MB. Probá con un audio más corto o convertilo a MP3." | 413 |
| Unsupported MIME | Toast: "Formato no soportado. Usá opus/mp3/wav/m4a/ogg/webm." | 400 |
| Glossary > 500 chars | Inline error under textarea | 400 (server) / blocked client-side |
| Anonymous rate limit hit | Toast: "Llegaste al límite gratis (3/día). Iniciá sesión para ilimitado." + link a `/login` | 429 |
| `GROQ_API_KEY` missing | Toast genérico: "Servicio no disponible, intentá más tarde." (log server-side) | 503 |
| Groq 5xx / network | Toast: "Hubo un problema procesando el audio. Reintentá." | 502 |
| Groq auth/quota | Same as above (don't leak provider details) | 502 |

## Files to create / modify

**New:**
- `src/app/api/tools/transcribe/route.ts` — the API route.
- `src/app/(app)/transcribe/page.tsx` — the page (will live in the `(app)` route group so it picks up the app layout/header). If it should be public without app chrome we move it to `src/app/transcribe/page.tsx` — decide at implementation time.
- `src/components/transcribe/TranscribeTool.tsx` — main client component (state, drop, glossary, submit, result).
- `src/lib/transcribe/format.ts` — small helpers: `formatParagraphs(segments)`, `buildMarkdown({ text, meta })`, `inferDuration(segments)`.

**Modified:**
- None expected in v1. The existing `/api/ai/transcribe` route is left untouched.

**Possibly extracted later (not v1):**
- `src/lib/ai/whisper.ts` — shared Groq Whisper helper, if a third caller appears.

## Testing

The project has no test runner installed (no vitest / jest / playwright). v1 verification is manual:

1. Drop the user's real WhatsApp file (`/Users/jgvilchezc/Downloads/WhatsApp Audio 2026-05-27 at 13.14.21.opus`).
2. Submit with empty glossary → expect Spanish transcription with punctuation.
3. Submit again with glossary `Castmill, ExpandCast, José Vilchez` → confirm those terms are spelled correctly in output (if they appear in the audio).
4. Copy → paste into a text editor, confirm clean text.
5. Download `.txt` and `.md` → confirm both render.
6. Log out, hit the route 4 times → confirm the 4th returns 429 with the right message.
7. Try a 30 MB file → confirm 413.
8. Try a `.txt` file (wrong type) → confirm 400.

If we add tests later, the obvious surface is `src/lib/transcribe/format.ts` (pure functions, easy to unit test with vitest).

## Open questions deferred to implementation

- Page location: `(app)/transcribe` (with app shell) vs top-level `transcribe` (bare, more lead-magnet-ish). Default: `(app)/transcribe` since the owner wants it for personal use too — easier to reach from the logged-in surface.
- Whether to log anonymous usage for analytics. Default: no, keep it stateless in v1.
