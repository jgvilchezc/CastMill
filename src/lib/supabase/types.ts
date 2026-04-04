export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          name: string | null;
          avatar_url: string | null;
          plan: "free" | "starter" | "pro";
          credits: number;
          episodes_used_this_month: number;
          billing_period_start: string;
          lemon_squeezy_customer_id: string | null;
          lemon_squeezy_subscription_id: string | null;
        };
        Insert: {
          id: string;
          created_at?: string;
          name?: string | null;
          avatar_url?: string | null;
          plan?: "free" | "starter" | "pro";
          credits?: number;
          episodes_used_this_month?: number;
          billing_period_start?: string;
          lemon_squeezy_customer_id?: string | null;
          lemon_squeezy_subscription_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string | null;
          avatar_url?: string | null;
          plan?: "free" | "starter" | "pro";
          credits?: number;
          episodes_used_this_month?: number;
          billing_period_start?: string;
          lemon_squeezy_customer_id?: string | null;
          lemon_squeezy_subscription_id?: string | null;
        };
        Relationships: [];
      };
      voice_profiles: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          tone: string[];
          vocabulary: string[];
          pacing: string[];
          common_hooks: string[];
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          tone: string[];
          vocabulary: string[];
          pacing: string[];
          common_hooks: string[];
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          tone?: string[];
          vocabulary?: string[];
          pacing?: string[];
          common_hooks?: string[];
        };
        Relationships: [];
      };
      episodes: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          title: string;
          description: string | null;
          duration: number;
          topics: string[];
          guests: string[];
          status: "ready" | "processing" | "failed";
          generation_count: number;
          thumbnail_url: string | null;
          viral_moments: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          title: string;
          description?: string | null;
          duration?: number;
          topics?: string[];
          guests?: string[];
          status?: "ready" | "processing" | "failed";
          generation_count?: number;
          thumbnail_url?: string | null;
          viral_moments?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          title?: string;
          description?: string | null;
          duration?: number;
          topics?: string[];
          guests?: string[];
          status?: "ready" | "processing" | "failed";
          generation_count?: number;
          thumbnail_url?: string | null;
          viral_moments?: Json | null;
        };
        Relationships: [];
      };
      transcripts: {
        Row: {
          id: string;
          episode_id: string;
          user_id: string;
          created_at: string;
          text: string;
          segments: Json;
        };
        Insert: {
          id?: string;
          episode_id: string;
          user_id: string;
          created_at?: string;
          text: string;
          segments?: Json;
        };
        Update: {
          id?: string;
          episode_id?: string;
          user_id?: string;
          created_at?: string;
          text?: string;
          segments?: Json;
        };
        Relationships: [];
      };
      generations: {
        Row: {
          id: string;
          episode_id: string;
          user_id: string;
          created_at: string;
          format:
            | "blog"
            | "tweet_thread"
            | "linkedin"
            | "newsletter"
            | "youtube_desc"
            | "thumbnail";
          content: string;
          status: "ready" | "generating";
        };
        Insert: {
          id?: string;
          episode_id: string;
          user_id: string;
          created_at?: string;
          format:
            | "blog"
            | "tweet_thread"
            | "linkedin"
            | "newsletter"
            | "youtube_desc"
            | "thumbnail";
          content: string;
          status?: "ready" | "generating";
        };
        Update: {
          id?: string;
          episode_id?: string;
          user_id?: string;
          created_at?: string;
          format?:
            | "blog"
            | "tweet_thread"
            | "linkedin"
            | "newsletter"
            | "youtube_desc"
            | "thumbnail";
          content?: string;
          status?: "ready" | "generating";
        };
        Relationships: [];
      };
      channels: {
        Row: {
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
          access_type: "public" | "oauth";
          analysis: Json | null;
          analyzed_at: string | null;
          inspiration: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          youtube_channel_id: string;
          title?: string;
          handle?: string | null;
          description?: string | null;
          thumbnail_url?: string | null;
          subscriber_count?: number;
          video_count?: number;
          view_count?: number;
          access_type?: "public" | "oauth";
          analysis?: Json | null;
          analyzed_at?: string | null;
          inspiration?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          youtube_channel_id?: string;
          title?: string;
          handle?: string | null;
          description?: string | null;
          thumbnail_url?: string | null;
          subscriber_count?: number;
          video_count?: number;
          view_count?: number;
          access_type?: "public" | "oauth";
          analysis?: Json | null;
          analyzed_at?: string | null;
          inspiration?: Json | null;
        };
        Relationships: [];
      };
      channel_videos: {
        Row: {
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
          transcript: Json | null;
          viral_moments: Json | null;
        };
        Insert: {
          id?: string;
          channel_id: string;
          user_id: string;
          created_at?: string;
          youtube_video_id: string;
          title?: string;
          description?: string | null;
          thumbnail_url?: string | null;
          view_count?: number;
          like_count?: number;
          comment_count?: number;
          duration_seconds?: number;
          published_at?: string | null;
          transcript?: Json | null;
          viral_moments?: Json | null;
        };
        Update: {
          id?: string;
          channel_id?: string;
          user_id?: string;
          created_at?: string;
          youtube_video_id?: string;
          title?: string;
          description?: string | null;
          thumbnail_url?: string | null;
          view_count?: number;
          like_count?: number;
          comment_count?: number;
          duration_seconds?: number;
          published_at?: string | null;
          transcript?: Json | null;
          viral_moments?: Json | null;
        };
        Relationships: [];
      };
      trend_digests: {
        Row: {
          id: string;
          niche: string;
          data: Json;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          niche: string;
          data: Json;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          niche?: string;
          data?: Json;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      connected_accounts: {
        Row: {
          id: string;
          user_id: string;
          platform: "tiktok" | "instagram";
          access_token: string;
          refresh_token: string | null;
          expires_at: string | null;
          platform_user_id: string | null;
          platform_username: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          platform: "tiktok" | "instagram";
          access_token: string;
          refresh_token?: string | null;
          expires_at?: string | null;
          platform_user_id?: string | null;
          platform_username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          platform?: "tiktok" | "instagram";
          access_token?: string;
          refresh_token?: string | null;
          expires_at?: string | null;
          platform_user_id?: string | null;
          platform_username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
