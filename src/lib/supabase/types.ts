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
        };
        Insert: {
          id: string;
          created_at?: string;
          name?: string | null;
          avatar_url?: string | null;
          plan?: "free" | "starter" | "pro";
          credits?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string | null;
          avatar_url?: string | null;
          plan?: "free" | "starter" | "pro";
          credits?: number;
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
          format: "blog" | "tweet_thread" | "linkedin" | "newsletter" | "youtube_desc" | "thumbnail";
          content: string;
          status: "ready" | "generating";
        };
        Insert: {
          id?: string;
          episode_id: string;
          user_id: string;
          created_at?: string;
          format: "blog" | "tweet_thread" | "linkedin" | "newsletter" | "youtube_desc" | "thumbnail";
          content: string;
          status?: "ready" | "generating";
        };
        Update: {
          id?: string;
          episode_id?: string;
          user_id?: string;
          created_at?: string;
          format?: "blog" | "tweet_thread" | "linkedin" | "newsletter" | "youtube_desc" | "thumbnail";
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
