# Technical Design Document — ExpandCast (Castmill)

**Type:** AI-Powered Podcast Content Platform  
**Status:** Active Development  
**Deployment:** Vercel

---

## Overview

ExpandCast transforms podcast episodes into multi-channel content (blogs, tweet threads, LinkedIn posts, newsletters) and provides social analytics + AI chat — all in a single Next.js SaaS.

---

## Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router, React 19) |
| Language | **TypeScript 5** |
| Styling | **Tailwind CSS 4** (PostCSS), CSS custom properties |
| UI Components | **shadcn/ui** (Radix UI primitives, new-york style, Lucide icons) |
| Animations | **Framer Motion 12**, **GSAP 3** + `@gsap/react` |
| Theming | **next-themes** (dark/light via `.dark` class) |
| Markdown | **markdown-it** |

### AI / LLM

| Layer | Technology |
|---|---|
| SDK | **Vercel AI SDK v6** (`ai`, `@ai-sdk/react`) — streaming, tool use, `useChat` |
| Providers | **Google Gemini** (`@ai-sdk/google`), **Anthropic Claude** (`@ai-sdk/anthropic`), **OpenAI** (`@ai-sdk/openai`) |
| Inference (audio) | **Groq SDK** — fast transcription |
| Image models | **HuggingFace Inference** (`@huggingface/inference`) |
| Audio processing | **FFmpeg (WASM)** — client-side audio encoding |

### RAG Pipeline

| Layer | Technology |
|---|---|
| Embeddings | Text embedding via AI SDK → pgvector |
| Vector store | **Supabase pgvector** |
| Ingest | `src/lib/rag/ingest.ts` — Instagram posts, comments, YouTube transcripts |
| Retrieval | `src/lib/rag/embeddings.ts` — semantic search over vectorized content |

### Backend / Database

| Layer | Technology |
|---|---|
| Database | **Supabase** (PostgreSQL + pgvector) |
| Auth | **Supabase Auth** (SSR cookies via `@supabase/ssr`) |
| Server client | `src/lib/supabase/server.ts` (server components), `admin.ts` (service role) |
| Rate limiting | Custom middleware (`src/lib/security/rate-limit.ts`) |
| Input validation | `src/lib/security/validate.ts` |

### Payments

| Layer | Technology |
|---|---|
| Provider | **Stripe** — subscription billing, customer portal |
| Webhook | `/api/webhooks/stripe` — plan tier sync to Supabase |
| Plans | Free / Starter / Pro tiers defined in `src/lib/plans.ts` |

### Social Integrations

| Platform | Capabilities |
|---|---|
| **Instagram** | OAuth (Business Login), media fetch, comments, analytics, publishing, data-deletion webhook |
| **TikTok** | OAuth, video fetch, analytics, publishing |
| **YouTube** | Channel import, video transcription, viral moment detection |
| **RSS** | Podcast feed import |

### API Routes (Next.js Route Handlers)

```
/api/ai/          transcribe · generate · generate-hooks · analyze-voice
                  generate-thumbnail · detect-moments · inspire
/api/chat/        sync (RAG-backed chat)
/api/instagram/   analyze · media · comments · refresh-stats
/api/tiktok/      analyze · videos · refresh-stats
/api/youtube/     analyze-channel · import-channel · video-transcript · viral-moments
/api/publish/     instagram · tiktok
/api/auth/        instagram/callback · tiktok/callback
/api/billing/     portal
/api/trends/      digest
/api/admin/       users · stats
/api/webhooks/    stripe · data-deletion
```

### State Management

React Context only — no Redux:

- `UserContext` — identity, plan tier, credits, voice profile
- `EpisodeContext` — episodes, transcripts, AI-generated content, memory chunks
- Wired in `src/components/providers.tsx`

---

## Key Features

1. **Audio Transcription** — FFmpeg WASM client-side encoding → Groq for fast speech-to-text
2. **Multi-Format Content Generation** — blog, tweet thread, LinkedIn, newsletter, YouTube description from a single transcript
3. **Voice Profile Analysis** — AI extracts tone/style to match content to the creator's voice
4. **AI Chat with RAG** — streaming chat (`useChat`) grounded in vectorized social content via Supabase pgvector
5. **Social Analytics Dashboard** — Instagram + TikTok engagement metrics with AI trend digest
6. **Content Publishing** — direct post to Instagram and TikTok from the platform
7. **Inspiration Engine** — Trend Radar, Gap Board, Questions Miner, Series Architect
8. **Viral Moment Detection** — YouTube video analysis for short-form clip candidates
9. **Admin Panel** — user management + platform stats

---

## Security

- Rate limiting on all AI routes
- Input sanitization on external data
- Supabase Row-Level Security (RLS) for per-user data isolation
- Service-role admin client scoped to admin-only routes
- Stripe webhook signature verification

---

## Deployment

- **Vercel** (serverless functions per route handler)
- Environment: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_*`, provider API keys
