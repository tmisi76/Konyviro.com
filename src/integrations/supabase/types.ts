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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_generations: {
        Row: {
          action_type: string
          chapter_id: string | null
          completion_tokens: number
          created_at: string
          id: string
          model: string
          project_id: string | null
          prompt_tokens: number
          total_tokens: number
          user_id: string
        }
        Insert: {
          action_type: string
          chapter_id?: string | null
          completion_tokens?: number
          created_at?: string
          id?: string
          model: string
          project_id?: string | null
          prompt_tokens?: number
          total_tokens?: number
          user_id: string
        }
        Update: {
          action_type?: string
          chapter_id?: string | null
          completion_tokens?: number
          created_at?: string
          id?: string
          model?: string
          project_id?: string | null
          prompt_tokens?: number
          total_tokens?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generations_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          chapter_id: string
          content: string
          created_at: string
          id: string
          metadata: Json | null
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          chapter_id: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Update: {
          chapter_id?: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          created_at: string
          id: string
          key_points: string[] | null
          project_id: string
          sort_order: number
          status: string
          summary: string | null
          title: string
          updated_at: string
          word_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          key_points?: string[] | null
          project_id: string
          sort_order?: number
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          word_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          key_points?: string[] | null
          project_id?: string
          sort_order?: number
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "chapters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      character_relationships: {
        Row: {
          character_id: string
          created_at: string
          description: string | null
          id: string
          related_character_id: string
          relationship_type: string
        }
        Insert: {
          character_id: string
          created_at?: string
          description?: string | null
          id?: string
          related_character_id: string
          relationship_type: string
        }
        Update: {
          character_id?: string
          created_at?: string
          description?: string | null
          id?: string
          related_character_id?: string
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_relationships_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_relationships_related_character_id_fkey"
            columns: ["related_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          age: number | null
          appearance_description: string | null
          avatar_url: string | null
          backstory: string | null
          body_type: string | null
          created_at: string
          distinguishing_features: string | null
          eye_color: string | null
          fears: string[] | null
          gender: string | null
          hair_color: string | null
          height: string | null
          id: string
          key_events: Json | null
          motivations: string[] | null
          name: string
          negative_traits: string[] | null
          nickname: string | null
          occupation: string | null
          positive_traits: string[] | null
          project_id: string
          role: string
          speech_style: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          appearance_description?: string | null
          avatar_url?: string | null
          backstory?: string | null
          body_type?: string | null
          created_at?: string
          distinguishing_features?: string | null
          eye_color?: string | null
          fears?: string[] | null
          gender?: string | null
          hair_color?: string | null
          height?: string | null
          id?: string
          key_events?: Json | null
          motivations?: string[] | null
          name: string
          negative_traits?: string[] | null
          nickname?: string | null
          occupation?: string | null
          positive_traits?: string[] | null
          project_id: string
          role?: string
          speech_style?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          appearance_description?: string | null
          avatar_url?: string | null
          backstory?: string | null
          body_type?: string | null
          created_at?: string
          distinguishing_features?: string | null
          eye_color?: string | null
          fears?: string[] | null
          gender?: string | null
          hair_color?: string | null
          height?: string | null
          id?: string
          key_events?: Json | null
          motivations?: string[] | null
          name?: string
          negative_traits?: string[] | null
          nickname?: string | null
          occupation?: string | null
          positive_traits?: string[] | null
          project_id?: string
          role?: string
          speech_style?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      citations: {
        Row: {
          block_id: string | null
          chapter_id: string
          citation_number: number
          created_at: string
          id: string
          page_reference: string | null
          source_id: string
        }
        Insert: {
          block_id?: string | null
          chapter_id: string
          citation_number: number
          created_at?: string
          id?: string
          page_reference?: string | null
          source_id: string
        }
        Update: {
          block_id?: string | null
          chapter_id?: string
          citation_number?: number
          created_at?: string
          id?: string
          page_reference?: string | null
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "citations_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citations_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citations_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_spots: {
        Row: {
          created_at: string
          id: string
          spots_taken: number
          total_spots: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          spots_taken?: number
          total_spots?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          spots_taken?: number
          total_spots?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          adult_content_verified: boolean
          adult_verified_at: string | null
          created_at: string
          founder_discount_applied: boolean
          full_name: string | null
          id: string
          is_founder: boolean
          monthly_word_limit: number
          project_limit: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: string
          subscription_tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adult_content_verified?: boolean
          adult_verified_at?: string | null
          created_at?: string
          founder_discount_applied?: boolean
          full_name?: string | null
          id?: string
          is_founder?: boolean
          monthly_word_limit?: number
          project_limit?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string
          subscription_tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adult_content_verified?: boolean
          adult_verified_at?: string | null
          created_at?: string
          founder_discount_applied?: boolean
          full_name?: string | null
          id?: string
          is_founder?: boolean
          monthly_word_limit?: number
          project_limit?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string
          subscription_tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          complexity: number | null
          created_at: string
          description: string | null
          genre: string
          id: string
          status: string
          style_action: boolean | null
          style_descriptive: boolean | null
          style_dialogue: boolean | null
          target_audience: string | null
          target_word_count: number
          title: string
          tone: string | null
          updated_at: string
          user_id: string
          word_count: number
        }
        Insert: {
          complexity?: number | null
          created_at?: string
          description?: string | null
          genre: string
          id?: string
          status?: string
          style_action?: boolean | null
          style_descriptive?: boolean | null
          style_dialogue?: boolean | null
          target_audience?: string | null
          target_word_count?: number
          title: string
          tone?: string | null
          updated_at?: string
          user_id: string
          word_count?: number
        }
        Update: {
          complexity?: number | null
          created_at?: string
          description?: string | null
          genre?: string
          id?: string
          status?: string
          style_action?: boolean | null
          style_descriptive?: boolean | null
          style_dialogue?: boolean | null
          target_audience?: string | null
          target_word_count?: number
          title?: string
          tone?: string | null
          updated_at?: string
          user_id?: string
          word_count?: number
        }
        Relationships: []
      }
      sources: {
        Row: {
          author: string | null
          created_at: string
          id: string
          is_starred: boolean
          notes: string | null
          project_id: string
          publisher: string | null
          source_type: string
          tags: string[] | null
          title: string
          updated_at: string
          url: string | null
          year: number | null
        }
        Insert: {
          author?: string | null
          created_at?: string
          id?: string
          is_starred?: boolean
          notes?: string | null
          project_id: string
          publisher?: string | null
          source_type?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          url?: string | null
          year?: number | null
        }
        Update: {
          author?: string | null
          created_at?: string
          id?: string
          is_starred?: boolean
          notes?: string | null
          project_id?: string
          publisher?: string | null
          source_type?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          url?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_usage: {
        Row: {
          created_at: string
          id: string
          month: string
          projects_created: number
          updated_at: string
          user_id: string
          words_generated: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          projects_created?: number
          updated_at?: string
          user_id: string
          words_generated?: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          projects_created?: number
          updated_at?: string
          user_id?: string
          words_generated?: number
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
