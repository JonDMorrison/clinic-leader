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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      acknowledgements: {
        Row: {
          acknowledged_at: string
          doc_id: string
          id: string
          quiz_score: number | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          doc_id: string
          id?: string
          quiz_score?: number | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          doc_id?: string
          id?: string
          quiz_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acknowledgements_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "docs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acknowledgements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agendas: {
        Row: {
          agenda: Json
          created_at: string
          id: string
          team_id: string | null
          week_start: string
        }
        Insert: {
          agenda: Json
          created_at?: string
          id?: string
          team_id?: string | null
          week_start: string
        }
        Update: {
          agenda?: Json
          created_at?: string
          id?: string
          team_id?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agendas_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          created_at: string
          id: string
          summary: Json
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          summary: Json
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          summary?: Json
          week_start?: string
        }
        Relationships: []
      }
      ai_logs: {
        Row: {
          created_at: string
          feedback: Json | null
          id: string
          payload: Json
          type: string
        }
        Insert: {
          created_at?: string
          feedback?: Json | null
          id?: string
          payload: Json
          type: string
        }
        Update: {
          created_at?: string
          feedback?: Json | null
          id?: string
          payload?: Json
          type?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          api_calls: number
          cost_estimate: number
          created_at: string
          date: string
          id: string
          tokens_used: number
        }
        Insert: {
          api_calls?: number
          cost_estimate?: number
          created_at?: string
          date: string
          id?: string
          tokens_used?: number
        }
        Update: {
          api_calls?: number
          cost_estimate?: number
          created_at?: string
          date?: string
          id?: string
          tokens_used?: number
        }
        Relationships: []
      }
      ar_aging: {
        Row: {
          amount: number
          bucket: Database["public"]["Enums"]["ar_bucket"]
          created_at: string
          id: string
          owner_id: string | null
          week_start: string
        }
        Insert: {
          amount?: number
          bucket: Database["public"]["Enums"]["ar_bucket"]
          created_at?: string
          id?: string
          owner_id?: string | null
          week_start: string
        }
        Update: {
          amount?: number
          bucket?: Database["public"]["Enums"]["ar_bucket"]
          created_at?: string
          id?: string
          owner_id?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_aging_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          payload: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          payload?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      branding: {
        Row: {
          accent_color: string | null
          created_at: string
          custom_domain: string | null
          favicon_url: string | null
          font_family: string | null
          id: string
          logo_url: string | null
          organization_id: string | null
          primary_color: string | null
          secondary_color: string | null
          subdomain: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          custom_domain?: string | null
          favicon_url?: string | null
          font_family?: string | null
          id?: string
          logo_url?: string | null
          organization_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          subdomain?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          custom_domain?: string | null
          favicon_url?: string | null
          font_family?: string | null
          id?: string
          logo_url?: string | null
          organization_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          subdomain?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      core_values: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      docs: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["doc_kind"]
          owner_id: string | null
          requires_ack: boolean
          status: Database["public"]["Enums"]["doc_status"]
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["doc_kind"]
          owner_id?: string | null
          requires_ack?: boolean
          status?: Database["public"]["Enums"]["doc_status"]
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["doc_kind"]
          owner_id?: string | null
          requires_ack?: boolean
          status?: Database["public"]["Enums"]["doc_status"]
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "docs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      file_ingest_log: {
        Row: {
          checksum: string
          created_at: string
          error: string | null
          file_name: string
          id: string
          rows: number
          status: Database["public"]["Enums"]["ingest_status"]
        }
        Insert: {
          checksum: string
          created_at?: string
          error?: string | null
          file_name: string
          id?: string
          rows?: number
          status?: Database["public"]["Enums"]["ingest_status"]
        }
        Update: {
          checksum?: string
          created_at?: string
          error?: string | null
          file_name?: string
          id?: string
          rows?: number
          status?: Database["public"]["Enums"]["ingest_status"]
        }
        Relationships: []
      }
      import_mappings: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          source_label: string
          source_system: string
          tracked_kpi_id: string
          transform: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          source_label: string
          source_system: string
          tracked_kpi_id: string
          transform?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          source_label?: string
          source_system?: string
          tracked_kpi_id?: string
          transform?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_mappings_tracked_kpi_id_fkey"
            columns: ["tracked_kpi_id"]
            isOneToOne: false
            referencedRelation: "tracked_kpis"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          context: string | null
          created_at: string
          id: string
          owner_id: string | null
          priority: number
          solved_at: string | null
          status: Database["public"]["Enums"]["issue_status"]
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          owner_id?: string | null
          priority?: number
          solved_at?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          owner_id?: string | null
          priority?: number
          solved_at?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_readings: {
        Row: {
          created_at: string
          id: string
          kpi_id: string
          note: string | null
          value: number
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          kpi_id: string
          note?: string | null
          value: number
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          kpi_id?: string
          note?: string | null
          value?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_readings_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
        ]
      }
      kpis: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          direction: Database["public"]["Enums"]["kpi_direction"]
          id: string
          name: string
          owner_id: string | null
          target: number | null
          unit: Database["public"]["Enums"]["kpi_unit"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          direction: Database["public"]["Enums"]["kpi_direction"]
          id?: string
          name: string
          owner_id?: string | null
          target?: number | null
          unit: Database["public"]["Enums"]["kpi_unit"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["kpi_direction"]
          id?: string
          name?: string
          owner_id?: string | null
          target?: number | null
          unit?: Database["public"]["Enums"]["kpi_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpis_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          active: boolean
          ai_calls_limit: number | null
          created_at: string
          id: string
          organization_id: string | null
          plan: string
          renewal_date: string | null
          updated_at: string
          users_limit: number | null
        }
        Insert: {
          active?: boolean
          ai_calls_limit?: number | null
          created_at?: string
          id?: string
          organization_id?: string | null
          plan?: string
          renewal_date?: string | null
          updated_at?: string
          users_limit?: number | null
        }
        Update: {
          active?: boolean
          ai_calls_limit?: number | null
          created_at?: string
          id?: string
          organization_id?: string | null
          plan?: string
          renewal_date?: string | null
          updated_at?: string
          users_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "licenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notes: {
        Row: {
          created_at: string
          decisions: string[] | null
          headlines: string[] | null
          id: string
          kpi_snapshot: Json | null
          meeting_id: string
          rock_check: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          decisions?: string[] | null
          headlines?: string[] | null
          id?: string
          kpi_snapshot?: Json | null
          meeting_id: string
          rock_check?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          decisions?: string[] | null
          headlines?: string[] | null
          id?: string
          kpi_snapshot?: Json | null
          meeting_id?: string
          rock_check?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          scheduled_for: string
          team_id: string | null
          type: Database["public"]["Enums"]["meeting_type"]
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          scheduled_for: string
          team_id?: string | null
          type: Database["public"]["Enums"]["meeting_type"]
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          scheduled_for?: string
          team_id?: string | null
          type?: Database["public"]["Enums"]["meeting_type"]
        }
        Relationships: [
          {
            foreignKeyName: "meetings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_sources: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      referrals_weekly: {
        Row: {
          created_at: string
          id: string
          scheduled: number
          source_id: string
          total: number
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          scheduled?: number
          source_id: string
          total?: number
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          scheduled?: number
          source_id?: string
          total?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_weekly_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "referral_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          period: string
          sent_at: string | null
          summary: Json
          team_id: string | null
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          period: string
          sent_at?: string | null
          summary: Json
          team_id?: string | null
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          period?: string
          sent_at?: string | null
          summary?: Json
          team_id?: string | null
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      rocks: {
        Row: {
          confidence: number | null
          created_at: string
          due_date: string | null
          id: string
          level: Database["public"]["Enums"]["rock_level"]
          owner_id: string | null
          quarter: string
          status: Database["public"]["Enums"]["rock_status"]
          title: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          due_date?: string | null
          id?: string
          level: Database["public"]["Enums"]["rock_level"]
          owner_id?: string | null
          quarter: string
          status?: Database["public"]["Enums"]["rock_status"]
          title: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          due_date?: string | null
          id?: string
          level?: Database["public"]["Enums"]["rock_level"]
          owner_id?: string | null
          quarter?: string
          status?: Database["public"]["Enums"]["rock_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rocks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seats: {
        Row: {
          created_at: string
          id: string
          responsibilities: string[] | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          responsibilities?: string[] | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          responsibilities?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      staging_appointments: {
        Row: {
          id: string
          ingested_at: string
          raw: Json
        }
        Insert: {
          id?: string
          ingested_at?: string
          raw: Json
        }
        Update: {
          id?: string
          ingested_at?: string
          raw?: Json
        }
        Relationships: []
      }
      staging_ar_lines: {
        Row: {
          id: string
          ingested_at: string
          raw: Json
        }
        Insert: {
          id?: string
          ingested_at?: string
          raw: Json
        }
        Update: {
          id?: string
          ingested_at?: string
          raw?: Json
        }
        Relationships: []
      }
      staging_patients: {
        Row: {
          id: string
          ingested_at: string
          raw: Json
        }
        Insert: {
          id?: string
          ingested_at?: string
          raw: Json
        }
        Update: {
          id?: string
          ingested_at?: string
          raw?: Json
        }
        Relationships: []
      }
      staging_payments: {
        Row: {
          id: string
          ingested_at: string
          raw: Json
        }
        Insert: {
          id?: string
          ingested_at?: string
          raw: Json
        }
        Update: {
          id?: string
          ingested_at?: string
          raw?: Json
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          created_at: string
          done_at: string | null
          due_date: string | null
          id: string
          issue_id: string | null
          owner_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          done_at?: string | null
          due_date?: string | null
          id?: string
          issue_id?: string | null
          owner_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          done_at?: string | null
          due_date?: string | null
          id?: string
          issue_id?: string | null
          owner_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_dimensions: {
        Row: {
          created_at: string | null
          id: string
          name: string
          organization_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_dimensions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_kpis: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          external_key: string | null
          formula: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          owner_id: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          external_key?: string | null
          formula?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          owner_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          external_key?: string | null
          formula?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          owner_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracked_kpis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracked_kpis_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tour_status: {
        Row: {
          completed: boolean | null
          current_step: number | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          current_step?: number | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          current_step?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tour_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          department_id: string | null
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email: string
          full_name: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      value_ratings: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          rating: Database["public"]["Enums"]["value_rating"]
          updated_at: string
          user_id: string
          value_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          rating: Database["public"]["Enums"]["value_rating"]
          updated_at?: string
          user_id: string
          value_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          rating?: Database["public"]["Enums"]["value_rating"]
          updated_at?: string
          user_id?: string
          value_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "value_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_ratings_value_id_fkey"
            columns: ["value_id"]
            isOneToOne: false
            referencedRelation: "core_values"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_docs: {
        Row: {
          chunk: string
          created_at: string
          doc_id: string | null
          embedding: string | null
          id: string
        }
        Insert: {
          chunk: string
          created_at?: string
          doc_id?: string | null
          embedding?: string | null
          id?: string
        }
        Update: {
          chunk?: string
          created_at?: string
          doc_id?: string | null
          embedding?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_docs_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "docs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_id: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      current_user_team: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_billing: { Args: never; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      is_same_team: { Args: { check_team_id: string }; Returns: boolean }
    }
    Enums: {
      ar_bucket: "30-60" | "60-90" | "90-120" | "120+"
      doc_kind: "SOP" | "Policy" | "Handbook"
      doc_status: "draft" | "approved" | "archived"
      ingest_status: "pending" | "processing" | "success" | "error"
      issue_status: "open" | "in_progress" | "solved" | "parked"
      kpi_direction: ">=" | "<=" | "=="
      kpi_unit: "count" | "%" | "$" | "days" | "ratio"
      meeting_type: "L10" | "leadership_sync"
      rock_level: "company" | "team" | "individual"
      rock_status: "on_track" | "off_track" | "done"
      user_role:
        | "owner"
        | "director"
        | "manager"
        | "provider"
        | "staff"
        | "billing"
      value_rating: "+" | "±" | "-"
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
      ar_bucket: ["30-60", "60-90", "90-120", "120+"],
      doc_kind: ["SOP", "Policy", "Handbook"],
      doc_status: ["draft", "approved", "archived"],
      ingest_status: ["pending", "processing", "success", "error"],
      issue_status: ["open", "in_progress", "solved", "parked"],
      kpi_direction: [">=", "<=", "=="],
      kpi_unit: ["count", "%", "$", "days", "ratio"],
      meeting_type: ["L10", "leadership_sync"],
      rock_level: ["company", "team", "individual"],
      rock_status: ["on_track", "off_track", "done"],
      user_role: [
        "owner",
        "director",
        "manager",
        "provider",
        "staff",
        "billing",
      ],
      value_rating: ["+", "±", "-"],
    },
  },
} as const
