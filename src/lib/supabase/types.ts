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
      };
    };
  };
};
