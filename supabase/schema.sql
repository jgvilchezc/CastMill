-- ============================================================
-- Castmill MVP Database Schema
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- ============================================================

-- 1. PROFILES
-- Automatically created when a user signs up via a trigger below.
create table if not exists public.profiles (
  id                       uuid references auth.users(id) on delete cascade primary key,
  created_at               timestamptz not null default now(),
  name                     text,
  avatar_url               text,
  plan                     text not null default 'free' check (plan in ('free', 'starter', 'pro')),
  credits                  int  not null default 10,
  episodes_used_this_month int  not null default 0,
  billing_period_start     date not null default current_date
);

-- Migration for existing databases: add the new columns if they don't exist yet
alter table public.profiles
  add column if not exists episodes_used_this_month    int  not null default 0,
  add column if not exists billing_period_start        date not null default current_date,
  add column if not exists lemon_squeezy_customer_id   text,
  add column if not exists lemon_squeezy_subscription_id text;

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger: auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. VOICE PROFILES
create table if not exists public.voice_profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  tone         text[] not null default '{}',
  vocabulary   text[] not null default '{}',
  pacing       text[] not null default '{}',
  common_hooks text[] not null default '{}'
);

alter table public.voice_profiles enable row level security;

create policy "Users can manage own voice profile"
  on public.voice_profiles for all
  using (auth.uid() = user_id);


-- 3. EPISODES
create table if not exists public.episodes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  title            text not null,
  description      text,
  duration         int  not null default 0,
  topics           text[] not null default '{}',
  guests           text[] not null default '{}',
  status           text not null default 'processing' check (status in ('ready', 'processing', 'failed')),
  generation_count int  not null default 0,
  thumbnail_url    text
);

alter table public.episodes enable row level security;

create policy "Users can manage own episodes"
  on public.episodes for all
  using (auth.uid() = user_id);


-- 4. TRANSCRIPTS
create table if not exists public.transcripts (
  id         uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  text       text not null default '',
  segments   jsonb not null default '[]'
);

alter table public.transcripts enable row level security;

create policy "Users can manage own transcripts"
  on public.transcripts for all
  using (auth.uid() = user_id);


-- 5. GENERATIONS
create table if not exists public.generations (
  id         uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  format     text not null check (format in ('blog', 'tweet_thread', 'linkedin', 'newsletter', 'youtube_desc', 'thumbnail')),
  content    text not null default '',
  status     text not null default 'ready' check (status in ('ready', 'generating'))
);

alter table public.generations enable row level security;

create policy "Users can manage own generations"
  on public.generations for all
  using (auth.uid() = user_id);

-- Unique constraints for upsert operations
alter table public.transcripts add constraint transcripts_episode_id_unique unique (episode_id);
alter table public.generations add constraint generations_episode_format_unique unique (episode_id, format);


-- 6. CHANNELS
create table if not exists public.channels (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  created_at         timestamptz not null default now(),
  youtube_channel_id text not null,
  title              text not null default '',
  handle             text,
  description        text,
  thumbnail_url      text,
  subscriber_count   bigint not null default 0,
  video_count        int    not null default 0,
  view_count         bigint not null default 0,
  access_type        text   not null default 'public' check (access_type in ('public', 'oauth')),
  analysis           jsonb,
  analyzed_at        timestamptz,
  inspiration        jsonb,
  unique (user_id, youtube_channel_id)
);

alter table public.channels enable row level security;

create policy "Users can manage own channels"
  on public.channels for all
  using (auth.uid() = user_id);


-- 7. CHANNEL VIDEOS
create table if not exists public.channel_videos (
  id               uuid primary key default gen_random_uuid(),
  channel_id       uuid not null references public.channels(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
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
  using (auth.uid() = user_id);


-- 8. VIRAL MOMENTS ON EPISODES
alter table public.episodes
  add column if not exists viral_moments jsonb;


-- 9. TREND DIGESTS (weekly cache keyed by niche)
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
  using (true);

create policy "Only service role can write trend digests"
  on public.trend_digests for all
  using (auth.role() = 'service_role');


-- 10. CONNECTED ACCOUNTS (TikTok / Instagram OAuth)
create table if not exists public.connected_accounts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  platform            text not null check (platform in ('tiktok', 'instagram')),
  access_token        text not null,
  refresh_token       text,
  expires_at          timestamptz,
  platform_user_id    text,
  platform_username   text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, platform)
);

alter table public.connected_accounts enable row level security;

create policy "Users can manage own connected accounts"
  on public.connected_accounts for all
  using (auth.uid() = user_id);
