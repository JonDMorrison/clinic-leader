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
      demo_provision: {
        Row: {
          created_at: string
          id: string
          last_seed_at: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seed_at?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seed_at?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_provision_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_provision_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      help_dismissed: {
        Row: {
          dismissed: boolean | null
          dismissed_at: string | null
          id: string
          team_id: string
          term: string
          user_id: string
        }
        Insert: {
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          team_id: string
          term: string
          user_id: string
        }
        Update: {
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          team_id?: string
          term?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_dismissed_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_dismissed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      help_events: {
        Row: {
          action: string
          context: string | null
          created_at: string | null
          id: string
          team_id: string
          term: string
          user_id: string | null
        }
        Insert: {
          action: string
          context?: string | null
          created_at?: string | null
          id?: string
          team_id: string
          term: string
          user_id?: string | null
        }
        Update: {
          action?: string
          context?: string | null
          created_at?: string | null
          id?: string
          team_id?: string
          term?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      jane_integrations: {
        Row: {
          api_key: string
          clinic_id: string | null
          created_at: string | null
          id: string
          last_sync: string | null
          next_sync: string | null
          status: string | null
          sync_mode: string | null
          sync_scope: string[] | null
          team_id: string
          updated_at: string | null
        }
        Insert: {
          api_key: string
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          last_sync?: string | null
          next_sync?: string | null
          status?: string | null
          sync_mode?: string | null
          sync_scope?: string[] | null
          team_id: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          last_sync?: string | null
          next_sync?: string | null
          status?: string | null
          sync_mode?: string | null
          sync_scope?: string[] | null
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jane_integrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      jane_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          integration_id: string
          records_synced: number | null
          started_at: string | null
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          integration_id: string
          records_synced?: number | null
          started_at?: string | null
          status: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          integration_id?: string
          records_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "jane_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "jane_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_default_batches: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          id: string
          include_bundles: string[] | null
          include_targets: boolean
          organization_id: string
          template_key: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          include_bundles?: string[] | null
          include_targets?: boolean
          organization_id: string
          template_key: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          include_bundles?: string[] | null
          include_targets?: boolean
          organization_id?: string
          template_key?: string
        }
        Relationships: []
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
          default_batch_id: string | null
          direction: Database["public"]["Enums"]["kpi_direction"]
          display_group: string | null
          display_order: number | null
          expression: string | null
          id: string
          is_computed: boolean | null
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
          default_batch_id?: string | null
          direction: Database["public"]["Enums"]["kpi_direction"]
          display_group?: string | null
          display_order?: number | null
          expression?: string | null
          id?: string
          is_computed?: boolean | null
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
          default_batch_id?: string | null
          direction?: Database["public"]["Enums"]["kpi_direction"]
          display_group?: string | null
          display_order?: number | null
          expression?: string | null
          id?: string
          is_computed?: boolean | null
          name?: string
          owner_id?: string | null
          target?: number | null
          unit?: Database["public"]["Enums"]["kpi_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpis_default_batch_id_fkey"
            columns: ["default_batch_id"]
            isOneToOne: false
            referencedRelation: "kpi_default_batches"
            referencedColumns: ["id"]
          },
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
      recall_actions: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          details: string | null
          id: string
          organization_id: string
          recall_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          organization_id: string
          recall_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          organization_id?: string
          recall_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recall_actions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_actions_recall_id_fkey"
            columns: ["recall_id"]
            isOneToOne: false
            referencedRelation: "recalls"
            referencedColumns: ["id"]
          },
        ]
      }
      recalls: {
        Row: {
          created_at: string | null
          due_date: string
          id: string
          kind: string
          notes: string | null
          organization_id: string
          patient_hash: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          due_date: string
          id?: string
          kind: string
          notes?: string | null
          organization_id: string
          patient_hash: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          due_date?: string
          id?: string
          kind?: string
          notes?: string | null
          organization_id?: string
          patient_hash?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
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
      rock_default_batches: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          id: string
          include_bundles: string[] | null
          organization_id: string
          template_key: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          include_bundles?: string[] | null
          organization_id: string
          template_key: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          include_bundles?: string[] | null
          organization_id?: string
          template_key?: string
        }
        Relationships: []
      }
      rocks: {
        Row: {
          confidence: number | null
          created_at: string
          default_batch_id: string | null
          display_group: string | null
          display_order: number | null
          due_date: string | null
          id: string
          level: Database["public"]["Enums"]["rock_level"]
          note: string | null
          owner_id: string | null
          quarter: string
          status: Database["public"]["Enums"]["rock_status"]
          title: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          default_batch_id?: string | null
          display_group?: string | null
          display_order?: number | null
          due_date?: string | null
          id?: string
          level: Database["public"]["Enums"]["rock_level"]
          note?: string | null
          owner_id?: string | null
          quarter: string
          status?: Database["public"]["Enums"]["rock_status"]
          title: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          default_batch_id?: string | null
          display_group?: string | null
          display_order?: number | null
          due_date?: string | null
          id?: string
          level?: Database["public"]["Enums"]["rock_level"]
          note?: string | null
          owner_id?: string | null
          quarter?: string
          status?: Database["public"]["Enums"]["rock_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rocks_default_batch_id_fkey"
            columns: ["default_batch_id"]
            isOneToOne: false
            referencedRelation: "rock_default_batches"
            referencedColumns: ["id"]
          },
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
          is_demo_org: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo_org?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo_org?: boolean
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
      user_preferences: {
        Row: {
          created_at: string
          id: string
          simple_mode: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          simple_mode?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          simple_mode?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
          organization_id: string | null
          started_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          current_step?: number | null
          id?: string
          organization_id?: string | null
          started_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          current_step?: number | null
          id?: string
          organization_id?: string | null
          started_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tour_status_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
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
          demo_user: boolean
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
          demo_user?: boolean
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
          demo_user?: boolean
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
      vto: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          team_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          team_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          team_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vto_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vto_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      vto_audit: {
        Row: {
          action: string
          created_at: string | null
          id: string
          meta: Json | null
          user_id: string | null
          vto_version_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          meta?: Json | null
          user_id?: string | null
          vto_version_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          meta?: Json | null
          user_id?: string | null
          vto_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vto_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vto_audit_vto_version_id_fkey"
            columns: ["vto_version_id"]
            isOneToOne: false
            referencedRelation: "vto_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      vto_links: {
        Row: {
          created_at: string | null
          goal_key: string
          id: string
          link_id: string
          link_type: string
          vto_version_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          goal_key: string
          id?: string
          link_id: string
          link_type: string
          vto_version_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          goal_key?: string
          id?: string
          link_id?: string
          link_type?: string
          vto_version_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vto_links_vto_version_id_fkey"
            columns: ["vto_version_id"]
            isOneToOne: false
            referencedRelation: "vto_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      vto_preset_events: {
        Row: {
          action: string
          created_at: string | null
          id: string
          preset_key: string
          team_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          preset_key: string
          team_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          preset_key?: string
          team_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vto_preset_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vto_preset_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vto_progress: {
        Row: {
          computed_at: string | null
          details: Json | null
          id: string
          traction_score: number | null
          vision_score: number | null
          vto_version_id: string
        }
        Insert: {
          computed_at?: string | null
          details?: Json | null
          id?: string
          traction_score?: number | null
          vision_score?: number | null
          vto_version_id: string
        }
        Update: {
          computed_at?: string | null
          details?: Json | null
          id?: string
          traction_score?: number | null
          vision_score?: number | null
          vto_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vto_progress_vto_version_id_fkey"
            columns: ["vto_version_id"]
            isOneToOne: false
            referencedRelation: "vto_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      vto_versions: {
        Row: {
          core_focus: Json | null
          core_values: string[] | null
          created_at: string | null
          created_by: string | null
          id: string
          issues_company: Json | null
          issues_department: Json | null
          issues_personal: Json | null
          marketing_strategy: Json | null
          one_year_plan: Json | null
          originated_from_preset: boolean | null
          preset_key: string | null
          published_at: string | null
          quarter_key: string | null
          quarterly_rocks: Json | null
          status: string
          ten_year_target: string | null
          three_year_picture: Json | null
          version: number
          vto_id: string
        }
        Insert: {
          core_focus?: Json | null
          core_values?: string[] | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          issues_company?: Json | null
          issues_department?: Json | null
          issues_personal?: Json | null
          marketing_strategy?: Json | null
          one_year_plan?: Json | null
          originated_from_preset?: boolean | null
          preset_key?: string | null
          published_at?: string | null
          quarter_key?: string | null
          quarterly_rocks?: Json | null
          status?: string
          ten_year_target?: string | null
          three_year_picture?: Json | null
          version: number
          vto_id: string
        }
        Update: {
          core_focus?: Json | null
          core_values?: string[] | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          issues_company?: Json | null
          issues_department?: Json | null
          issues_personal?: Json | null
          marketing_strategy?: Json | null
          one_year_plan?: Json | null
          originated_from_preset?: boolean | null
          preset_key?: string | null
          published_at?: string | null
          quarter_key?: string | null
          quarterly_rocks?: Json | null
          status?: string
          ten_year_target?: string | null
          three_year_picture?: Json | null
          version?: number
          vto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vto_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vto_versions_vto_id_fkey"
            columns: ["vto_id"]
            isOneToOne: false
            referencedRelation: "vto"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_recall_metrics: {
        Row: {
          due_today: number | null
          organization_id: string | null
          past_due: number | null
          total_open: number | null
          upcoming: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_user_id: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      current_user_team: { Args: never; Returns: string }
      get_onboarding_metrics: {
        Args: { org_id: string }
        Returns: {
          completed_count: number
          completion_rate: number
          pending_count: number
          total_users: number
        }[]
      }
      get_user_onboarding_details: {
        Args: { org_id: string }
        Returns: {
          completed: boolean
          current_step: number
          email: string
          full_name: string
          started_at: string
          team_name: string
          updated_at: string
          user_id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_billing: { Args: never; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      is_same_team: { Args: { check_team_id: string }; Returns: boolean }
    }
    Enums: {
      ar_bucket: "30-60" | "60-90" | "90-120" | "120+"
      doc_kind: "SOP" | "Policy" | "Handbook" | "Training"
      doc_status: "draft" | "approved" | "archived"
      ingest_status: "pending" | "processing" | "success" | "error"
      issue_status: "open" | "in_progress" | "solved" | "parked"
      kpi_direction: ">=" | "<=" | "=="
      kpi_unit:
        | "count"
        | "%"
        | "$"
        | "days"
        | "ratio"
        | "number"
        | "currency"
        | "percentage"
        | "minutes"
        | "hours"
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
      doc_kind: ["SOP", "Policy", "Handbook", "Training"],
      doc_status: ["draft", "approved", "archived"],
      ingest_status: ["pending", "processing", "success", "error"],
      issue_status: ["open", "in_progress", "solved", "parked"],
      kpi_direction: [">=", "<=", "=="],
      kpi_unit: [
        "count",
        "%",
        "$",
        "days",
        "ratio",
        "number",
        "currency",
        "percentage",
        "minutes",
        "hours",
      ],
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
