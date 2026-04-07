-- ============================================================
-- Migration: New Features (chapters, quotes, show_notes, rss_feeds, FTS)
-- Run this in the Supabase SQL Editor BEFORE using the new features:
-- https://supabase.com/dashboard/project/_/sql/new
-- ============================================================

-- -------------------------------------------------------
-- 1. EXPAND generations.format CHECK CONSTRAINT
--    Adds: chapters, quotes, show_notes
--    The column is type TEXT so no column change is needed,
--    only the CHECK constraint needs updating.
-- -------------------------------------------------------

ALTER TABLE public.generations
  DROP CONSTRAINT IF EXISTS generations_format_check;

ALTER TABLE public.generations
  ADD CONSTRAINT generations_format_check
  CHECK (format IN (
    'blog', 'tweet_thread', 'linkedin', 'newsletter',
    'youtube_desc', 'thumbnail',
    'chapters', 'quotes', 'show_notes'
  ));


-- -------------------------------------------------------
-- 2. FULL-TEXT SEARCH INDEX on transcripts.text
--    Used by /api/search for Feature 9.
--    GIN index with English dictionary — supports websearch.
-- -------------------------------------------------------

CREATE INDEX IF NOT EXISTS transcripts_text_fts
  ON public.transcripts
  USING gin(to_tsvector('english', text));


-- -------------------------------------------------------
-- 3. RSS FEEDS TABLE (Feature 10)
--    Stores imported RSS feed URLs per user.
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rss_feeds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feed_url        text NOT NULL,
  last_synced_at  timestamptz NOT NULL DEFAULT now(),
  episode_guids   text[] NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feed_url)
);

ALTER TABLE public.rss_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own rss feeds"
  ON public.rss_feeds FOR ALL
  USING (auth.uid() = user_id);


-- -------------------------------------------------------
-- DONE. After running this migration:
--   1. Regenerate types: npx supabase gen types typescript --project-id <your-project-id> > src/lib/supabase/types.ts
--   2. Restart the dev server
-- -------------------------------------------------------
