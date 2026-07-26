-- ============================================================
-- Castmill — Neon schema (ported from Supabase)
--
-- Squashes supabase/schema.sql + migrations 001-007 into one file,
-- since the Neon database starts empty.
--
-- Run against a Neon branch:
--   psql "$DATABASE_URL" -f neon/schema.sql
--
-- Differences vs the Supabase original (all deliberate):
--   * auth.users -> neon_auth."user"  (Better Auth's table; "user" is a
--     reserved word, so it must stay quoted)
--   * auth.uid() is UNCHANGED — Neon ships it and it returns uuid, so every
--     policy ports verbatim. (auth.user_id() also exists, returning text.)
--   * user ids stay `uuid` — neon_auth."user".id is uuid
--   * auth.role() = 'service_role' -> GRANT-based (see TREND DIGESTS)
--   * pgvector lives in `public`, not a separate `extensions` schema
--   * the on_auth_user_created trigger is gone (see PROFILES)
--   * explicit GRANTs for the Data API roles (authenticated / anonymous)
--
-- Verified against the live branch: neon_auth exposes user, session, account,
-- organization, member, invitation, verification, jwks, project_config.
-- ============================================================

-- ------------------------------------------------------------
-- 0. EXTENSIONS
-- ------------------------------------------------------------
create extension if not exists vector;

-- Provides auth.uid() / auth.session() for RLS. Neon installs this
-- automatically when the Data API is enabled; kept here so a plain psql
-- run against a fresh branch also works.
create extension if not exists pg_session_jwt;


-- ------------------------------------------------------------
-- 1. PROFILES
--
-- The Supabase trigger is preserved, retargeted from auth.users to
-- neon_auth."user". neondb_owner holds TRIGGER privilege there, so this works.
--
-- CAVEAT: neon_auth is a Neon-managed schema. If Neon ships a Better Auth
-- schema migration that recreates the table, this trigger goes with it and new
-- signups would silently get no profile row. The insert is ON CONFLICT DO
-- NOTHING so an idempotent app-level upsert can be layered on top as a safety
-- net without fighting the trigger.
--
-- Column names come from Better Auth: name, email, image (not avatar_url).
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id                       uuid primary key
                             references neon_auth."user"(id) on delete cascade,
  created_at               timestamptz not null default now(),
  name                     text,
  avatar_url               text,
  plan                     text not null default 'free'
                             check (plan in ('free', 'starter', 'pro')),
  credits                  int  not null default 10,
  episodes_used_this_month int  not null default 0,
  billing_period_start     date not null default current_date,
  stripe_customer_id       text,
  stripe_subscription_id   text
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (new.id, coalesce(new.name, new.email), new.image)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on neon_auth."user";
create trigger on_auth_user_created
  after insert on neon_auth."user"
  for each row execute procedure public.handle_new_user();


-- ------------------------------------------------------------
-- 2. VOICE PROFILES
-- ------------------------------------------------------------
create table if not exists public.voice_profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references neon_auth."user"(id) on delete cascade,
  created_at   timestamptz not null default now(),
  tone         text[] not null default '{}',
  vocabulary   text[] not null default '{}',
  pacing       text[] not null default '{}',
  common_hooks text[] not null default '{}'
);

alter table public.voice_profiles enable row level security;

create policy "Users can manage own voice profile"
  on public.voice_profiles for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 3. EPISODES
-- ------------------------------------------------------------
create table if not exists public.episodes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references neon_auth."user"(id) on delete cascade,
  created_at       timestamptz not null default now(),
  title            text not null,
  description      text,
  duration         int  not null default 0,
  topics           text[] not null default '{}',
  guests           text[] not null default '{}',
  status           text not null default 'processing'
                     check (status in ('ready', 'processing', 'failed')),
  generation_count int  not null default 0,
  thumbnail_url    text,
  viral_moments    jsonb
);

alter table public.episodes enable row level security;

create policy "Users can manage own episodes"
  on public.episodes for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 4. TRANSCRIPTS
-- ------------------------------------------------------------
create table if not exists public.transcripts (
  id         uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  user_id    uuid not null references neon_auth."user"(id) on delete cascade,
  created_at timestamptz not null default now(),
  text       text not null default '',
  segments   jsonb not null default '[]',
  constraint transcripts_episode_id_unique unique (episode_id)
);

alter table public.transcripts enable row level security;

create policy "Users can manage own transcripts"
  on public.transcripts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Full-text search index used by /api/search
create index if not exists transcripts_text_fts
  on public.transcripts
  using gin(to_tsvector('english', text));


-- ------------------------------------------------------------
-- 5. GENERATIONS
-- ------------------------------------------------------------
create table if not exists public.generations (
  id         uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  user_id    uuid not null references neon_auth."user"(id) on delete cascade,
  created_at timestamptz not null default now(),
  format     text not null check (format in (
               'blog', 'tweet_thread', 'linkedin', 'newsletter',
               'youtube_desc', 'thumbnail',
               'chapters', 'quotes', 'show_notes'
             )),
  content    text not null default '',
  status     text not null default 'ready'
               check (status in ('ready', 'generating')),
  constraint generations_episode_format_unique unique (episode_id, format)
);

alter table public.generations enable row level security;

create policy "Users can manage own generations"
  on public.generations for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 6. CHANNELS
-- ------------------------------------------------------------
create table if not exists public.channels (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references neon_auth."user"(id) on delete cascade,
  created_at         timestamptz not null default now(),
  youtube_channel_id text not null,
  title              text not null default '',
  handle             text,
  description        text,
  thumbnail_url      text,
  subscriber_count   bigint not null default 0,
  video_count        int    not null default 0,
  view_count         bigint not null default 0,
  access_type        text   not null default 'public'
                       check (access_type in ('public', 'oauth')),
  analysis           jsonb,
  analyzed_at        timestamptz,
  inspiration        jsonb,
  unique (user_id, youtube_channel_id)
);

alter table public.channels enable row level security;

create policy "Users can manage own channels"
  on public.channels for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 7. CHANNEL VIDEOS
-- ------------------------------------------------------------
create table if not exists public.channel_videos (
  id               uuid primary key default gen_random_uuid(),
  channel_id       uuid not null references public.channels(id) on delete cascade,
  user_id          uuid not null references neon_auth."user"(id) on delete cascade,
  created_at       timestamptz not null default now(),
  youtube_video_id text not null,
  title            text not null default '',
  description      text,
  thumbnail_url    text,
  view_count       bigint not null default 0,
  like_count       bigint not null default 0,
  comment_count    bigint not null default 0,
  duration_seconds int    not null default 0,
  published_at     timestamptz,
  transcript       jsonb,
  viral_moments    jsonb,
  unique (channel_id, youtube_video_id)
);

alter table public.channel_videos enable row level security;

create policy "Users can manage own channel videos"
  on public.channel_videos for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 8. TREND DIGESTS (weekly cache keyed by niche)
--
-- Supabase used `auth.role() = 'service_role'` to gate writes. Neon has no
-- service_role. Writes are gated by GRANTs instead: only SELECT is exposed to
-- the Data API roles, and the cron/server connects as the project owner, which
-- bypasses RLS. Deny-by-default handles the rest — there is no write policy,
-- so authenticated/anonymous cannot insert or update regardless.
-- ------------------------------------------------------------
create table if not exists public.trend_digests (
  id         uuid primary key default gen_random_uuid(),
  niche      text not null,
  data       jsonb not null default '{}',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (niche)
);

alter table public.trend_digests enable row level security;

create policy "Trend digests are public readable"
  on public.trend_digests for select
  to authenticated, anonymous
  using (true);


-- ------------------------------------------------------------
-- 9. CONNECTED ACCOUNTS (TikTok / Instagram OAuth)
-- ------------------------------------------------------------
create table if not exists public.connected_accounts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references neon_auth."user"(id) on delete cascade,
  platform          text not null check (platform in ('tiktok', 'instagram')),
  access_token      text not null,
  refresh_token     text,
  expires_at        timestamptz,
  platform_user_id  text,
  platform_username text,
  platform_meta     jsonb default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, platform)
);

alter table public.connected_accounts enable row level security;

create policy "Users can manage own connected accounts"
  on public.connected_accounts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 10. RSS FEEDS
-- ------------------------------------------------------------
create table if not exists public.rss_feeds (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references neon_auth."user"(id) on delete cascade,
  feed_url       text not null,
  last_synced_at timestamptz not null default now(),
  episode_guids  text[] not null default '{}',
  created_at     timestamptz not null default now(),
  unique (user_id, feed_url)
);

alter table public.rss_feeds enable row level security;

create policy "Users can manage own rss feeds"
  on public.rss_feeds for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 11. TRANSCRIPTIONS (Quick Transcribe history — text only)
-- ------------------------------------------------------------
create table if not exists public.transcriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references neon_auth."user"(id) on delete cascade,
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
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 12. RAG DOCUMENTS (pgvector)
--
-- 3072 dims (gemini-embedding-001). No vector index: HNSW caps at 2000 dims
-- and IVFFlat needs existing rows to build lists. Exact scan via <=> is fast
-- enough at this size. Add IVFFlat once the table is large:
--   create index rag_documents_embedding_idx
--     on public.rag_documents using ivfflat (embedding vector_cosine_ops)
--     with (lists = 100);
-- ------------------------------------------------------------
create table if not exists public.rag_documents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references neon_auth."user"(id) on delete cascade,
  source     text not null check (source in (
               'instagram_caption',
               'instagram_comment',
               'instagram_profile',
               'instagram_insights',
               'manual',
               'transcript',
               'episode'
             )),
  source_id  text not null,
  content    text not null,
  metadata   jsonb not null default '{}'::jsonb,
  embedding  vector(3072) not null,
  pinned     boolean not null default false,
  title      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, source_id)
);

create index if not exists rag_documents_user_id_idx
  on public.rag_documents (user_id);

-- Backs the "always inject pinned" Chat query
create index if not exists rag_documents_user_pinned_idx
  on public.rag_documents (user_id) where pinned;

alter table public.rag_documents enable row level security;

create policy "Users can manage own rag documents"
  on public.rag_documents for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 13. match_documents() — semantic search
--
-- search_path drops `extensions` (Supabase-only schema). Still SECURITY
-- DEFINER, so it bypasses RLS: filter_user_id is what scopes the result and
-- callers must pass a trusted, server-derived id.
-- ------------------------------------------------------------
drop function if exists public.match_documents(vector, uuid, int);
drop function if exists public.match_documents(vector, uuid, int);

create function public.match_documents(
  query_embedding vector(3072),
  filter_user_id  uuid,
  match_count     int default 10
)
returns table (
  id         uuid,
  source     text,
  source_id  text,
  content    text,
  metadata   jsonb,
  similarity float,
  pinned     boolean,
  title      text
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select
      rd.id,
      rd.source,
      rd.source_id,
      rd.content,
      rd.metadata,
      1 - (rd.embedding <=> query_embedding) as similarity,
      rd.pinned,
      rd.title
    from public.rag_documents rd
    where rd.user_id = filter_user_id
    order by rd.embedding <=> query_embedding
    limit match_count;
end;
$$;


-- ------------------------------------------------------------
-- 14. DATA API GRANTS
--
-- Neon's Data API (PostgREST) connects as `authenticated` or `anonymous`.
-- Supabase's equivalent role was `anon`. RLS still decides row visibility —
-- these grants only open the door at the table level.
-- ------------------------------------------------------------
grant usage on schema public to authenticated, anonymous;

grant select, insert, update, delete
  on all tables in schema public
  to authenticated;

grant select
  on all tables in schema public
  to anonymous;

grant execute on function public.match_documents(vector, uuid, int)
  to authenticated;

-- Keep future tables consistent with the above.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant select on tables to anonymous;
