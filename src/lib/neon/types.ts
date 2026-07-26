// AUTO-GENERATED from the live Neon schema. Do not edit by hand.
// Regenerate with: node gen_types.mjs
//
// timestamptz/date are typed as string because normalizeRows() converts the
// driver's Date objects to ISO strings. bigint is typed as number because those
// columns are cast (::float8) in the queries that select them.

export interface ChannelVideosRow {
  id: string;
  channel_id: string;
  user_id: string;
  created_at: string;
  youtube_video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  duration_seconds: number;
  published_at: string | null;
  transcript: Record<string, unknown> | null;
  viral_moments: Record<string, unknown> | null;
}

export interface ChannelsRow {
  id: string;
  user_id: string;
  created_at: string;
  youtube_channel_id: string;
  title: string;
  handle: string | null;
  description: string | null;
  thumbnail_url: string | null;
  subscriber_count: number;
  video_count: number;
  view_count: number;
  access_type: string;
  analysis: Record<string, unknown> | null;
  analyzed_at: string | null;
  inspiration: Record<string, unknown> | null;
}

export interface ConnectedAccountsRow {
  id: string;
  user_id: string;
  platform: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  platform_user_id: string | null;
  platform_username: string | null;
  platform_meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface EpisodesRow {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
  description: string | null;
  duration: number;
  topics: string[];
  guests: string[];
  status: string;
  generation_count: number;
  thumbnail_url: string | null;
  viral_moments: Record<string, unknown> | null;
}

export interface GenerationsRow {
  id: string;
  episode_id: string;
  user_id: string;
  created_at: string;
  format: string;
  content: string;
  status: string;
}

export interface ProfilesRow {
  id: string;
  created_at: string;
  name: string | null;
  avatar_url: string | null;
  plan: string;
  credits: number;
  episodes_used_this_month: number;
  billing_period_start: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export interface RagDocumentsRow {
  id: string;
  user_id: string;
  source: string;
  source_id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding: string;
  pinned: boolean;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface RssFeedsRow {
  id: string;
  user_id: string;
  feed_url: string;
  last_synced_at: string;
  episode_guids: string[];
  created_at: string;
}

export interface TranscriptionsRow {
  id: string;
  user_id: string;
  title: string;
  text: string;
  language: string | null;
  duration: number | null;
  filename: string | null;
  provider: string | null;
  created_at: string;
}

export interface TranscriptsRow {
  id: string;
  episode_id: string;
  user_id: string;
  created_at: string;
  text: string;
  segments: Record<string, unknown>;
}

export interface TrendDigestsRow {
  id: string;
  niche: string;
  data: Record<string, unknown>;
  expires_at: string;
  created_at: string;
}

export interface VoiceProfilesRow {
  id: string;
  user_id: string;
  created_at: string;
  tone: string[];
  vocabulary: string[];
  pacing: string[];
  common_hooks: string[];
}

