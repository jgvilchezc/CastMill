-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- RAG documents table for storing embedded social media data
create table if not exists public.rag_documents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  source     text not null check (source in (
    'instagram_caption',
    'instagram_comment',
    'instagram_profile',
    'instagram_insights'
  )),
  source_id  text not null,
  content    text not null,
  metadata   jsonb not null default '{}'::jsonb,
  embedding  vector(3072) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, source_id)
);

-- Note: no vector index created here — HNSW only supports up to 2000 dims
-- and IVFFlat requires existing rows to build lists. For small datasets the
-- exact scan via ORDER BY <=> is fast enough. Add an IVFFlat index later once
-- the table has enough rows:
--   CREATE INDEX rag_documents_embedding_idx
--     ON public.rag_documents USING ivfflat (embedding vector_cosine_ops)
--     WITH (lists = 100);

create index if not exists rag_documents_user_id_idx
  on public.rag_documents (user_id);

alter table public.rag_documents enable row level security;

create policy "Users can manage own rag documents"
  on public.rag_documents for all
  using (auth.uid() = user_id);

-- Similarity search function: returns top-K documents for a user
create or replace function public.match_documents(
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
  similarity float
)
language plpgsql
security definer set search_path = public, extensions
as $$
begin
  return query
    select
      rd.id,
      rd.source,
      rd.source_id,
      rd.content,
      rd.metadata,
      1 - (rd.embedding <=> query_embedding) as similarity
    from public.rag_documents rd
    where rd.user_id = filter_user_id
    order by rd.embedding <=> query_embedding
    limit match_count;
end;
$$;
