# Supabase -> Neon migration progress

Live target: project `green-bird-98404231` (Expandcast), branch `production`, us-east-2.

## Architecture decided
- Browser: `src/lib/neon/client.ts` — Data API (PostgREST) + RLS, Supabase-compatible surface.
- Server: **direct SQL** via `src/lib/neon/db.ts` `getSql()` (owner role, bypasses RLS -> every
  query MUST scope by user_id explicitly).
- Auth: `src/lib/neon/auth.ts` — `getSessionUser()`, `requireSessionUser()`, `requireAdmin()`.
- Row normalisation: `src/lib/neon/rows.ts` — pg returns Date for timestamptz and string for
  bigint; Supabase REST returned ISO strings and numbers. Cast bigints in SQL (`::float8`).

## Done
- [x] neon/schema.sql applied + RLS verified end-to-end
- [x] src/lib/neon/{auth,client,db,rows}.ts
- [x] src/app/api/auth/[...path]/route.ts (Better Auth catch-all)
- [x] src/proxy.ts (auth.middleware only on app routes; no publicRoutes option exists)
- [x] src/app/actions/{auth,oauth}.ts — real UI signup verified
- [x] src/lib/memory/store.ts (SQL verified against live DB)
- [x] src/lib/rag/embeddings.ts (match_documents verified)
- [x] src/lib/transcribe/history.ts + tests rewritten, 4/4 passing
- [x] src/lib/stripe.ts, src/lib/chat/tools.ts, src/lib/plans.ts
- [x] 8 auth-only API routes
- [x] Production build passes
- [x] src/lib/neon/types.ts — AUTO-GENERATED from the live schema (12 tables)
- [x] src/lib/neon/queries.ts — shared getConnectedAccount/getProfile/upsert helpers (SQL verified)
- [x] src/lib/context/{user,episode}-context.tsx -> neon-js Data API client
- [x] src/lib/rag/ingest.ts (upsert SQL verified against live DB)
- [x] 5 more API routes (billing/portal, chat/sync, instagram/media, instagram/comments, tiktok/videos)
- [x] All tests ported: 61/61 passing, 8/8 files
- [x] api/webhooks/stripe (all 4 SQL paths verified against the live DB)
- [x] api/admin/{stats,users,users/[id]} — 5 reads collapsed to 2; emails now via
      LEFT JOIN neon_auth."user" instead of a listUsers() call capped at 200
- [x] STORAGE -> Neon Object Storage (S3). Bucket "episode-audio" (private) created on
      branch production. src/lib/neon/storage.ts + api/upload/sign (POST presign, DELETE
      cleanup). upload/page.tsx now PUTs to a presigned URL; api/ai/transcribe downloads
      and deletes server-side. Full chain verified: presign -> PUT 200 -> download
      (bytes match) -> list -> delete.
- [x] OAuth/connected_accounts routes: auth/instagram, auth/instagram/callback, auth/tiktok,
      instagram/refresh-stats, tiktok/refresh-stats, publish/instagram, publish/tiktok
- [x] AI routes: detect-moments, generate-hooks, inspire (jsonb writes verified on the live DB)
- [x] generate-thumbnail, chat, chat/sync, memory, memory/episode, search (FTS via
      websearch_to_tsquery on the transcripts_text_fts index — match/no-match/ilike-fallback
      all verified), trends/digest, webhooks/data-deletion, youtube/{viral-moments,video-transcript}
- [x] memory route tests re-mocked onto getSessionUser + getSql; 61/61 still green

## Status: CODE-COMPLETE

Zero Supabase references remain in `src/`. `src/lib/supabase/` deleted;
`@supabase/supabase-js` and `@supabase/ssr` uninstalled.

Verified on the final pass:
- typecheck: 0 errors
- eslint: clean
- `npm run build`: compiles
- tests: 61/61 across 8 files
- live dev server: signup 200, GET /api/memory 200 (SQL), GET /api/search 200 (FTS),
  unauthenticated GET /api/memory 401

## One step left for the user
`npx neon env pull` — writes AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY /
AWS_ENDPOINT_URL_S3 / AWS_REGION into .env.local. Until then POST /api/upload/sign
returns 500 with "Neon Object Storage is not configured" (the guard in
src/lib/neon/storage.ts, not a bug).


## Gotchas found the hard way
- `neon_auth."user"` (quoted, reserved word), id is **uuid**. There is NO `users_sync` table —
  that is the legacy Stack Auth version that Neon's own migration guide still documents.
- `auth.uid()` exists and returns uuid, so Supabase RLS policies port verbatim.
- Two different JWTs: the session cookie is HS256 (rejected by the Data API); the Data API token
  comes from `GET /api/auth/token` (EdDSA + kid + role claim).
- proxy.ts rate-limits /api/auth to 5 req — curl testing self-throttles (429, ~14 min).
- Neon Auth OAuth supports google/github/vercel only. No Twitter.

## Extra gotchas (iteration 2)
- The Neon Supabase adapter has NO `user_metadata`. Better Auth exposes `name`/`image`
  directly. `user.user_metadata?.full_name` -> `user.name`, `avatar_url` -> `user.image`.
- `onAuthStateChange`, `.single()` and `.maybeSingle()` DO exist on the Neon client.
- Tests that mocked the Supabase query builder are rewritten to mock `getSql` and assert on
  `strings.join('?')` + the bound values array.

## Behaviour changes (deliberate, not literal ports)
- api/admin/users: search used to be applied AFTER pagination, so a match on page 3 was
  invisible and `total` ignored the search. Filtering moved into the WHERE clause.
- api/admin/users/[id]: `last_sign_in_at` does not exist in Better Auth. Derived from
  max(neon_auth.session."createdAt") for that user.
- api/admin/users/[id] PATCH: column names cannot be parameterised, so each allowed column
  uses coalesce(${value}, current) instead of dynamic SQL. All four columns are NOT NULL.
- api/webhooks/stripe: kept the exists-then-update/insert branches rather than collapsing to
  an upsert — the insert branch makes an extra Stripe call for the customer name, and an
  upsert would have run it on every checkout.

## Storage notes
- Bucket created with `neon buckets create episode-audio` (the CLI command), NOT via a
  neon.ts + `config apply`: declaring only buckets in an IaC file risks reconciling away the
  already-enabled Data API and Auth on this branch.
- files-sdk was rejected: its peerOptional on @sveltejs/kit pulls vite@8 and the project is
  on vite@7 (via vitest). Used @aws-sdk/client-s3 directly, which the skill documents as the
  supported alternative. `forcePathStyle: true` is REQUIRED — Neon uses path-style addressing.
- downloadObject returns ArrayBuffer, not the SDK's Uint8Array: `Uint8Array<ArrayBufferLike>`
  is not assignable to `BlobPart` when constructing a File for the Groq upload.
- The browser has no S3 credentials, so cleanup-on-failure moved from a client-side
  storage.remove() to DELETE /api/upload/sign?path=..., scoped to the caller's own prefix.
- AWS_* credentials: run `npx neon env pull` — do not hand-copy.
