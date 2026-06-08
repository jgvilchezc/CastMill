-- Extend rag_documents to back the unified Memory feature.

-- 1. Allow new source types alongside the existing instagram_* values.
alter table public.rag_documents
  drop constraint if exists rag_documents_source_check;

alter table public.rag_documents
  add constraint rag_documents_source_check check (source in (
    'instagram_caption',
    'instagram_comment',
    'instagram_profile',
    'instagram_insights',
    'manual',
    'transcript',
    'episode'
  ));

-- 2. New columns for manual notes and UI display.
alter table public.rag_documents
  add column if not exists pinned boolean not null default false;

alter table public.rag_documents
  add column if not exists title text;

-- 3. Helps the "always inject pinned" Chat query.
create index if not exists rag_documents_user_pinned_idx
  on public.rag_documents (user_id) where pinned;
