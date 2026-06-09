-- Persistent history for Quick Transcribe (logged-in users). Text only — no
-- audio, no embeddings. Kept cheap on purpose: this is a free feature.

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
