-- Add pinned + title to match_documents so semantic search results can render
-- the pin state and display title, matching the browse (listMemories) shape.

-- Postgres can't change a function's return type via CREATE OR REPLACE when the
-- OUT/TABLE columns differ, so drop the old signature first.
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
      1 - (rd.embedding <=> query_embedding) as similarity,
      rd.pinned,
      rd.title
    from public.rag_documents rd
    where rd.user_id = filter_user_id
    order by rd.embedding <=> query_embedding
    limit match_count;
end;
$$;
