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
      admin_activity_logs: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_email_campaigns: {
        Row: {
          admin_id: string
          body_html: string
          body_text: string | null
          completed_at: string | null
          created_at: string | null
          failed_count: number | null
          id: string
          recipient_count: number | null
          recipient_filter: Json | null
          recipient_type: string
          sent_count: number | null
          started_at: string | null
          status: string
          subject: string
        }
        Insert: {
          admin_id: string
          body_html: string
          body_text?: string | null
          completed_at?: string | null
          created_at?: string | null
          failed_count?: number | null
          id?: string
          recipient_count?: number | null
          recipient_filter?: Json | null
          recipient_type?: string
          sent_count?: number | null
          started_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          admin_id?: string
          body_html?: string
          body_text?: string | null
          completed_at?: string | null
          created_at?: string | null
          failed_count?: number | null
          id?: string
          recipient_count?: number | null
          recipient_filter?: Json | null
          recipient_type?: string
          sent_count?: number | null
          started_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          permissions: Json | null
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          permissions?: Json | null
          role?: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          permissions?: Json | null
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: []
      }
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
      analytics_daily: {
        Row: {
          active_users: number | null
          ai_tokens_used: number | null
          chapters_generated: number | null
          churned_subscriptions: number | null
          created_at: string | null
          date: string
          id: string
          new_subscriptions: number | null
          new_users: number | null
          projects_created: number | null
          revenue_total: number | null
        }
        Insert: {
          active_users?: number | null
          ai_tokens_used?: number | null
          chapters_generated?: number | null
          churned_subscriptions?: number | null
          created_at?: string | null
          date: string
          id?: string
          new_subscriptions?: number | null
          new_users?: number | null
          projects_created?: number | null
          revenue_total?: number | null
        }
        Update: {
          active_users?: number | null
          ai_tokens_used?: number | null
          chapters_generated?: number | null
          churned_subscriptions?: number | null
          created_at?: string | null
          date?: string
          id?: string
          new_subscriptions?: number | null
          new_users?: number | null
          projects_created?: number | null
          revenue_total?: number | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          starts_at: string | null
          target_audience: string | null
          title: string
          type: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          starts_at?: string | null
          target_audience?: string | null
          title: string
          type?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          starts_at?: string | null
          target_audience?: string | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      audiobook_chapters: {
        Row: {
          audio_url: string | null
          audiobook_id: string
          chapter_id: string
          created_at: string | null
          duration_seconds: number | null
          error_message: string | null
          id: string
          sort_order: number | null
          status: string | null
        }
        Insert: {
          audio_url?: string | null
          audiobook_id: string
          chapter_id: string
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          sort_order?: number | null
          status?: string | null
        }
        Update: {
          audio_url?: string | null
          audiobook_id?: string
          chapter_id?: string
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          sort_order?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audiobook_chapters_audiobook_id_fkey"
            columns: ["audiobook_id"]
            isOneToOne: false
            referencedRelation: "audiobooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audiobook_chapters_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      audiobook_credit_purchases: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          id: string
          minutes_purchased: number
          status: string
          stripe_session_id: string
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          id?: string
          minutes_purchased: number
          status?: string
          stripe_session_id: string
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          minutes_purchased?: number
          status?: string
          stripe_session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      audiobooks: {
        Row: {
          audio_url: string | null
          completed_at: string | null
          completed_chapters: number | null
          created_at: string | null
          duration_seconds: number | null
          error_message: string | null
          file_size: number | null
          id: string
          progress: number | null
          project_id: string
          status: string | null
          total_chapters: number | null
          user_id: string
          voice_id: string
        }
        Insert: {
          audio_url?: string | null
          completed_at?: string | null
          completed_chapters?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          file_size?: number | null
          id?: string
          progress?: number | null
          project_id: string
          status?: string | null
          total_chapters?: number | null
          user_id: string
          voice_id: string
        }
        Update: {
          audio_url?: string | null
          completed_at?: string | null
          completed_chapters?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          file_size?: number | null
          id?: string
          progress?: number | null
          project_id?: string
          status?: string | null
          total_chapters?: number | null
          user_id?: string
          voice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audiobooks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audiobooks_voice_id_fkey"
            columns: ["voice_id"]
            isOneToOne: false
            referencedRelation: "tts_voices"
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
      book_share_access: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
          session_token: string
          share_id: string
          verified_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          session_token: string
          share_id: string
          verified_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          session_token?: string
          share_id?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_share_access_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "book_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_share_access_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "book_shares_public"
            referencedColumns: ["id"]
          },
        ]
      }
      book_shares: {
        Row: {
          allow_download: boolean | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_public: boolean | null
          password_hash: string | null
          project_id: string
          share_token: string
          updated_at: string | null
          user_id: string
          view_count: number | null
          view_mode: string | null
        }
        Insert: {
          allow_download?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean | null
          password_hash?: string | null
          project_id: string
          share_token: string
          updated_at?: string | null
          user_id: string
          view_count?: number | null
          view_mode?: string | null
        }
        Update: {
          allow_download?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean | null
          password_hash?: string | null
          project_id?: string
          share_token?: string
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
          view_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          character_appearances: Json | null
          content: string | null
          created_at: string
          current_scene_index: number | null
          generation_status: string | null
          id: string
          key_points: string[] | null
          project_id: string
          quality_issues: Json | null
          quality_score: number | null
          scene_outline: Json | null
          scenes_completed: number | null
          sort_order: number
          status: string
          summary: string | null
          tension_level: string | null
          title: string
          updated_at: string
          word_count: number
          writing_error: string | null
          writing_status: string | null
        }
        Insert: {
          character_appearances?: Json | null
          content?: string | null
          created_at?: string
          current_scene_index?: number | null
          generation_status?: string | null
          id?: string
          key_points?: string[] | null
          project_id: string
          quality_issues?: Json | null
          quality_score?: number | null
          scene_outline?: Json | null
          scenes_completed?: number | null
          sort_order?: number
          status?: string
          summary?: string | null
          tension_level?: string | null
          title?: string
          updated_at?: string
          word_count?: number
          writing_error?: string | null
          writing_status?: string | null
        }
        Update: {
          character_appearances?: Json | null
          content?: string | null
          created_at?: string
          current_scene_index?: number | null
          generation_status?: string | null
          id?: string
          key_points?: string[] | null
          project_id?: string
          quality_issues?: Json | null
          quality_score?: number | null
          scene_outline?: Json | null
          scenes_completed?: number | null
          sort_order?: number
          status?: string
          summary?: string | null
          tension_level?: string | null
          title?: string
          updated_at?: string
          word_count?: number
          writing_error?: string | null
          writing_status?: string | null
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
          character_voice: string | null
          created_at: string
          development_arc: Json | null
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
          character_voice?: string | null
          created_at?: string
          development_arc?: Json | null
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
          character_voice?: string | null
          created_at?: string
          development_arc?: Json | null
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
      covers: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_selected: boolean
          parent_cover_id: string | null
          project_id: string
          prompt: string
          style: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_selected?: boolean
          parent_cover_id?: string | null
          project_id: string
          prompt: string
          style: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_selected?: boolean
          parent_cover_id?: string | null
          project_id?: string
          prompt?: string
          style?: string
        }
        Relationships: [
          {
            foreignKeyName: "covers_parent_cover_id_fkey"
            columns: ["parent_cover_id"]
            isOneToOne: false
            referencedRelation: "covers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "covers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_purchases: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          id: string
          status: string
          stripe_session_id: string
          user_id: string
          words_purchased: number
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          stripe_session_id: string
          user_id: string
          words_purchased: number
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          stripe_session_id?: string
          user_id?: string
          words_purchased?: number
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          body_text: string | null
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          subject: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body_html: string
          body_text?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          subject: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body_html?: string
          body_text?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          subject?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      exports: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_size: number | null
          file_url: string | null
          format: string
          id: string
          project_id: string
          settings: Json | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_size?: number | null
          file_url?: string | null
          format: string
          id?: string
          project_id: string
          settings?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_size?: number | null
          file_url?: string | null
          format?: string
          id?: string
          project_id?: string
          settings?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          admin_notes: string | null
          adult_content_verified: boolean
          adult_verified_at: string | null
          audiobook_minutes_balance: number
          avatar_url: string | null
          billing_period: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          extra_words_balance: number
          founder_discount_applied: boolean
          full_name: string | null
          id: string
          is_founder: boolean
          last_credit_reset: string
          manual_subscription: boolean | null
          monthly_word_limit: number
          payment_method: string | null
          project_limit: number
          referral_bonus_received: boolean | null
          referral_code: string | null
          referred_by: string | null
          retention_discount_active: boolean | null
          retention_discount_expires_at: string | null
          retention_offer_accepted_at: string | null
          retention_offer_shown_at: string | null
          social_instagram: string | null
          social_twitter: string | null
          storybook_credit_limit: number
          storybook_credits_used: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: string
          subscription_tier: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          admin_notes?: string | null
          adult_content_verified?: boolean
          adult_verified_at?: string | null
          audiobook_minutes_balance?: number
          avatar_url?: string | null
          billing_period?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          extra_words_balance?: number
          founder_discount_applied?: boolean
          full_name?: string | null
          id?: string
          is_founder?: boolean
          last_credit_reset?: string
          manual_subscription?: boolean | null
          monthly_word_limit?: number
          payment_method?: string | null
          project_limit?: number
          referral_bonus_received?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          retention_discount_active?: boolean | null
          retention_discount_expires_at?: string | null
          retention_offer_accepted_at?: string | null
          retention_offer_shown_at?: string | null
          social_instagram?: string | null
          social_twitter?: string | null
          storybook_credit_limit?: number
          storybook_credits_used?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string
          subscription_tier?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          admin_notes?: string | null
          adult_content_verified?: boolean
          adult_verified_at?: string | null
          audiobook_minutes_balance?: number
          avatar_url?: string | null
          billing_period?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          extra_words_balance?: number
          founder_discount_applied?: boolean
          full_name?: string | null
          id?: string
          is_founder?: boolean
          last_credit_reset?: string
          manual_subscription?: boolean | null
          monthly_word_limit?: number
          payment_method?: string | null
          project_limit?: number
          referral_bonus_received?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          retention_discount_active?: boolean | null
          retention_discount_expires_at?: string | null
          retention_offer_accepted_at?: string | null
          retention_offer_shown_at?: string | null
          social_instagram?: string | null
          social_twitter?: string | null
          storybook_credit_limit?: number
          storybook_credits_used?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string
          subscription_tier?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          additional_instructions: string | null
          audience_level: string | null
          author_profile: Json | null
          background_error: string | null
          background_started_at: string | null
          book_type: string | null
          book_type_data: Json | null
          completed_scenes: number | null
          complexity: number | null
          created_at: string
          current_chapter_index: number | null
          current_scene_index: number | null
          description: string | null
          failed_scenes: number | null
          fiction_style: Json | null
          generated_story: string | null
          genre: string
          id: string
          last_activity_at: string | null
          nonfiction_book_type: string | null
          selected_story_idea: Json | null
          status: string
          story_arc: Json | null
          story_idea: string | null
          story_structure: Json | null
          storybook_data: Json | null
          style_action: boolean | null
          style_descriptive: boolean | null
          style_dialogue: boolean | null
          subcategory: string | null
          target_audience: string | null
          target_word_count: number
          title: string
          tone: string | null
          total_scenes: number | null
          updated_at: string
          user_id: string
          wizard_step: number | null
          word_count: number
          writing_completed_at: string | null
          writing_error: string | null
          writing_mode: string | null
          writing_started_at: string | null
          writing_status: string | null
          writing_style: string | null
        }
        Insert: {
          additional_instructions?: string | null
          audience_level?: string | null
          author_profile?: Json | null
          background_error?: string | null
          background_started_at?: string | null
          book_type?: string | null
          book_type_data?: Json | null
          completed_scenes?: number | null
          complexity?: number | null
          created_at?: string
          current_chapter_index?: number | null
          current_scene_index?: number | null
          description?: string | null
          failed_scenes?: number | null
          fiction_style?: Json | null
          generated_story?: string | null
          genre: string
          id?: string
          last_activity_at?: string | null
          nonfiction_book_type?: string | null
          selected_story_idea?: Json | null
          status?: string
          story_arc?: Json | null
          story_idea?: string | null
          story_structure?: Json | null
          storybook_data?: Json | null
          style_action?: boolean | null
          style_descriptive?: boolean | null
          style_dialogue?: boolean | null
          subcategory?: string | null
          target_audience?: string | null
          target_word_count?: number
          title: string
          tone?: string | null
          total_scenes?: number | null
          updated_at?: string
          user_id: string
          wizard_step?: number | null
          word_count?: number
          writing_completed_at?: string | null
          writing_error?: string | null
          writing_mode?: string | null
          writing_started_at?: string | null
          writing_status?: string | null
          writing_style?: string | null
        }
        Update: {
          additional_instructions?: string | null
          audience_level?: string | null
          author_profile?: Json | null
          background_error?: string | null
          background_started_at?: string | null
          book_type?: string | null
          book_type_data?: Json | null
          completed_scenes?: number | null
          complexity?: number | null
          created_at?: string
          current_chapter_index?: number | null
          current_scene_index?: number | null
          description?: string | null
          failed_scenes?: number | null
          fiction_style?: Json | null
          generated_story?: string | null
          genre?: string
          id?: string
          last_activity_at?: string | null
          nonfiction_book_type?: string | null
          selected_story_idea?: Json | null
          status?: string
          story_arc?: Json | null
          story_idea?: string | null
          story_structure?: Json | null
          storybook_data?: Json | null
          style_action?: boolean | null
          style_descriptive?: boolean | null
          style_dialogue?: boolean | null
          subcategory?: string | null
          target_audience?: string | null
          target_word_count?: number
          title?: string
          tone?: string | null
          total_scenes?: number | null
          updated_at?: string
          user_id?: string
          wizard_step?: number | null
          word_count?: number
          writing_completed_at?: string | null
          writing_error?: string | null
          writing_mode?: string | null
          writing_started_at?: string | null
          writing_status?: string | null
          writing_style?: string | null
        }
        Relationships: []
      }
      quality_issues: {
        Row: {
          chapter_id: string
          created_at: string
          description: string
          id: string
          issue_type: string
          location_text: string | null
          severity: string
          suggestion: string | null
        }
        Insert: {
          chapter_id: string
          created_at?: string
          description: string
          id?: string
          issue_type: string
          location_text?: string | null
          severity?: string
          suggestion?: string | null
        }
        Update: {
          chapter_id?: string
          created_at?: string
          description?: string
          id?: string
          issue_type?: string
          location_text?: string | null
          severity?: string
          suggestion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_issues_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referral_code: string
          referred_bonus: number | null
          referred_id: string
          referrer_bonus: number | null
          referrer_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referral_code: string
          referred_bonus?: number | null
          referred_id: string
          referrer_bonus?: number | null
          referrer_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_bonus?: number | null
          referred_id?: string
          referrer_bonus?: number | null
          referrer_id?: string
          status?: string | null
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
      subscription_plans: {
        Row: {
          created_at: string | null
          currency: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          limits: Json | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          slug: string
          sort_order: number | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          stripe_product_id: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          limits?: Json | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          slug: string
          sort_order?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          stripe_product_id?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          limits?: Json | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          slug?: string
          sort_order?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          stripe_product_id?: string | null
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          is_admin_reply: boolean | null
          message: string
          sender_id: string | null
          ticket_id: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_admin_reply?: boolean | null
          message: string
          sender_id?: string | null
          ticket_id?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_admin_reply?: boolean | null
          message?: string
          sender_id?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string | null
          description: string
          id: string
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string | null
          description: string | null
          id: string
          is_sensitive: boolean | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      tts_voices: {
        Row: {
          created_at: string | null
          description: string | null
          elevenlabs_voice_id: string
          gender: string | null
          id: string
          is_active: boolean | null
          language: string | null
          name: string
          sample_text: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          elevenlabs_voice_id: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          name: string
          sample_text?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          elevenlabs_voice_id?: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          name?: string
          sample_text?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_goals: {
        Row: {
          created_at: string
          daily_word_goal: number
          id: string
          leaderboard_opt_in: boolean
          reminder_enabled: boolean
          reminder_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_word_goal?: number
          id?: string
          leaderboard_opt_in?: boolean
          reminder_enabled?: boolean
          reminder_time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_word_goal?: number
          id?: string
          leaderboard_opt_in?: boolean
          reminder_enabled?: boolean
          reminder_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_writing_date: string | null
          longest_streak: number
          streak_recovery_used_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_writing_date?: string | null
          longest_streak?: number
          streak_recovery_used_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_writing_date?: string | null
          longest_streak?: number
          streak_recovery_used_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_style_profiles: {
        Row: {
          analyzed_at: string | null
          avg_sentence_length: number | null
          common_phrases: Json | null
          created_at: string
          dialogue_ratio: number | null
          id: string
          samples_analyzed: number | null
          style_summary: string | null
          tone_analysis: Json | null
          updated_at: string
          user_id: string
          vocabulary_complexity: number | null
        }
        Insert: {
          analyzed_at?: string | null
          avg_sentence_length?: number | null
          common_phrases?: Json | null
          created_at?: string
          dialogue_ratio?: number | null
          id?: string
          samples_analyzed?: number | null
          style_summary?: string | null
          tone_analysis?: Json | null
          updated_at?: string
          user_id: string
          vocabulary_complexity?: number | null
        }
        Update: {
          analyzed_at?: string | null
          avg_sentence_length?: number | null
          common_phrases?: Json | null
          created_at?: string
          dialogue_ratio?: number | null
          id?: string
          samples_analyzed?: number | null
          style_summary?: string | null
          tone_analysis?: Json | null
          updated_at?: string
          user_id?: string
          vocabulary_complexity?: number | null
        }
        Relationships: []
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
      user_writing_samples: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
          word_count: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
          word_count?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          word_count?: number
        }
        Relationships: []
      }
      writing_jobs: {
        Row: {
          attempts: number | null
          chapter_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          job_type: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number | null
          next_retry_at: string | null
          priority: number | null
          project_id: string
          scene_index: number | null
          scene_outline: Json | null
          sort_order: number | null
          started_at: string | null
          status: string
        }
        Insert: {
          attempts?: number | null
          chapter_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          job_type: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          priority?: number | null
          project_id: string
          scene_index?: number | null
          scene_outline?: Json | null
          sort_order?: number | null
          started_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number | null
          chapter_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          job_type?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          priority?: number | null
          project_id?: string
          scene_index?: number | null
          scene_outline?: Json | null
          sort_order?: number | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "writing_jobs_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "writing_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      writing_sessions: {
        Row: {
          ai_words_generated: number
          created_at: string
          duration_seconds: number
          id: string
          project_id: string | null
          session_date: string
          user_id: string
          words_written: number
        }
        Insert: {
          ai_words_generated?: number
          created_at?: string
          duration_seconds?: number
          id?: string
          project_id?: string | null
          session_date?: string
          user_id: string
          words_written?: number
        }
        Update: {
          ai_words_generated?: number
          created_at?: string
          duration_seconds?: number
          id?: string
          project_id?: string | null
          session_date?: string
          user_id?: string
          words_written?: number
        }
        Relationships: [
          {
            foreignKeyName: "writing_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      book_shares_public: {
        Row: {
          allow_download: boolean | null
          created_at: string | null
          expires_at: string | null
          id: string | null
          is_public: boolean | null
          project_id: string | null
          requires_password: boolean | null
          share_token: string | null
          updated_at: string | null
          user_id: string | null
          view_count: number | null
          view_mode: string | null
        }
        Insert: {
          allow_download?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          is_public?: boolean | null
          project_id?: string | null
          requires_password?: never
          share_token?: string | null
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
          view_mode?: string | null
        }
        Update: {
          allow_download?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          is_public?: boolean | null
          project_id?: string | null
          requires_password?: never
          share_token?: string | null
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
          view_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_safe: {
        Row: {
          adult_content_verified: boolean | null
          adult_verified_at: string | null
          avatar_url: string | null
          billing_period: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          extra_words_balance: number | null
          founder_discount_applied: boolean | null
          full_name: string | null
          id: string | null
          is_founder: boolean | null
          last_credit_reset: string | null
          monthly_word_limit: number | null
          project_limit: number | null
          retention_discount_active: boolean | null
          retention_discount_expires_at: string | null
          social_instagram: string | null
          social_twitter: string | null
          storybook_credit_limit: number | null
          storybook_credits_used: number | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          adult_content_verified?: boolean | null
          adult_verified_at?: string | null
          avatar_url?: string | null
          billing_period?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          extra_words_balance?: number | null
          founder_discount_applied?: boolean | null
          full_name?: string | null
          id?: string | null
          is_founder?: boolean | null
          last_credit_reset?: string | null
          monthly_word_limit?: number | null
          project_limit?: number | null
          retention_discount_active?: boolean | null
          retention_discount_expires_at?: string | null
          social_instagram?: string | null
          social_twitter?: string | null
          storybook_credit_limit?: number | null
          storybook_credits_used?: number | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          adult_content_verified?: boolean | null
          adult_verified_at?: string | null
          avatar_url?: string | null
          billing_period?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          extra_words_balance?: number | null
          founder_discount_applied?: boolean | null
          full_name?: string | null
          id?: string | null
          is_founder?: boolean | null
          last_credit_reset?: string | null
          monthly_word_limit?: number | null
          project_limit?: number | null
          retention_discount_active?: boolean | null
          retention_discount_expires_at?: string | null
          social_instagram?: string | null
          social_twitter?: string | null
          storybook_credit_limit?: number | null
          storybook_credits_used?: number | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_audiobook_minutes_internal: {
        Args: { p_minutes: number; p_user_id: string }
        Returns: undefined
      }
      add_extra_credits_internal: {
        Args: { p_user_id: string; p_word_count: number }
        Returns: undefined
      }
      append_chapter_content: {
        Args: {
          p_chapter_id: string
          p_new_content: string
          p_word_count_delta?: number
        }
        Returns: undefined
      }
      count_campaign_recipients: {
        Args: {
          p_filter_value?: string
          p_inactive_days?: number
          p_recipient_type: string
        }
        Returns: number
      }
      get_admin_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["admin_role"]
      }
      get_audiobook_credits: {
        Args: never
        Returns: {
          minutes_balance: number
        }[]
      }
      get_storybook_credits:
        | {
            Args: never
            Returns: {
              credit_limit: number
              credits_remaining: number
              credits_used: number
            }[]
          }
        | {
            Args: { p_user_id: string }
            Returns: {
              credit_limit: number
              credits_remaining: number
              credits_used: number
            }[]
          }
      increment_projects_created:
        | { Args: never; Returns: undefined }
        | { Args: { p_user_id: string }; Returns: undefined }
      increment_words_generated:
        | {
            Args: { p_user_id: string; p_word_count: number }
            Returns: undefined
          }
        | { Args: { p_word_count: number }; Returns: undefined }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      use_audiobook_minutes: { Args: { p_minutes: number }; Returns: boolean }
      use_extra_credits:
        | {
            Args: { p_user_id: string; p_word_count: number }
            Returns: boolean
          }
        | { Args: { p_word_count: number }; Returns: boolean }
      use_storybook_credit:
        | { Args: never; Returns: boolean }
        | { Args: { p_user_id: string }; Returns: boolean }
      use_storybook_credit_v2: { Args: never; Returns: undefined }
    }
    Enums: {
      admin_role: "super_admin" | "admin" | "support" | "viewer"
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
    Enums: {
      admin_role: ["super_admin", "admin", "support", "viewer"],
    },
  },
} as const
