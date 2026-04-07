export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      channel_videos: {
        Row: {
          channel_id: string
          comment_count: number
          created_at: string
          description: string | null
          duration_seconds: number
          id: string
          like_count: number
          published_at: string | null
          thumbnail_url: string | null
          title: string
          transcript: Json | null
          user_id: string
          view_count: number
          viral_moments: Json | null
          youtube_video_id: string
        }
        Insert: {
          channel_id: string
          comment_count?: number
          created_at?: string
          description?: string | null
          duration_seconds?: number
          id?: string
          like_count?: number
          published_at?: string | null
          thumbnail_url?: string | null
          title?: string
          transcript?: Json | null
          user_id: string
          view_count?: number
          viral_moments?: Json | null
          youtube_video_id: string
        }
        Update: {
          channel_id?: string
          comment_count?: number
          created_at?: string
          description?: string | null
          duration_seconds?: number
          id?: string
          like_count?: number
          published_at?: string | null
          thumbnail_url?: string | null
          title?: string
          transcript?: Json | null
          user_id?: string
          view_count?: number
          viral_moments?: Json | null
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_videos_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          access_type: string
          analysis: Json | null
          analyzed_at: string | null
          created_at: string
          description: string | null
          handle: string | null
          id: string
          inspiration: Json | null
          subscriber_count: number
          thumbnail_url: string | null
          title: string
          user_id: string
          video_count: number
          view_count: number
          youtube_channel_id: string
        }
        Insert: {
          access_type?: string
          analysis?: Json | null
          analyzed_at?: string | null
          created_at?: string
          description?: string | null
          handle?: string | null
          id?: string
          inspiration?: Json | null
          subscriber_count?: number
          thumbnail_url?: string | null
          title?: string
          user_id: string
          video_count?: number
          view_count?: number
          youtube_channel_id: string
        }
        Update: {
          access_type?: string
          analysis?: Json | null
          analyzed_at?: string | null
          created_at?: string
          description?: string | null
          handle?: string | null
          id?: string
          inspiration?: Json | null
          subscriber_count?: number
          thumbnail_url?: string | null
          title?: string
          user_id?: string
          video_count?: number
          view_count?: number
          youtube_channel_id?: string
        }
        Relationships: []
      }
      episodes: {
        Row: {
          created_at: string
          description: string | null
          duration: number
          generation_count: number
          guests: string[]
          id: string
          status: string
          thumbnail_url: string | null
          title: string
          topics: string[]
          user_id: string
          viral_moments: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: number
          generation_count?: number
          guests?: string[]
          id?: string
          status?: string
          thumbnail_url?: string | null
          title: string
          topics?: string[]
          user_id: string
          viral_moments?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number
          generation_count?: number
          guests?: string[]
          id?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          topics?: string[]
          user_id?: string
          viral_moments?: Json | null
        }
        Relationships: []
      }
      generations: {
        Row: {
          content: string
          created_at: string
          episode_id: string
          format: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          episode_id: string
          format: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          episode_id?: string
          format?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generations_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          billing_period_start: string
          created_at: string
          credits: number
          episodes_used_this_month: number
          id: string
          name: string | null
          plan: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          billing_period_start?: string
          created_at?: string
          credits?: number
          episodes_used_this_month?: number
          id: string
          name?: string | null
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          billing_period_start?: string
          created_at?: string
          credits?: number
          episodes_used_this_month?: number
          id?: string
          name?: string | null
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          created_at: string
          episode_id: string
          id: string
          segments: Json
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          episode_id: string
          id?: string
          segments?: Json
          text?: string
          user_id: string
        }
        Update: {
          created_at?: string
          episode_id?: string
          id?: string
          segments?: Json
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: true
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_profiles: {
        Row: {
          common_hooks: string[]
          created_at: string
          id: string
          pacing: string[]
          tone: string[]
          user_id: string
          vocabulary: string[]
        }
        Insert: {
          common_hooks?: string[]
          created_at?: string
          id?: string
          pacing?: string[]
          tone?: string[]
          user_id: string
          vocabulary?: string[]
        }
        Update: {
          common_hooks?: string[]
          created_at?: string
          id?: string
          pacing?: string[]
          tone?: string[]
          user_id?: string
          vocabulary?: string[]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
