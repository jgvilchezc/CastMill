-- ============================================================
-- Castmill MVP Database Schema
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- ============================================================

-- 1. PROFILES
-- Automatically created when a user signs up via a trigger below.
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  created_at  timestamptz not null default now(),
  name        text,
  avatar_url  text,
  plan        text not null default 'free' check (plan in ('free', 'starter', 'pro')),
  credits     int  not null default 10
);

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
