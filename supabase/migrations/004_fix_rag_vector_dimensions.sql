-- Fix: gemini-embedding-001 produces 3072 dimensions, not 768
-- HNSW indexes only support up to 2000 dimensions, so we skip vector index
-- Fix: search_path must include extensions schema where pgvector is installed

-- Drop the HNSW index (references old column type and can't handle 3072 dims)
drop index if exists rag_documents_embedding_idx;

-- Alter the column from vector(768) to vector(3072)
alter table public.rag_documents
  alter column embedding type vector(3072);

-- Recreate the match_documents function with correct dimensions and search_path
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
