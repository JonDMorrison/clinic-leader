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
      account_lock_audit: {
        Row: {
          connector_id: string
          id: string
          locked_account_guid: string
          locked_at: string
          locked_by: string | null
          organization_id: string
        }
        Insert: {
          connector_id: string
          id?: string
          locked_account_guid: string
          locked_at?: string
          locked_by?: string | null
          organization_id: string
        }
        Update: {
          connector_id?: string
          id?: string
          locked_account_guid?: string
          locked_at?: string
          locked_by?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_account_lock_connector"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "bulk_analytics_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_account_lock_org"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_account_lock_org"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      acknowledgements: {
        Row: {
          acknowledged_at: string
          doc_id: string
          id: string
          organization_id: string
          quiz_score: number | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          doc_id: string
          id?: string
          organization_id: string
          quiz_score?: number | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          doc_id?: string
          id?: string
          organization_id?: string
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
            foreignKeyName: "acknowledgements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acknowledgements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
      admin_impersonation_logs: {
        Row: {
          admin_email: string
          admin_user_id: string
          created_at: string
          ended_at: string | null
          id: string
          started_at: string
          target_organization_id: string | null
          target_user_email: string
          target_user_id: string
        }
        Insert: {
          admin_email: string
          admin_user_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          target_organization_id?: string | null
          target_user_email: string
          target_user_id: string
        }
        Update: {
          admin_email?: string
          admin_user_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          target_organization_id?: string | null
          target_user_email?: string
          target_user_id?: string
        }
        Relationships: []
      }
      ai_agendas: {
        Row: {
          agenda: Json
          created_at: string
          id: string
          organization_id: string | null
          week_start: string
        }
        Insert: {
          agenda: Json
          created_at?: string
          id?: string
          organization_id?: string | null
          week_start: string
        }
        Update: {
          agenda?: Json
          created_at?: string
          id?: string
          organization_id?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agendas_team_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agendas_team_id_fkey"
            columns: ["organization_id"]
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
          organization_id: string | null
          summary: Json
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          summary: Json
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          summary?: Json
          week_start?: string
        }
        Relationships: []
      }
      ai_intervention_recommendations: {
        Row: {
          accepted: boolean | null
          created_at: string
          created_by: string
          id: string
          implemented: boolean | null
          metric_id: string
          outcome_notes: string | null
          period_start: string
          recommendation_key: string
          recommended_at: string
          team_id: string
          updated_at: string
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string
          created_by: string
          id?: string
          implemented?: boolean | null
          metric_id: string
          outcome_notes?: string | null
          period_start: string
          recommendation_key: string
          recommended_at?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          accepted?: boolean | null
          created_at?: string
          created_by?: string
          id?: string
          implemented?: boolean | null
          metric_id?: string
          outcome_notes?: string | null
          period_start?: string
          recommendation_key?: string
          recommended_at?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_intervention_recommendations_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_intervention_recommendations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_intervention_recommendations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_logs: {
        Row: {
          created_at: string
          feedback: Json | null
          id: string
          organization_id: string | null
          payload: Json
          type: string
        }
        Insert: {
          created_at?: string
          feedback?: Json | null
          id?: string
          organization_id?: string | null
          payload: Json
          type: string
        }
        Update: {
          created_at?: string
          feedback?: Json | null
          id?: string
          organization_id?: string | null
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
          organization_id: string | null
          tokens_used: number
        }
        Insert: {
          api_calls?: number
          cost_estimate?: number
          created_at?: string
          date: string
          id?: string
          organization_id?: string | null
          tokens_used?: number
        }
        Update: {
          api_calls?: number
          cost_estimate?: number
          created_at?: string
          date?: string
          id?: string
          organization_id?: string | null
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
      benchmark_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      benchmark_cohort_memberships: {
        Row: {
          cohort_id: string
          created_at: string
          team_id: string
        }
        Insert: {
          cohort_id: string
          created_at?: string
          team_id: string
        }
        Update: {
          cohort_id?: string
          created_at?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_cohort_memberships_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "benchmark_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benchmark_cohort_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benchmark_cohort_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_cohorts: {
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
      benchmark_metric_aggregates: {
        Row: {
          emr_source_group: string
          generated_at: string
          id: string
          max_value: number | null
          median_value: number | null
          methodology_version: string
          metric_key: string
          min_value: number | null
          organization_count: number
          percentile_25: number | null
          percentile_75: number | null
          period_key: string
          sample_size: number
          std_deviation: number | null
        }
        Insert: {
          emr_source_group: string
          generated_at?: string
          id?: string
          max_value?: number | null
          median_value?: number | null
          methodology_version?: string
          metric_key: string
          min_value?: number | null
          organization_count?: number
          percentile_25?: number | null
          percentile_75?: number | null
          period_key: string
          sample_size?: number
          std_deviation?: number | null
        }
        Update: {
          emr_source_group?: string
          generated_at?: string
          id?: string
          max_value?: number | null
          median_value?: number | null
          methodology_version?: string
          metric_key?: string
          min_value?: number | null
          organization_count?: number
          percentile_25?: number | null
          percentile_75?: number | null
          period_key?: string
          sample_size?: number
          std_deviation?: number | null
        }
        Relationships: []
      }
      benchmark_quality_thresholds: {
        Row: {
          created_at: string
          description: string | null
          id: string
          threshold_key: string
          threshold_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          threshold_key: string
          threshold_value: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          threshold_key?: string
          threshold_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      benchmark_snapshots: {
        Row: {
          cohort_id: string
          computed_at: string
          excluded_count: number | null
          excluded_high_latency: number | null
          excluded_low_completeness: number | null
          excluded_low_consistency: number | null
          id: string
          included_count: number | null
          mean: number | null
          metric_id: string
          n_orgs: number
          p10: number | null
          p25: number | null
          p50: number | null
          p75: number | null
          p90: number | null
          period_start: string
          period_type: string
          quality_summary: Json | null
          stddev: number | null
        }
        Insert: {
          cohort_id: string
          computed_at?: string
          excluded_count?: number | null
          excluded_high_latency?: number | null
          excluded_low_completeness?: number | null
          excluded_low_consistency?: number | null
          id?: string
          included_count?: number | null
          mean?: number | null
          metric_id: string
          n_orgs: number
          p10?: number | null
          p25?: number | null
          p50?: number | null
          p75?: number | null
          p90?: number | null
          period_start: string
          period_type: string
          quality_summary?: Json | null
          stddev?: number | null
        }
        Update: {
          cohort_id?: string
          computed_at?: string
          excluded_count?: number | null
          excluded_high_latency?: number | null
          excluded_low_completeness?: number | null
          excluded_low_consistency?: number | null
          id?: string
          included_count?: number | null
          mean?: number | null
          metric_id?: string
          n_orgs?: number
          p10?: number | null
          p25?: number | null
          p50?: number | null
          p75?: number | null
          p90?: number | null
          period_start?: string
          period_type?: string
          quality_summary?: Json | null
          stddev?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_snapshots_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "benchmark_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benchmark_snapshots_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
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
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_analytics_connectors: {
        Row: {
          allowed_resources: string[] | null
          cadence: Database["public"]["Enums"]["bulk_cadence"]
          clinic_identifier: string | null
          connector_type: string
          created_at: string
          delivery_method: Database["public"]["Enums"]["bulk_delivery_method"]
          delivery_mode: string | null
          expected_schema_version: string
          id: string
          ingestion_mode: string | null
          is_sandbox: boolean
          last_error: string | null
          last_processed_at: string | null
          last_received_at: string | null
          locked_account_guid: string | null
          organization_id: string
          prohibited_fields: string[] | null
          s3_bucket: string | null
          s3_external_id: string | null
          s3_prefix: string | null
          s3_region: string | null
          s3_role_arn: string | null
          source_system: Database["public"]["Enums"]["bulk_source_system"]
          status: Database["public"]["Enums"]["bulk_connector_status"]
          updated_at: string
        }
        Insert: {
          allowed_resources?: string[] | null
          cadence?: Database["public"]["Enums"]["bulk_cadence"]
          clinic_identifier?: string | null
          connector_type?: string
          created_at?: string
          delivery_method?: Database["public"]["Enums"]["bulk_delivery_method"]
          delivery_mode?: string | null
          expected_schema_version?: string
          id?: string
          ingestion_mode?: string | null
          is_sandbox?: boolean
          last_error?: string | null
          last_processed_at?: string | null
          last_received_at?: string | null
          locked_account_guid?: string | null
          organization_id: string
          prohibited_fields?: string[] | null
          s3_bucket?: string | null
          s3_external_id?: string | null
          s3_prefix?: string | null
          s3_region?: string | null
          s3_role_arn?: string | null
          source_system: Database["public"]["Enums"]["bulk_source_system"]
          status?: Database["public"]["Enums"]["bulk_connector_status"]
          updated_at?: string
        }
        Update: {
          allowed_resources?: string[] | null
          cadence?: Database["public"]["Enums"]["bulk_cadence"]
          clinic_identifier?: string | null
          connector_type?: string
          created_at?: string
          delivery_method?: Database["public"]["Enums"]["bulk_delivery_method"]
          delivery_mode?: string | null
          expected_schema_version?: string
          id?: string
          ingestion_mode?: string | null
          is_sandbox?: boolean
          last_error?: string | null
          last_processed_at?: string | null
          last_received_at?: string | null
          locked_account_guid?: string | null
          organization_id?: string
          prohibited_fields?: string[] | null
          s3_bucket?: string | null
          s3_external_id?: string | null
          s3_prefix?: string | null
          s3_region?: string | null
          s3_role_arn?: string | null
          source_system?: Database["public"]["Enums"]["bulk_source_system"]
          status?: Database["public"]["Enums"]["bulk_connector_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_analytics_connectors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_analytics_connectors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      clarity_activity: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          user_id: string
          vto_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          user_id: string
          vto_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          user_id?: string
          vto_id?: string
        }
        Relationships: []
      }
      clarity_vto: {
        Row: {
          created_at: string
          id: string
          metrics: Json
          organization_id: string
          traction: Json
          updated_at: string
          version_current: number
          vision: Json
        }
        Insert: {
          created_at?: string
          id?: string
          metrics?: Json
          organization_id: string
          traction?: Json
          updated_at?: string
          version_current?: number
          vision?: Json
        }
        Update: {
          created_at?: string
          id?: string
          metrics?: Json
          organization_id?: string
          traction?: Json
          updated_at?: string
          version_current?: number
          vision?: Json
        }
        Relationships: []
      }
      core_value_shoutouts: {
        Row: {
          core_value_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          meeting_id: string | null
          note: string | null
          organization_id: string
          recognized_user_id: string | null
        }
        Insert: {
          core_value_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          meeting_id?: string | null
          note?: string | null
          organization_id: string
          recognized_user_id?: string | null
        }
        Update: {
          core_value_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          meeting_id?: string | null
          note?: string | null
          organization_id?: string
          recognized_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_value_shoutouts_core_value_id_fkey"
            columns: ["core_value_id"]
            isOneToOne: false
            referencedRelation: "org_core_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_value_shoutouts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_value_shoutouts_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_value_shoutouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_value_shoutouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_value_shoutouts_recognized_user_id_fkey"
            columns: ["recognized_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      core_value_spotlight: {
        Row: {
          created_at: string | null
          current_core_value_id: string | null
          id: string
          last_rotated_at: string | null
          organization_id: string
          rotates_on_weekday: number | null
          rotation_mode: string
        }
        Insert: {
          created_at?: string | null
          current_core_value_id?: string | null
          id?: string
          last_rotated_at?: string | null
          organization_id: string
          rotates_on_weekday?: number | null
          rotation_mode?: string
        }
        Update: {
          created_at?: string | null
          current_core_value_id?: string | null
          id?: string
          last_rotated_at?: string | null
          organization_id?: string
          rotates_on_weekday?: number | null
          rotation_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_value_spotlight_current_core_value_id_fkey"
            columns: ["current_core_value_id"]
            isOneToOne: false
            referencedRelation: "org_core_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_value_spotlight_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_value_spotlight_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
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
      core_values_ack: {
        Row: {
          acknowledged_at: string | null
          id: string
          organization_id: string
          user_id: string
          version_hash: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          id?: string
          organization_id: string
          user_id: string
          version_hash?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          id?: string
          organization_id?: string
          user_id?: string
          version_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_values_ack_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_values_ack_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_values_ack_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      data_access_audit: {
        Row: {
          access_request_id: string | null
          accessed_at: string
          action: string
          id: string
          ip_address: string | null
          justification: string | null
          organization_id: string
          resource_type: string
          row_count: number | null
          user_agent: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          access_request_id?: string | null
          accessed_at?: string
          action: string
          id?: string
          ip_address?: string | null
          justification?: string | null
          organization_id: string
          resource_type: string
          row_count?: number | null
          user_agent?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          access_request_id?: string | null
          accessed_at?: string
          action?: string
          id?: string
          ip_address?: string | null
          justification?: string | null
          organization_id?: string
          resource_type?: string
          row_count?: number | null
          user_agent?: string | null
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_access_audit_access_request_id_fkey"
            columns: ["access_request_id"]
            isOneToOne: false
            referencedRelation: "data_access_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_access_audit_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_access_audit_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      data_access_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          expires_at: string
          id: string
          justification: string
          organization_id: string
          requested_at: string
          resource_type: string
          status: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          expires_at: string
          id?: string
          justification: string
          organization_id: string
          requested_at?: string
          resource_type: string
          status?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          justification?: string
          organization_id?: string
          requested_at?: string
          resource_type?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_access_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_access_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      data_deletion_requests: {
        Row: {
          created_at: string
          date_range_end: string | null
          date_range_start: string | null
          executed_at: string | null
          id: string
          justification: string
          organization_id: string
          records_deleted: number | null
          requested_by: string
          resource_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          executed_at?: string | null
          id?: string
          justification: string
          organization_id: string
          records_deleted?: number | null
          requested_by: string
          resource_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          executed_at?: string | null
          id?: string
          justification?: string
          organization_id?: string
          records_deleted?: number | null
          requested_by?: string
          resource_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_deletion_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_deletion_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      data_ingestion_ledger: {
        Row: {
          account_guid_verified: boolean | null
          checksum: string | null
          connector_id: string | null
          created_at: string
          data_minimization_applied: boolean | null
          environment: string
          fields_quarantined: number
          file_date: string | null
          file_name: string | null
          id: string
          organization_id: string
          processing_duration_ms: number | null
          rejection_reason: string | null
          resource_type: string
          rows_dropped: number | null
          rows_ingested: number
          rows_received: number
          source_system: string
          status: string
          timestamp: string
        }
        Insert: {
          account_guid_verified?: boolean | null
          checksum?: string | null
          connector_id?: string | null
          created_at?: string
          data_minimization_applied?: boolean | null
          environment?: string
          fields_quarantined?: number
          file_date?: string | null
          file_name?: string | null
          id?: string
          organization_id: string
          processing_duration_ms?: number | null
          rejection_reason?: string | null
          resource_type: string
          rows_dropped?: number | null
          rows_ingested?: number
          rows_received?: number
          source_system?: string
          status: string
          timestamp?: string
        }
        Update: {
          account_guid_verified?: boolean | null
          checksum?: string | null
          connector_id?: string | null
          created_at?: string
          data_minimization_applied?: boolean | null
          environment?: string
          fields_quarantined?: number
          file_date?: string | null
          file_name?: string | null
          id?: string
          organization_id?: string
          processing_duration_ms?: number | null
          rejection_reason?: string | null
          resource_type?: string
          rows_dropped?: number | null
          rows_ingested?: number
          rows_received?: number
          source_system?: string
          status?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ledger_connector"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "bulk_analytics_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ledger_org"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ledger_org"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      data_purge_log: {
        Row: {
          error_message: string | null
          executed_at: string
          execution_duration_ms: number | null
          id: string
          newest_record_date: string | null
          oldest_record_date: string | null
          organization_id: string
          purge_type: string
          records_purged: number
          requested_by: string | null
          resource_type: string
          retention_days_applied: number
          status: string
        }
        Insert: {
          error_message?: string | null
          executed_at?: string
          execution_duration_ms?: number | null
          id?: string
          newest_record_date?: string | null
          oldest_record_date?: string | null
          organization_id: string
          purge_type?: string
          records_purged?: number
          requested_by?: string | null
          resource_type: string
          retention_days_applied: number
          status?: string
        }
        Update: {
          error_message?: string | null
          executed_at?: string
          execution_duration_ms?: number | null
          id?: string
          newest_record_date?: string | null
          oldest_record_date?: string | null
          organization_id?: string
          purge_type?: string
          records_purged?: number
          requested_by?: string | null
          resource_type?: string
          retention_days_applied?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_purge_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_purge_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      data_retention_policies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_purgeable: boolean
          organization_id: string | null
          resource_type: string
          retention_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_purgeable?: boolean
          organization_id?: string | null
          resource_type: string
          retention_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_purgeable?: boolean
          organization_id?: string | null
          resource_type?: string
          retention_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_retention_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_retention_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_provision: {
        Row: {
          created_at: string
          id: string
          last_seed_at: string | null
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seed_at?: string | null
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seed_at?: string | null
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_provision_team_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_provision_team_id_fkey"
            columns: ["organization_id"]
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
      doc_sections: {
        Row: {
          created_at: string
          doc_id: string
          embedding: string | null
          heading_path: string
          id: string
          organization_id: string
          section_body: string
          section_order: number
          section_slug: string
          section_title: string
          section_type: string
          source: string
          token_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          doc_id: string
          embedding?: string | null
          heading_path?: string
          id?: string
          organization_id: string
          section_body?: string
          section_order?: number
          section_slug?: string
          section_title?: string
          section_type?: string
          source: string
          token_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          doc_id?: string
          embedding?: string | null
          heading_path?: string
          id?: string
          organization_id?: string
          section_body?: string
          section_order?: number
          section_slug?: string
          section_title?: string
          section_type?: string
          source?: string
          token_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_sections_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "docs"
            referencedColumns: ["id"]
          },
        ]
      }
      docs: {
        Row: {
          body: string | null
          content_hash: string | null
          content_version: number | null
          created_at: string
          description: string | null
          extract_error: string | null
          extract_source: string | null
          extract_status: string | null
          extracted_at: string | null
          file_type: string | null
          file_url: string | null
          filename: string | null
          id: string
          kind: Database["public"]["Enums"]["doc_kind"]
          mime_type: string | null
          organization_id: string
          owner_id: string | null
          parsed_text: string | null
          requires_ack: boolean
          status: Database["public"]["Enums"]["doc_status"]
          storage_path: string | null
          title: string
          updated_at: string
          version: number
          word_count: number | null
        }
        Insert: {
          body?: string | null
          content_hash?: string | null
          content_version?: number | null
          created_at?: string
          description?: string | null
          extract_error?: string | null
          extract_source?: string | null
          extract_status?: string | null
          extracted_at?: string | null
          file_type?: string | null
          file_url?: string | null
          filename?: string | null
          id?: string
          kind: Database["public"]["Enums"]["doc_kind"]
          mime_type?: string | null
          organization_id: string
          owner_id?: string | null
          parsed_text?: string | null
          requires_ack?: boolean
          status?: Database["public"]["Enums"]["doc_status"]
          storage_path?: string | null
          title: string
          updated_at?: string
          version?: number
          word_count?: number | null
        }
        Update: {
          body?: string | null
          content_hash?: string | null
          content_version?: number | null
          created_at?: string
          description?: string | null
          extract_error?: string | null
          extract_source?: string | null
          extract_status?: string | null
          extracted_at?: string | null
          file_type?: string | null
          file_url?: string | null
          filename?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["doc_kind"]
          mime_type?: string | null
          organization_id?: string
          owner_id?: string | null
          parsed_text?: string | null
          requires_ack?: boolean
          status?: Database["public"]["Enums"]["doc_status"]
          storage_path?: string | null
          title?: string
          updated_at?: string
          version?: number
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "docs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      emr_comparison_snapshots: {
        Row: {
          calculated_at: string
          delta_vs_jane: number | null
          delta_vs_non_jane: number | null
          id: string
          jane_cohort_median: number | null
          jane_cohort_percentile_position: number | null
          metric_key: string
          non_jane_cohort_median: number | null
          non_jane_cohort_percentile_position: number | null
          org_normalized_value: number
          org_value: number
          organization_id: string
          period_key: string
        }
        Insert: {
          calculated_at?: string
          delta_vs_jane?: number | null
          delta_vs_non_jane?: number | null
          id?: string
          jane_cohort_median?: number | null
          jane_cohort_percentile_position?: number | null
          metric_key: string
          non_jane_cohort_median?: number | null
          non_jane_cohort_percentile_position?: number | null
          org_normalized_value: number
          org_value: number
          organization_id: string
          period_key: string
        }
        Update: {
          calculated_at?: string
          delta_vs_jane?: number | null
          delta_vs_non_jane?: number | null
          id?: string
          jane_cohort_median?: number | null
          jane_cohort_percentile_position?: number | null
          metric_key?: string
          non_jane_cohort_median?: number | null
          non_jane_cohort_percentile_position?: number | null
          org_normalized_value?: number
          org_value?: number
          organization_id?: string
          period_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "emr_comparison_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emr_comparison_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      emr_data_quality_scores: {
        Row: {
          audit_pass_rate: number | null
          avg_reporting_delay_hours: number | null
          calculated_at: string
          completeness_score: number
          consistency_score: number
          id: string
          latency_score: number
          missing_fields_count: number
          organization_id: string
          overall_score: number
          period_key: string
        }
        Insert: {
          audit_pass_rate?: number | null
          avg_reporting_delay_hours?: number | null
          calculated_at?: string
          completeness_score?: number
          consistency_score?: number
          id?: string
          latency_score?: number
          missing_fields_count?: number
          organization_id: string
          overall_score?: number
          period_key: string
        }
        Update: {
          audit_pass_rate?: number | null
          avg_reporting_delay_hours?: number | null
          calculated_at?: string
          completeness_score?: number
          consistency_score?: number
          id?: string
          latency_score?: number
          missing_fields_count?: number
          organization_id?: string
          overall_score?: number
          period_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "emr_data_quality_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emr_data_quality_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      file_ingest_log: {
        Row: {
          account_guid: string | null
          checksum: string
          consecutive_failures: number | null
          created_at: string
          error: string | null
          file_date: string | null
          file_name: string
          id: string
          organization_id: string | null
          quarantine_reason: string | null
          quarantined: boolean | null
          resource_name: string | null
          rows: number
          s3_bucket: string | null
          s3_key: string | null
          source_system: string | null
          status: Database["public"]["Enums"]["ingest_status"]
        }
        Insert: {
          account_guid?: string | null
          checksum: string
          consecutive_failures?: number | null
          created_at?: string
          error?: string | null
          file_date?: string | null
          file_name: string
          id?: string
          organization_id?: string | null
          quarantine_reason?: string | null
          quarantined?: boolean | null
          resource_name?: string | null
          rows?: number
          s3_bucket?: string | null
          s3_key?: string | null
          source_system?: string | null
          status?: Database["public"]["Enums"]["ingest_status"]
        }
        Update: {
          account_guid?: string | null
          checksum?: string
          consecutive_failures?: number | null
          created_at?: string
          error?: string | null
          file_date?: string | null
          file_name?: string
          id?: string
          organization_id?: string | null
          quarantine_reason?: string | null
          quarantined?: boolean | null
          resource_name?: string | null
          rows?: number
          s3_bucket?: string | null
          s3_key?: string | null
          source_system?: string | null
          status?: Database["public"]["Enums"]["ingest_status"]
        }
        Relationships: [
          {
            foreignKeyName: "file_ingest_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_ingest_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      file_rejection_log: {
        Row: {
          connector_id: string
          expected_account_guid: string | null
          file_checksum: string | null
          file_name: string
          id: string
          organization_id: string
          received_account_guid: string | null
          rejected_at: string
          rejection_reason: string
        }
        Insert: {
          connector_id: string
          expected_account_guid?: string | null
          file_checksum?: string | null
          file_name: string
          id?: string
          organization_id: string
          received_account_guid?: string | null
          rejected_at?: string
          rejection_reason: string
        }
        Update: {
          connector_id?: string
          expected_account_guid?: string | null
          file_checksum?: string | null
          file_name?: string
          id?: string
          organization_id?: string
          received_account_guid?: string | null
          rejected_at?: string
          rejection_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_rejection_connector"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "bulk_analytics_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_rejection_org"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_rejection_org"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      gwc_assessments: {
        Row: {
          action_items: string | null
          assessed_by: string
          assessment_date: string
          assessment_type: Database["public"]["Enums"]["assessment_type"]
          capacity_notes: string | null
          capacity_rating: Database["public"]["Enums"]["gwc_rating"] | null
          created_at: string
          gets_it_notes: string | null
          gets_it_rating: Database["public"]["Enums"]["gwc_rating"] | null
          id: string
          next_review_date: string | null
          overall_notes: string | null
          quarter: string
          status: Database["public"]["Enums"]["assessment_status"]
          updated_at: string
          user_id: string
          wants_it_notes: string | null
          wants_it_rating: Database["public"]["Enums"]["gwc_rating"] | null
        }
        Insert: {
          action_items?: string | null
          assessed_by: string
          assessment_date?: string
          assessment_type?: Database["public"]["Enums"]["assessment_type"]
          capacity_notes?: string | null
          capacity_rating?: Database["public"]["Enums"]["gwc_rating"] | null
          created_at?: string
          gets_it_notes?: string | null
          gets_it_rating?: Database["public"]["Enums"]["gwc_rating"] | null
          id?: string
          next_review_date?: string | null
          overall_notes?: string | null
          quarter: string
          status?: Database["public"]["Enums"]["assessment_status"]
          updated_at?: string
          user_id: string
          wants_it_notes?: string | null
          wants_it_rating?: Database["public"]["Enums"]["gwc_rating"] | null
        }
        Update: {
          action_items?: string | null
          assessed_by?: string
          assessment_date?: string
          assessment_type?: Database["public"]["Enums"]["assessment_type"]
          capacity_notes?: string | null
          capacity_rating?: Database["public"]["Enums"]["gwc_rating"] | null
          created_at?: string
          gets_it_notes?: string | null
          gets_it_rating?: Database["public"]["Enums"]["gwc_rating"] | null
          id?: string
          next_review_date?: string | null
          overall_notes?: string | null
          quarter?: string
          status?: Database["public"]["Enums"]["assessment_status"]
          updated_at?: string
          user_id?: string
          wants_it_notes?: string | null
          wants_it_rating?: Database["public"]["Enums"]["gwc_rating"] | null
        }
        Relationships: [
          {
            foreignKeyName: "gwc_assessments_assessed_by_fkey"
            columns: ["assessed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gwc_assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      help_dismissed: {
        Row: {
          dismissed: boolean | null
          dismissed_at: string | null
          id: string
          organization_id: string
          term: string
          user_id: string
        }
        Insert: {
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          organization_id: string
          term: string
          user_id: string
        }
        Update: {
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          organization_id?: string
          term?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_dismissed_team_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_dismissed_team_id_fkey"
            columns: ["organization_id"]
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
          organization_id: string
          term: string
          user_id: string | null
        }
        Insert: {
          action: string
          context?: string | null
          created_at?: string | null
          id?: string
          organization_id: string
          term: string
          user_id?: string | null
        }
        Update: {
          action?: string
          context?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string
          term?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_events_team_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_events_team_id_fkey"
            columns: ["organization_id"]
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
      hidden_jane_resources: {
        Row: {
          created_at: string
          hidden_by: string | null
          id: string
          organization_id: string
          resource_key: string
        }
        Insert: {
          created_at?: string
          hidden_by?: string | null
          id?: string
          organization_id: string
          resource_key: string
        }
        Update: {
          created_at?: string
          hidden_by?: string | null
          id?: string
          organization_id?: string
          resource_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_jane_resources_hidden_by_fkey"
            columns: ["hidden_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidden_jane_resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidden_jane_resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
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
      intervention_emr_analysis: {
        Row: {
          avg_improvement_percent: number | null
          avg_resolution_days: number | null
          emr_source_group: string
          generated_at: string
          id: string
          intervention_type: string
          period_key: string
          recurrence_rate: number | null
          sample_size: number
          success_rate: number | null
          successful_interventions: number
          total_interventions: number
        }
        Insert: {
          avg_improvement_percent?: number | null
          avg_resolution_days?: number | null
          emr_source_group: string
          generated_at?: string
          id?: string
          intervention_type: string
          period_key: string
          recurrence_rate?: number | null
          sample_size?: number
          success_rate?: number | null
          successful_interventions?: number
          total_interventions?: number
        }
        Update: {
          avg_improvement_percent?: number | null
          avg_resolution_days?: number | null
          emr_source_group?: string
          generated_at?: string
          id?: string
          intervention_type?: string
          period_key?: string
          recurrence_rate?: number | null
          sample_size?: number
          success_rate?: number | null
          successful_interventions?: number
          total_interventions?: number
        }
        Relationships: []
      }
      intervention_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          details: Json
          event_type: string
          id: string
          intervention_id: string
          organization_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          intervention_id: string
          organization_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          intervention_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_events_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_metric_links: {
        Row: {
          baseline_capture_method: string | null
          baseline_captured_at: string | null
          baseline_definition_version: string | null
          baseline_override_justification: string | null
          baseline_period_start: string | null
          baseline_period_type: string
          baseline_quality_flag: string | null
          baseline_source: string | null
          baseline_value: number | null
          created_at: string
          expected_direction: Database["public"]["Enums"]["expected_direction"]
          expected_magnitude_percent: number | null
          id: string
          intervention_id: string
          metric_id: string
        }
        Insert: {
          baseline_capture_method?: string | null
          baseline_captured_at?: string | null
          baseline_definition_version?: string | null
          baseline_override_justification?: string | null
          baseline_period_start?: string | null
          baseline_period_type?: string
          baseline_quality_flag?: string | null
          baseline_source?: string | null
          baseline_value?: number | null
          created_at?: string
          expected_direction?: Database["public"]["Enums"]["expected_direction"]
          expected_magnitude_percent?: number | null
          id?: string
          intervention_id: string
          metric_id: string
        }
        Update: {
          baseline_capture_method?: string | null
          baseline_captured_at?: string | null
          baseline_definition_version?: string | null
          baseline_override_justification?: string | null
          baseline_period_start?: string | null
          baseline_period_type?: string
          baseline_quality_flag?: string | null
          baseline_source?: string | null
          baseline_value?: number | null
          created_at?: string
          expected_direction?: Database["public"]["Enums"]["expected_direction"]
          expected_magnitude_percent?: number | null
          id?: string
          intervention_id?: string
          metric_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_metric_links_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_metric_links_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_outcomes: {
        Row: {
          actual_delta_percent: number | null
          actual_delta_value: number | null
          ai_meta: Json | null
          ai_summary: string | null
          baseline_result_id: string | null
          computed_at: string
          confidence_score: number
          current_result_id: string | null
          evaluated_at: string
          evaluation_period_end: string
          evaluation_period_start: string
          evaluator_version: string
          id: string
          intervention_id: string
          metric_id: string
        }
        Insert: {
          actual_delta_percent?: number | null
          actual_delta_value?: number | null
          ai_meta?: Json | null
          ai_summary?: string | null
          baseline_result_id?: string | null
          computed_at?: string
          confidence_score?: number
          current_result_id?: string | null
          evaluated_at?: string
          evaluation_period_end: string
          evaluation_period_start: string
          evaluator_version?: string
          id?: string
          intervention_id: string
          metric_id: string
        }
        Update: {
          actual_delta_percent?: number | null
          actual_delta_value?: number | null
          ai_meta?: Json | null
          ai_summary?: string | null
          baseline_result_id?: string | null
          computed_at?: string
          confidence_score?: number
          current_result_id?: string | null
          evaluated_at?: string
          evaluation_period_end?: string
          evaluation_period_start?: string
          evaluator_version?: string
          id?: string
          intervention_id?: string
          metric_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_outcomes_baseline_result_id_fkey"
            columns: ["baseline_result_id"]
            isOneToOne: false
            referencedRelation: "metric_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_outcomes_current_result_id_fkey"
            columns: ["current_result_id"]
            isOneToOne: false
            referencedRelation: "metric_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_outcomes_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_outcomes_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_recommendations: {
        Row: {
          accepted: boolean | null
          accepted_at: string | null
          accepted_by: string | null
          accepted_intervention_id: string | null
          confidence_score: number
          created_at: string | null
          deviation_at_generation: number | null
          dismissed: boolean | null
          dismissed_at: string | null
          dismissed_by: string | null
          dismissed_reason: string | null
          evidence_summary: string | null
          expires_at: string | null
          generated_at: string | null
          id: string
          last_generated_at: string | null
          metric_id: string
          model_version: string
          organization_id: string
          period_key: string
          recommendation_reason: Json
          recommendation_run_id: string | null
          recommended_intervention_template: Json
          recommended_template_id: string | null
        }
        Insert: {
          accepted?: boolean | null
          accepted_at?: string | null
          accepted_by?: string | null
          accepted_intervention_id?: string | null
          confidence_score: number
          created_at?: string | null
          deviation_at_generation?: number | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          dismissed_reason?: string | null
          evidence_summary?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          last_generated_at?: string | null
          metric_id: string
          model_version?: string
          organization_id: string
          period_key: string
          recommendation_reason?: Json
          recommendation_run_id?: string | null
          recommended_intervention_template: Json
          recommended_template_id?: string | null
        }
        Update: {
          accepted?: boolean | null
          accepted_at?: string | null
          accepted_by?: string | null
          accepted_intervention_id?: string | null
          confidence_score?: number
          created_at?: string | null
          deviation_at_generation?: number | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          dismissed_reason?: string | null
          evidence_summary?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          last_generated_at?: string | null
          metric_id?: string
          model_version?: string
          organization_id?: string
          period_key?: string
          recommendation_reason?: Json
          recommendation_run_id?: string | null
          recommended_intervention_template?: Json
          recommended_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_recommendations_accepted_intervention_id_fkey"
            columns: ["accepted_intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_recommendations_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_recommendations_recommendation_run_id_fkey"
            columns: ["recommendation_run_id"]
            isOneToOne: false
            referencedRelation: "recommendation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_recommendations_recommended_template_id_fkey"
            columns: ["recommended_template_id"]
            isOneToOne: false
            referencedRelation: "intervention_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_templates: {
        Row: {
          average_historical_success_rate: number | null
          common_actions: Json | null
          created_at: string | null
          created_from_intervention_ids: string[] | null
          historical_sample_size: number | null
          id: string
          intervention_type: Database["public"]["Enums"]["intervention_type"]
          is_active: boolean | null
          metric_category: string | null
          organization_id: string
          required_roles: Json | null
          template_description: string | null
          template_name: string
          typical_duration_days: number | null
          updated_at: string | null
        }
        Insert: {
          average_historical_success_rate?: number | null
          common_actions?: Json | null
          created_at?: string | null
          created_from_intervention_ids?: string[] | null
          historical_sample_size?: number | null
          id?: string
          intervention_type?: Database["public"]["Enums"]["intervention_type"]
          is_active?: boolean | null
          metric_category?: string | null
          organization_id: string
          required_roles?: Json | null
          template_description?: string | null
          template_name: string
          typical_duration_days?: number | null
          updated_at?: string | null
        }
        Update: {
          average_historical_success_rate?: number | null
          common_actions?: Json | null
          created_at?: string | null
          created_from_intervention_ids?: string[] | null
          historical_sample_size?: number | null
          id?: string
          intervention_type?: Database["public"]["Enums"]["intervention_type"]
          is_active?: boolean | null
          metric_category?: string | null
          organization_id?: string
          required_roles?: Json | null
          template_description?: string | null
          template_name?: string
          typical_duration_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_types: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_enabled: boolean
          is_sensitive: boolean
          organization_id: string | null
          requires_approval: boolean
          type_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_enabled?: boolean
          is_sensitive?: boolean
          organization_id?: string | null
          requires_approval?: boolean
          type_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_enabled?: boolean
          is_sensitive?: boolean
          organization_id?: string | null
          requires_approval?: boolean
          type_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          actual_cost: number | null
          actual_hours: number | null
          ai_summary: string | null
          confidence_level: number
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          estimated_cost: number | null
          estimated_hours: number | null
          expected_time_horizon_days: number
          id: string
          intervention_type: Database["public"]["Enums"]["intervention_type"]
          organization_id: string
          origin_id: string | null
          origin_type: Database["public"]["Enums"]["intervention_origin_type"]
          owner_user_id: string | null
          roi_notes: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["intervention_status"]
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          actual_hours?: number | null
          ai_summary?: string | null
          confidence_level?: number
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          expected_time_horizon_days?: number
          id?: string
          intervention_type?: Database["public"]["Enums"]["intervention_type"]
          organization_id: string
          origin_id?: string | null
          origin_type?: Database["public"]["Enums"]["intervention_origin_type"]
          owner_user_id?: string | null
          roi_notes?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["intervention_status"]
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          actual_hours?: number | null
          ai_summary?: string | null
          confidence_level?: number
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          expected_time_horizon_days?: number
          id?: string
          intervention_type?: Database["public"]["Enums"]["intervention_type"]
          organization_id?: string
          origin_id?: string | null
          origin_type?: Database["public"]["Enums"]["intervention_origin_type"]
          owner_user_id?: string | null
          roi_notes?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["intervention_status"]
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_resolution_events: {
        Row: {
          created_at: string
          created_by: string
          event_type: string
          id: string
          issue_id: string
          linked_intervention_id: string | null
          note: string | null
          organization_id: string
          resolution_type: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          event_type: string
          id?: string
          issue_id: string
          linked_intervention_id?: string | null
          note?: string | null
          organization_id: string
          resolution_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          event_type?: string
          id?: string
          issue_id?: string
          linked_intervention_id?: string | null
          note?: string | null
          organization_id?: string
          resolution_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issue_resolution_events_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_resolution_events_linked_intervention_id_fkey"
            columns: ["linked_intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_resolution_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_resolution_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_suggestions: {
        Row: {
          ai_analysis: Json | null
          context: string | null
          created_at: string
          created_issue_id: string | null
          dismissed_by: string | null
          dismissed_reason: string | null
          expires_at: string | null
          id: string
          metric_id: string
          organization_id: string
          priority: number
          status: string
          suggestion_type: string
          title: string
          updated_at: string
          weeks_off_track: number
        }
        Insert: {
          ai_analysis?: Json | null
          context?: string | null
          created_at?: string
          created_issue_id?: string | null
          dismissed_by?: string | null
          dismissed_reason?: string | null
          expires_at?: string | null
          id?: string
          metric_id: string
          organization_id: string
          priority?: number
          status?: string
          suggestion_type?: string
          title: string
          updated_at?: string
          weeks_off_track?: number
        }
        Update: {
          ai_analysis?: Json | null
          context?: string | null
          created_at?: string
          created_issue_id?: string | null
          dismissed_by?: string | null
          dismissed_reason?: string | null
          expires_at?: string | null
          id?: string
          metric_id?: string
          organization_id?: string
          priority?: number
          status?: string
          suggestion_type?: string
          title?: string
          updated_at?: string
          weeks_off_track?: number
        }
        Relationships: [
          {
            foreignKeyName: "issue_suggestions_created_issue_id_fkey"
            columns: ["created_issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_suggestions_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_suggestions_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          context: string | null
          created_at: string
          created_from: string | null
          id: string
          intervention_id: string | null
          linked_intervention_id: string | null
          meeting_horizon: string | null
          meeting_id: string | null
          meeting_item_id: string | null
          metric_id: string | null
          organization_id: string
          owner_id: string | null
          period_key: string | null
          priority: number
          recurrence_count: number | null
          resolution_note: string | null
          resolution_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          rock_id: string | null
          solved_at: string | null
          status: Database["public"]["Enums"]["issue_status"]
          title: string
          updated_at: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          created_from?: string | null
          id?: string
          intervention_id?: string | null
          linked_intervention_id?: string | null
          meeting_horizon?: string | null
          meeting_id?: string | null
          meeting_item_id?: string | null
          metric_id?: string | null
          organization_id: string
          owner_id?: string | null
          period_key?: string | null
          priority?: number
          recurrence_count?: number | null
          resolution_note?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rock_id?: string | null
          solved_at?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          title: string
          updated_at?: string
        }
        Update: {
          context?: string | null
          created_at?: string
          created_from?: string | null
          id?: string
          intervention_id?: string | null
          linked_intervention_id?: string | null
          meeting_horizon?: string | null
          meeting_id?: string | null
          meeting_item_id?: string | null
          metric_id?: string | null
          organization_id?: string
          owner_id?: string | null
          period_key?: string | null
          priority?: number
          recurrence_count?: number | null
          resolution_note?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rock_id?: string | null
          solved_at?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_linked_intervention_id_fkey"
            columns: ["linked_intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_meeting_item_id_fkey"
            columns: ["meeting_item_id"]
            isOneToOne: false
            referencedRelation: "meeting_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_rock_id_fkey"
            columns: ["rock_id"]
            isOneToOne: false
            referencedRelation: "rocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_team_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_team_id_fkey"
            columns: ["organization_id"]
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
          organization_id: string
          status: string | null
          sync_mode: string | null
          sync_scope: string[] | null
          updated_at: string | null
        }
        Insert: {
          api_key: string
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          last_sync?: string | null
          next_sync?: string | null
          organization_id: string
          status?: string | null
          sync_mode?: string | null
          sync_scope?: string[] | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          last_sync?: string | null
          next_sync?: string | null
          organization_id?: string
          status?: string | null
          sync_mode?: string | null
          sync_scope?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jane_integrations_team_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jane_integrations_team_id_fkey"
            columns: ["organization_id"]
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
      legacy_monthly_reports: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          payload: Json
          period_key: string
          source_file_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          payload: Json
          period_key: string
          source_file_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          payload?: Json
          period_key?: string
          source_file_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legacy_monthly_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legacy_monthly_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_commitments: {
        Row: {
          assigned_to: string | null
          commitment_type: string
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          label: string
          linked_intervention_id: string | null
          meeting_id: string
          organization_id: string
        }
        Insert: {
          assigned_to?: string | null
          commitment_type: string
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          label: string
          linked_intervention_id?: string | null
          meeting_id: string
          organization_id: string
        }
        Update: {
          assigned_to?: string | null
          commitment_type?: string
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          label?: string
          linked_intervention_id?: string | null
          meeting_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_commitments_linked_intervention_id_fkey"
            columns: ["linked_intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_commitments_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_commitments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_commitments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_items: {
        Row: {
          created_at: string
          created_issue_id: string | null
          description: string | null
          discussed: boolean
          discussed_at: string | null
          id: string
          is_deleted: boolean
          item_type: string
          meeting_id: string
          organization_id: string
          section: string
          sort_order: number
          source_ref_id: string | null
          source_ref_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_issue_id?: string | null
          description?: string | null
          discussed?: boolean
          discussed_at?: string | null
          id?: string
          is_deleted?: boolean
          item_type: string
          meeting_id: string
          organization_id: string
          section: string
          sort_order?: number
          source_ref_id?: string | null
          source_ref_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_issue_id?: string | null
          description?: string | null
          discussed?: boolean
          discussed_at?: string | null
          id?: string
          is_deleted?: boolean
          item_type?: string
          meeting_id?: string
          organization_id?: string
          section?: string
          sort_order?: number
          source_ref_id?: string | null
          source_ref_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_items_created_issue_id_fkey"
            columns: ["created_issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_items_organization_id_fkey"
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
          agenda_generated: boolean
          created_at: string
          created_by: string | null
          duration_minutes: number
          ended_at: string | null
          id: string
          level10_score: number | null
          organization_id: string
          outcome_headline: string | null
          outcome_notes: string | null
          scheduled_for: string
          started_at: string | null
          status: string
          title: string | null
          type: Database["public"]["Enums"]["meeting_type"]
        }
        Insert: {
          agenda_generated?: boolean
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          level10_score?: number | null
          organization_id: string
          outcome_headline?: string | null
          outcome_notes?: string | null
          scheduled_for: string
          started_at?: string | null
          status?: string
          title?: string | null
          type: Database["public"]["Enums"]["meeting_type"]
        }
        Update: {
          agenda_generated?: boolean
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          level10_score?: number | null
          organization_id?: string
          outcome_headline?: string | null
          outcome_notes?: string | null
          scheduled_for?: string
          started_at?: string | null
          status?: string
          title?: string | null
          type?: Database["public"]["Enums"]["meeting_type"]
        }
        Relationships: [
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_team_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_team_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          message: string
          metric_id: string
          organization_id: string
          resolved_at: string | null
          resolved_by: string | null
          tip: string | null
          week_of: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          message: string
          metric_id: string
          organization_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          tip?: string | null
          week_of: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          message?: string
          metric_id?: string
          organization_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          tip?: string | null
          week_of?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_alerts_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_breakdowns: {
        Row: {
          created_at: string
          dimension_id: string
          dimension_label: string
          dimension_type: string
          id: string
          import_key: string
          metric_id: string | null
          organization_id: string
          period_end: string | null
          period_key: string
          period_start: string
          period_type: string
          source: string
          value: number
        }
        Insert: {
          created_at?: string
          dimension_id: string
          dimension_label: string
          dimension_type: string
          id?: string
          import_key: string
          metric_id?: string | null
          organization_id: string
          period_end?: string | null
          period_key: string
          period_start: string
          period_type: string
          source?: string
          value?: number
        }
        Update: {
          created_at?: string
          dimension_id?: string
          dimension_label?: string
          dimension_type?: string
          id?: string
          import_key?: string
          metric_id?: string | null
          organization_id?: string
          period_end?: string | null
          period_key?: string
          period_start?: string
          period_type?: string
          source?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "metric_breakdowns_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_breakdowns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_breakdowns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_canonical_results: {
        Row: {
          chosen_metric_result_id: string | null
          chosen_source: string | null
          computed_at: string
          id: string
          metric_id: string
          organization_id: string
          period_start: string
          period_type: string
          selection_meta: Json
          selection_reason: string
          value: number | null
        }
        Insert: {
          chosen_metric_result_id?: string | null
          chosen_source?: string | null
          computed_at?: string
          id?: string
          metric_id: string
          organization_id: string
          period_start: string
          period_type: string
          selection_meta?: Json
          selection_reason: string
          value?: number | null
        }
        Update: {
          chosen_metric_result_id?: string | null
          chosen_source?: string | null
          computed_at?: string
          id?: string
          metric_id?: string
          organization_id?: string
          period_start?: string
          period_type?: string
          selection_meta?: Json
          selection_reason?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metric_canonical_results_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_canonical_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_canonical_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          metric_id: string
          organization_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          metric_id: string
          organization_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          metric_id?: string
          organization_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_comments_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_definitions: {
        Row: {
          canonical_description: string
          canonical_name: string
          created_at: string
          default_period_type: string
          higher_is_better: boolean
          id: string
          metric_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          canonical_description: string
          canonical_name: string
          created_at?: string
          default_period_type: string
          higher_is_better?: boolean
          id?: string
          metric_id: string
          unit: string
          updated_at?: string
        }
        Update: {
          canonical_description?: string
          canonical_name?: string
          created_at?: string
          default_period_type?: string
          higher_is_better?: boolean
          id?: string
          metric_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_definitions_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: true
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_goal_achievements: {
        Row: {
          actual_value: number
          created_at: string | null
          goal_id: string
          id: string
          on_track: boolean
          progress_percentage: number
          week_start: string
        }
        Insert: {
          actual_value: number
          created_at?: string | null
          goal_id: string
          id?: string
          on_track: boolean
          progress_percentage: number
          week_start: string
        }
        Update: {
          actual_value?: number
          created_at?: string | null
          goal_id?: string
          id?: string
          on_track?: boolean
          progress_percentage?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_goal_achievements_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "metric_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_goals: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string
          goal_type: string
          id: string
          metric_id: string
          organization_id: string
          start_date: string
          target_value: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date: string
          goal_type: string
          id?: string
          metric_id: string
          organization_id: string
          start_date: string
          target_value: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string
          goal_type?: string
          id?: string
          metric_id?: string
          organization_id?: string
          start_date?: string
          target_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metric_goals_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_milestones: {
        Row: {
          achieved_at: string | null
          achieved_by: string | null
          celebrated: boolean | null
          created_at: string | null
          id: string
          metric_id: string
          milestone_type: string
          milestone_value: number
          organization_id: string
        }
        Insert: {
          achieved_at?: string | null
          achieved_by?: string | null
          celebrated?: boolean | null
          created_at?: string | null
          id?: string
          metric_id: string
          milestone_type: string
          milestone_value: number
          organization_id: string
        }
        Update: {
          achieved_at?: string | null
          achieved_by?: string | null
          celebrated?: boolean | null
          created_at?: string | null
          id?: string
          metric_id?: string
          milestone_type?: string
          milestone_value?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_milestones_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_normalization_rules: {
        Row: {
          created_at: string
          decimals: number
          denominator_metric_id: string | null
          id: string
          is_default: boolean
          metric_id: string
          multiplier: number
          normalization_type: string
          numerator_metric_id: string | null
          rounding_mode: string
        }
        Insert: {
          created_at?: string
          decimals?: number
          denominator_metric_id?: string | null
          id?: string
          is_default?: boolean
          metric_id: string
          multiplier?: number
          normalization_type: string
          numerator_metric_id?: string | null
          rounding_mode?: string
        }
        Update: {
          created_at?: string
          decimals?: number
          denominator_metric_id?: string | null
          id?: string
          is_default?: boolean
          metric_id?: string
          multiplier?: number
          normalization_type?: string
          numerator_metric_id?: string | null
          rounding_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_normalization_rules_denominator_metric_id_fkey"
            columns: ["denominator_metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_normalization_rules_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_normalization_rules_numerator_metric_id_fkey"
            columns: ["numerator_metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_precedence_overrides: {
        Row: {
          created_at: string
          created_by: string
          id: string
          metric_id: string
          organization_id: string
          period_type: string
          reason: string
          source: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          metric_id: string
          organization_id: string
          period_type: string
          reason: string
          source: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          metric_id?: string
          organization_id?: string
          period_type?: string
          reason?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_precedence_overrides_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_precedence_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_precedence_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_results: {
        Row: {
          created_at: string
          id: string
          metric_id: string
          note: string | null
          overridden_at: string | null
          period_key: string
          period_start: string
          period_type: string
          previous_value: number | null
          raw_row: Json | null
          selection_meta: Json
          source: string | null
          updated_at: string
          value: number | null
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_id: string
          note?: string | null
          overridden_at?: string | null
          period_key: string
          period_start: string
          period_type: string
          previous_value?: number | null
          raw_row?: Json | null
          selection_meta?: Json
          source?: string | null
          updated_at?: string
          value?: number | null
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_id?: string
          note?: string | null
          overridden_at?: string | null
          period_key?: string
          period_start?: string
          period_type?: string
          previous_value?: number | null
          raw_row?: Json | null
          selection_meta?: Json
          source?: string | null
          updated_at?: string
          value?: number | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_results_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_results_audit: {
        Row: {
          changed_at: string
          changed_by: string
          created_at: string
          id: string
          metric_result_id: string
          new_value: number | null
          old_value: number | null
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          created_at?: string
          id?: string
          metric_result_id: string
          new_value?: number | null
          old_value?: number | null
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          created_at?: string
          id?: string
          metric_result_id?: string
          new_value?: number | null
          old_value?: number | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metric_results_audit_metric_result_id_fkey"
            columns: ["metric_result_id"]
            isOneToOne: false
            referencedRelation: "metric_results"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_selection_audit_log: {
        Row: {
          candidate_sources: Json
          chosen: Json
          created_at: string
          created_by: string | null
          id: string
          metric_id: string
          organization_id: string
          period_start: string
          period_type: string
          reason: string
        }
        Insert: {
          candidate_sources: Json
          chosen: Json
          created_at?: string
          created_by?: string | null
          id?: string
          metric_id: string
          organization_id: string
          period_start: string
          period_type: string
          reason: string
        }
        Update: {
          candidate_sources?: Json
          chosen?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          metric_id?: string
          organization_id?: string
          period_start?: string
          period_type?: string
          reason?: string
        }
        Relationships: []
      }
      metric_source_policies: {
        Row: {
          created_at: string
          id: string
          is_allowed: boolean
          metric_id: string
          notes: string | null
          priority: number
          requires_audit_pass: boolean
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_allowed?: boolean
          metric_id: string
          notes?: string | null
          priority?: number
          requires_audit_pass?: boolean
          source: string
        }
        Update: {
          created_at?: string
          id?: string
          is_allowed?: boolean
          metric_id?: string
          notes?: string | null
          priority?: number
          requires_audit_pass?: boolean
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_source_policies_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          aliases: string[] | null
          cadence: string
          category: string
          created_at: string
          direction: string
          display_priority: number | null
          id: string
          import_key: string | null
          is_active: boolean
          is_favorite: boolean | null
          is_locked: boolean
          name: string
          organization_id: string
          owner: string | null
          sync_source: string
          target: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          aliases?: string[] | null
          cadence?: string
          category: string
          created_at?: string
          direction: string
          display_priority?: number | null
          id?: string
          import_key?: string | null
          is_active?: boolean
          is_favorite?: boolean | null
          is_locked?: boolean
          name: string
          organization_id: string
          owner?: string | null
          sync_source?: string
          target?: number | null
          unit: string
          updated_at?: string
        }
        Update: {
          aliases?: string[] | null
          cadence?: string
          category?: string
          created_at?: string
          direction?: string
          display_priority?: number | null
          id?: string
          import_key?: string | null
          is_active?: boolean
          is_favorite?: boolean | null
          is_locked?: boolean
          name?: string
          organization_id?: string
          owner?: string | null
          sync_source?: string
          target?: number | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      monthly_import_profiles: {
        Row: {
          created_at: string | null
          file_fingerprint: string | null
          header_row_index: number
          id: string
          layout_type: string
          mappings: Json
          metric_name_column: string | null
          month_column: string | null
          name: string
          organization_id: string
          sheet_name: string
          updated_at: string | null
          value_column: string | null
        }
        Insert: {
          created_at?: string | null
          file_fingerprint?: string | null
          header_row_index?: number
          id?: string
          layout_type: string
          mappings?: Json
          metric_name_column?: string | null
          month_column?: string | null
          name?: string
          organization_id: string
          sheet_name: string
          updated_at?: string | null
          value_column?: string | null
        }
        Update: {
          created_at?: string | null
          file_fingerprint?: string | null
          header_row_index?: number
          id?: string
          layout_type?: string
          mappings?: Json
          metric_name_column?: string | null
          month_column?: string | null
          name?: string
          organization_id?: string
          sheet_name?: string
          updated_at?: string | null
          value_column?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_import_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_import_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_sessions: {
        Row: {
          completed: boolean | null
          created_at: string | null
          data: Json | null
          id: string
          organization_id: string
          started_by: string
          step: number | null
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          data?: Json | null
          id?: string
          organization_id: string
          started_by: string
          step?: number | null
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          data?: Json | null
          id?: string
          organization_id?: string
          started_by?: string
          step?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_sessions_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      org_core_values: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          short_behavior: string | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          short_behavior?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          short_behavior?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_core_values_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_core_values_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_roles: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      playbooks: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_url: string | null
          filename: string
          id: string
          organization_id: string
          parsed_steps: Json | null
          parsed_text: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          filename: string
          id?: string
          organization_id: string
          parsed_steps?: Json | null
          parsed_text?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          filename?: string
          id?: string
          organization_id?: string
          parsed_steps?: Json | null
          parsed_text?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: []
      }
      quarantined_fields_log: {
        Row: {
          action_taken: string
          connector_id: string
          created_at: string
          detection_method: string
          field_name: string
          field_value_preview: string | null
          file_name: string
          id: string
          organization_id: string
          resource_name: string
          severity: string
        }
        Insert: {
          action_taken?: string
          connector_id: string
          created_at?: string
          detection_method: string
          field_name: string
          field_value_preview?: string | null
          file_name: string
          id?: string
          organization_id: string
          resource_name: string
          severity?: string
        }
        Update: {
          action_taken?: string
          connector_id?: string
          created_at?: string
          detection_method?: string
          field_name?: string
          field_value_preview?: string | null
          file_name?: string
          id?: string
          organization_id?: string
          resource_name?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "quarantined_fields_log_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "bulk_analytics_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarantined_fields_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarantined_fields_log_organization_id_fkey"
            columns: ["organization_id"]
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
      recommendation_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          id: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value?: Json
          created_at?: string
          id?: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          id?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_runs: {
        Row: {
          created_at: string
          created_by: string | null
          deviation_at_run: number | null
          evidence: Json
          id: string
          inputs: Json
          metric_id: string
          model_version: string
          organization_id: string
          recommendations: Json
          recommendations_generated: number
          run_period_start: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deviation_at_run?: number | null
          evidence?: Json
          id?: string
          inputs?: Json
          metric_id: string
          model_version?: string
          organization_id: string
          recommendations?: Json
          recommendations_generated?: number
          run_period_start: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deviation_at_run?: number | null
          evidence?: Json
          id?: string
          inputs?: Json
          metric_id?: string
          model_version?: string
          organization_id?: string
          recommendations?: Json
          recommendations_generated?: number
          run_period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_runs_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_runs_organization_id_fkey"
            columns: ["organization_id"]
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
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: []
      }
      referrals_weekly: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          scheduled: number
          source_id: string
          total: number
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          scheduled?: number
          source_id: string
          total?: number
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
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
          organization_id: string | null
          period: string
          sent_at: string | null
          summary: Json
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          organization_id?: string | null
          period: string
          sent_at?: string | null
          summary: Json
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          organization_id?: string | null
          period?: string
          sent_at?: string | null
          summary?: Json
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_team_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_team_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      rock_collaborators: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          rock_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          rock_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          rock_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rock_collaborators_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rock_collaborators_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rock_collaborators_rock_id_fkey"
            columns: ["rock_id"]
            isOneToOne: false
            referencedRelation: "rocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rock_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      rock_metric_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          metric_id: string
          organization_id: string
          rock_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          metric_id: string
          organization_id: string
          rock_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          metric_id?: string
          organization_id?: string
          rock_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rock_metric_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rock_metric_links_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rock_metric_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rock_metric_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rock_metric_links_rock_id_fkey"
            columns: ["rock_id"]
            isOneToOne: false
            referencedRelation: "rocks"
            referencedColumns: ["id"]
          },
        ]
      }
      rock_outcomes: {
        Row: {
          blockers: string | null
          closed_at: string
          closed_by: string | null
          closed_quarter: string
          completion_percent: number | null
          created_issue_id: string | null
          disposition: string
          id: string
          lessons_learned: string | null
          linked_metric_ids: Json
          organization_id: string
          outcome_status: string
          outcome_summary: string | null
          rock_confidence: number | null
          rock_due_date: string | null
          rock_id: string
          rock_owner_id: string | null
          rock_status_at_close: string
          rock_title: string
        }
        Insert: {
          blockers?: string | null
          closed_at?: string
          closed_by?: string | null
          closed_quarter: string
          completion_percent?: number | null
          created_issue_id?: string | null
          disposition: string
          id?: string
          lessons_learned?: string | null
          linked_metric_ids?: Json
          organization_id: string
          outcome_status: string
          outcome_summary?: string | null
          rock_confidence?: number | null
          rock_due_date?: string | null
          rock_id: string
          rock_owner_id?: string | null
          rock_status_at_close: string
          rock_title: string
        }
        Update: {
          blockers?: string | null
          closed_at?: string
          closed_by?: string | null
          closed_quarter?: string
          completion_percent?: number | null
          created_issue_id?: string | null
          disposition?: string
          id?: string
          lessons_learned?: string | null
          linked_metric_ids?: Json
          organization_id?: string
          outcome_status?: string
          outcome_summary?: string | null
          rock_confidence?: number | null
          rock_due_date?: string | null
          rock_id?: string
          rock_owner_id?: string | null
          rock_status_at_close?: string
          rock_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "rock_outcomes_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rock_outcomes_created_issue_id_fkey"
            columns: ["created_issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rock_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rock_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rock_outcomes_rock_id_fkey"
            columns: ["rock_id"]
            isOneToOne: false
            referencedRelation: "rocks"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
            foreignKeyName: "rocks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rocks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
      scorecard_import_configs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          last_synced_at: string | null
          last_synced_month: string | null
          organization_id: string
          sheet_id: string | null
          source: string
          status: string | null
          tab_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          last_synced_month?: string | null
          organization_id: string
          sheet_id?: string | null
          source?: string
          status?: string | null
          tab_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          last_synced_month?: string | null
          organization_id?: string
          sheet_id?: string | null
          source?: string
          status?: string | null
          tab_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_import_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecard_import_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_metrics: {
        Row: {
          created_at: string
          created_by: string | null
          dimension_id: string | null
          dimension_label: string | null
          dimension_type: string | null
          id: string
          import_key: string
          organization_id: string
          period_type: string | null
          seat_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dimension_id?: string | null
          dimension_label?: string | null
          dimension_type?: string | null
          id?: string
          import_key: string
          organization_id: string
          period_type?: string | null
          seat_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dimension_id?: string | null
          dimension_label?: string | null
          dimension_type?: string | null
          id?: string
          import_key?: string
          organization_id?: string
          period_type?: string | null
          seat_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_metrics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_metrics_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_users: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          organization_id: string
          seat_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          organization_id: string
          seat_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          organization_id?: string
          seat_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_users_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seats: {
        Row: {
          clearance_level: number | null
          created_at: string
          department_id: string | null
          id: string
          organization_id: string
          reports_to: string | null
          reports_to_seat_id: string | null
          responsibilities: string[] | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          clearance_level?: number | null
          created_at?: string
          department_id?: string | null
          id?: string
          organization_id: string
          reports_to?: string | null
          reports_to_seat_id?: string | null
          responsibilities?: string[] | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          clearance_level?: number | null
          created_at?: string
          department_id?: string | null
          id?: string
          organization_id?: string
          reports_to?: string | null
          reports_to_seat_id?: string | null
          responsibilities?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seats_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seats_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seats_reports_to_seat_id_fkey"
            columns: ["reports_to_seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
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
      staging_appointments_jane: {
        Row: {
          account_guid: string
          appointment_guid: string
          arrived_at: string | null
          booked_at: string | null
          cancelled_at: string | null
          clinic_guid: string | null
          created_at: string
          created_at_jane: string | null
          discipline_name: string | null
          end_at: string | null
          file_date: string
          first_visit: boolean | null
          id: string
          location_name: string | null
          no_show_at: string | null
          organization_id: string
          patient_guid: string | null
          price: number | null
          raw_row: Json | null
          staff_member_guid: string | null
          staff_member_name: string | null
          start_at: string | null
          treatment_guid: string | null
          treatment_name: string | null
          updated_at: string
          updated_at_jane: string | null
        }
        Insert: {
          account_guid: string
          appointment_guid: string
          arrived_at?: string | null
          booked_at?: string | null
          cancelled_at?: string | null
          clinic_guid?: string | null
          created_at?: string
          created_at_jane?: string | null
          discipline_name?: string | null
          end_at?: string | null
          file_date: string
          first_visit?: boolean | null
          id?: string
          location_name?: string | null
          no_show_at?: string | null
          organization_id: string
          patient_guid?: string | null
          price?: number | null
          raw_row?: Json | null
          staff_member_guid?: string | null
          staff_member_name?: string | null
          start_at?: string | null
          treatment_guid?: string | null
          treatment_name?: string | null
          updated_at?: string
          updated_at_jane?: string | null
        }
        Update: {
          account_guid?: string
          appointment_guid?: string
          arrived_at?: string | null
          booked_at?: string | null
          cancelled_at?: string | null
          clinic_guid?: string | null
          created_at?: string
          created_at_jane?: string | null
          discipline_name?: string | null
          end_at?: string | null
          file_date?: string
          first_visit?: boolean | null
          id?: string
          location_name?: string | null
          no_show_at?: string | null
          organization_id?: string
          patient_guid?: string | null
          price?: number | null
          raw_row?: Json | null
          staff_member_guid?: string | null
          staff_member_name?: string | null
          start_at?: string | null
          treatment_guid?: string | null
          treatment_name?: string | null
          updated_at?: string
          updated_at_jane?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staging_appointments_jane_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staging_appointments_jane_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
      staging_invoices_jane: {
        Row: {
          account_guid: string
          amount_paid: number | null
          clinic_guid: string | null
          created_at: string
          file_date: string
          id: string
          income_category: string | null
          income_category_id: string | null
          invoice_guid: string | null
          invoiced_at: string | null
          location_guid: string | null
          organization_id: string
          patient_guid: string | null
          payer_type: string | null
          purchasable_guid: string | null
          purchasable_id: string | null
          purchasable_type: string | null
          raw_row: Json | null
          sale_map_coordinates: string | null
          staff_member_guid: string | null
          staff_member_name: string | null
          subtotal: number | null
          updated_at: string
        }
        Insert: {
          account_guid: string
          amount_paid?: number | null
          clinic_guid?: string | null
          created_at?: string
          file_date: string
          id?: string
          income_category?: string | null
          income_category_id?: string | null
          invoice_guid?: string | null
          invoiced_at?: string | null
          location_guid?: string | null
          organization_id: string
          patient_guid?: string | null
          payer_type?: string | null
          purchasable_guid?: string | null
          purchasable_id?: string | null
          purchasable_type?: string | null
          raw_row?: Json | null
          sale_map_coordinates?: string | null
          staff_member_guid?: string | null
          staff_member_name?: string | null
          subtotal?: number | null
          updated_at?: string
        }
        Update: {
          account_guid?: string
          amount_paid?: number | null
          clinic_guid?: string | null
          created_at?: string
          file_date?: string
          id?: string
          income_category?: string | null
          income_category_id?: string | null
          invoice_guid?: string | null
          invoiced_at?: string | null
          location_guid?: string | null
          organization_id?: string
          patient_guid?: string | null
          payer_type?: string | null
          purchasable_guid?: string | null
          purchasable_id?: string | null
          purchasable_type?: string | null
          raw_row?: Json | null
          sale_map_coordinates?: string | null
          staff_member_guid?: string | null
          staff_member_name?: string | null
          subtotal?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staging_invoices_jane_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staging_invoices_jane_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
      staging_patients_jane: {
        Row: {
          account_guid: string
          city: string | null
          clinic_guid: string | null
          country: string | null
          created_at: string
          discharged_at: string | null
          dob: string | null
          email_hash: string | null
          file_date: string
          id: string
          organization_id: string
          patient_guid: string
          postal: string | null
          province: string | null
          raw_row: Json | null
          referral_source: string | null
          sex: string | null
          updated_at: string
        }
        Insert: {
          account_guid: string
          city?: string | null
          clinic_guid?: string | null
          country?: string | null
          created_at?: string
          discharged_at?: string | null
          dob?: string | null
          email_hash?: string | null
          file_date: string
          id?: string
          organization_id: string
          patient_guid: string
          postal?: string | null
          province?: string | null
          raw_row?: Json | null
          referral_source?: string | null
          sex?: string | null
          updated_at?: string
        }
        Update: {
          account_guid?: string
          city?: string | null
          clinic_guid?: string | null
          country?: string | null
          created_at?: string
          discharged_at?: string | null
          dob?: string | null
          email_hash?: string | null
          file_date?: string
          id?: string
          organization_id?: string
          patient_guid?: string
          postal?: string | null
          province?: string | null
          raw_row?: Json | null
          referral_source?: string | null
          sex?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staging_patients_jane_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staging_patients_jane_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
      staging_payments_jane: {
        Row: {
          account_guid: string
          amount: number | null
          card_type: string | null
          clinic_guid: string | null
          created_at: string
          file_date: string
          id: string
          jane_payments_partner: string | null
          location_guid: string | null
          organization_id: string
          patient_account_guid: string | null
          payer_id: string | null
          payer_type: string | null
          payment_guid: string
          payment_method: string | null
          payment_method_external: string | null
          payment_method_internal: string | null
          payment_type: string | null
          raw_row: Json | null
          received_at: string | null
          staff_member_guid: string | null
          staff_member_name: string | null
          updated_at: string
          workflow: string | null
        }
        Insert: {
          account_guid: string
          amount?: number | null
          card_type?: string | null
          clinic_guid?: string | null
          created_at?: string
          file_date: string
          id?: string
          jane_payments_partner?: string | null
          location_guid?: string | null
          organization_id: string
          patient_account_guid?: string | null
          payer_id?: string | null
          payer_type?: string | null
          payment_guid: string
          payment_method?: string | null
          payment_method_external?: string | null
          payment_method_internal?: string | null
          payment_type?: string | null
          raw_row?: Json | null
          received_at?: string | null
          staff_member_guid?: string | null
          staff_member_name?: string | null
          updated_at?: string
          workflow?: string | null
        }
        Update: {
          account_guid?: string
          amount?: number | null
          card_type?: string | null
          clinic_guid?: string | null
          created_at?: string
          file_date?: string
          id?: string
          jane_payments_partner?: string | null
          location_guid?: string | null
          organization_id?: string
          patient_account_guid?: string | null
          payer_id?: string | null
          payer_type?: string | null
          payment_guid?: string
          payment_method?: string | null
          payment_method_external?: string | null
          payment_method_internal?: string | null
          payment_type?: string | null
          raw_row?: Json | null
          received_at?: string | null
          staff_member_guid?: string | null
          staff_member_name?: string | null
          updated_at?: string
          workflow?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staging_payments_jane_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staging_payments_jane_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      staging_shifts_jane: {
        Row: {
          account_guid: string
          book_online: boolean | null
          call_to_book: boolean | null
          clinic_guid: string | null
          created_at: string
          end_at: string | null
          file_date: string
          id: string
          location_guid: string | null
          organization_id: string
          raw_row: Json | null
          room_guid: string | null
          shift_guid: string
          staff_member_guid: string | null
          staff_member_name: string | null
          start_at: string | null
          updated_at: string
        }
        Insert: {
          account_guid: string
          book_online?: boolean | null
          call_to_book?: boolean | null
          clinic_guid?: string | null
          created_at?: string
          end_at?: string | null
          file_date: string
          id?: string
          location_guid?: string | null
          organization_id: string
          raw_row?: Json | null
          room_guid?: string | null
          shift_guid: string
          staff_member_guid?: string | null
          staff_member_name?: string | null
          start_at?: string | null
          updated_at?: string
        }
        Update: {
          account_guid?: string
          book_online?: boolean | null
          call_to_book?: boolean | null
          clinic_guid?: string | null
          created_at?: string
          end_at?: string | null
          file_date?: string
          id?: string
          location_guid?: string | null
          organization_id?: string
          raw_row?: Json | null
          room_guid?: string | null
          shift_guid?: string
          staff_member_guid?: string | null
          staff_member_name?: string | null
          start_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staging_shifts_jane_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staging_shifts_jane_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          annual_visit_volume: number | null
          benchmark_opt_in: boolean
          brand_color: string | null
          country: string | null
          created_at: string
          currency: string | null
          data_mode: string
          default_report_email: string | null
          ehr_system: string | null
          emr_source_type: string | null
          eos_enabled: boolean | null
          id: string
          industry: string | null
          is_demo_org: boolean
          location_city: string | null
          location_region: string | null
          logo_url: string | null
          meeting_rhythm: string | null
          name: string
          needs_rocks_review: boolean | null
          needs_scorecard_review: boolean | null
          onboarding_status: string | null
          provider_count: number | null
          region: string | null
          review_cadence: string | null
          scorecard_mode: string
          scorecard_ready: boolean | null
          scorecard_ready_checked_at: string | null
          scorecard_ready_notes: string | null
          team_size: number | null
          timezone: string | null
          unit_system: string | null
          updated_at: string
          vto_last_impact_result: Json | null
        }
        Insert: {
          annual_visit_volume?: number | null
          benchmark_opt_in?: boolean
          brand_color?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          data_mode?: string
          default_report_email?: string | null
          ehr_system?: string | null
          emr_source_type?: string | null
          eos_enabled?: boolean | null
          id?: string
          industry?: string | null
          is_demo_org?: boolean
          location_city?: string | null
          location_region?: string | null
          logo_url?: string | null
          meeting_rhythm?: string | null
          name: string
          needs_rocks_review?: boolean | null
          needs_scorecard_review?: boolean | null
          onboarding_status?: string | null
          provider_count?: number | null
          region?: string | null
          review_cadence?: string | null
          scorecard_mode?: string
          scorecard_ready?: boolean | null
          scorecard_ready_checked_at?: string | null
          scorecard_ready_notes?: string | null
          team_size?: number | null
          timezone?: string | null
          unit_system?: string | null
          updated_at?: string
          vto_last_impact_result?: Json | null
        }
        Update: {
          annual_visit_volume?: number | null
          benchmark_opt_in?: boolean
          brand_color?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          data_mode?: string
          default_report_email?: string | null
          ehr_system?: string | null
          emr_source_type?: string | null
          eos_enabled?: boolean | null
          id?: string
          industry?: string | null
          is_demo_org?: boolean
          location_city?: string | null
          location_region?: string | null
          logo_url?: string | null
          meeting_rhythm?: string | null
          name?: string
          needs_rocks_review?: boolean | null
          needs_scorecard_review?: boolean | null
          onboarding_status?: string | null
          provider_count?: number | null
          region?: string | null
          review_cadence?: string | null
          scorecard_mode?: string
          scorecard_ready?: boolean | null
          scorecard_ready_checked_at?: string | null
          scorecard_ready_notes?: string | null
          team_size?: number | null
          timezone?: string | null
          unit_system?: string | null
          updated_at?: string
          vto_last_impact_result?: Json | null
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
          meeting_id: string | null
          organization_id: string | null
          owner_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          done_at?: string | null
          due_date?: string | null
          id?: string
          issue_id?: string | null
          meeting_id?: string | null
          organization_id?: string | null
          owner_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          done_at?: string | null
          due_date?: string | null
          id?: string
          issue_id?: string | null
          meeting_id?: string | null
          organization_id?: string | null
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
            foreignKeyName: "todos_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
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
      user_departments: {
        Row: {
          created_at: string | null
          department_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_departments_user_id_fkey"
            columns: ["user_id"]
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
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
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
          avatar_url: string | null
          created_at: string
          demo_user: boolean
          department_id: string | null
          email: string
          full_name: string
          gwc_capacity: boolean | null
          gwc_gets_it: boolean | null
          gwc_wants_it: boolean | null
          hire_date: string | null
          id: string
          jane_staff_member_guid: string | null
          manager_notes: string | null
          role: Database["public"]["Enums"]["user_role"]
          team_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          demo_user?: boolean
          department_id?: string | null
          email: string
          full_name: string
          gwc_capacity?: boolean | null
          gwc_gets_it?: boolean | null
          gwc_wants_it?: boolean | null
          hire_date?: string | null
          id?: string
          jane_staff_member_guid?: string | null
          manager_notes?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          demo_user?: boolean
          department_id?: string | null
          email?: string
          full_name?: string
          gwc_capacity?: boolean | null
          gwc_gets_it?: boolean | null
          gwc_wants_it?: boolean | null
          hire_date?: string | null
          id?: string
          jane_staff_member_guid?: string | null
          manager_notes?: string | null
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
            referencedRelation: "benchmark_opted_in_orgs"
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
          organization_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
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
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vto_team_id_fkey"
            columns: ["organization_id"]
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
      vto_diff_events: {
        Row: {
          changed_fields: string[] | null
          created_at: string | null
          id: string
          organization_id: string | null
          previous_snapshot: Json | null
          updated_snapshot: Json | null
          vto_version_id: string | null
        }
        Insert: {
          changed_fields?: string[] | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          previous_snapshot?: Json | null
          updated_snapshot?: Json | null
          vto_version_id?: string | null
        }
        Update: {
          changed_fields?: string[] | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          previous_snapshot?: Json | null
          updated_snapshot?: Json | null
          vto_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vto_diff_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vto_diff_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vto_diff_events_vto_version_id_fkey"
            columns: ["vto_version_id"]
            isOneToOne: false
            referencedRelation: "vto_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      vto_history: {
        Row: {
          ai_insights: string | null
          change_summary: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          impacted_sections: string[] | null
          is_manual: boolean | null
          organization_id: string
          rocks_impact: Json | null
          rocks_snapshot: Json
          scorecard_impact: Json | null
          scorecard_snapshot: Json
          tags: string[] | null
          vto_snapshot: Json
          vto_version: number
          vto_version_id: string | null
        }
        Insert: {
          ai_insights?: string | null
          change_summary?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          impacted_sections?: string[] | null
          is_manual?: boolean | null
          organization_id: string
          rocks_impact?: Json | null
          rocks_snapshot?: Json
          scorecard_impact?: Json | null
          scorecard_snapshot?: Json
          tags?: string[] | null
          vto_snapshot: Json
          vto_version: number
          vto_version_id?: string | null
        }
        Update: {
          ai_insights?: string | null
          change_summary?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          impacted_sections?: string[] | null
          is_manual?: boolean | null
          organization_id?: string
          rocks_impact?: Json | null
          rocks_snapshot?: Json
          scorecard_impact?: Json | null
          scorecard_snapshot?: Json
          tags?: string[] | null
          vto_snapshot?: Json
          vto_version?: number
          vto_version_id?: string | null
        }
        Relationships: []
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
          organization_id: string
          preset_key: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          organization_id: string
          preset_key: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          organization_id?: string
          preset_key?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vto_preset_events_team_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vto_preset_events_team_id_fkey"
            columns: ["organization_id"]
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
          history_id: string | null
          id: string
          issues: Json | null
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
          history_id?: string | null
          id?: string
          issues?: Json | null
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
          history_id?: string | null
          id?: string
          issues?: Json | null
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
      benchmark_opted_in_orgs: {
        Row: {
          emr_source_type: string | null
          id: string | null
          name: string | null
          provider_count: number | null
        }
        Insert: {
          emr_source_type?: string | null
          id?: string | null
          name?: string | null
          provider_count?: number | null
        }
        Update: {
          emr_source_type?: string | null
          id?: string | null
          name?: string | null
          provider_count?: number | null
        }
        Relationships: []
      }
      v_data_scope_compliance: {
        Row: {
          connector_id: string | null
          critical_count: number | null
          files_affected: number | null
          log_date: string | null
          organization_id: string | null
          total_violations: number | null
          unique_fields_flagged: number | null
          warning_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quarantined_fields_log_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "bulk_analytics_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarantined_fields_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "benchmark_opted_in_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarantined_fields_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
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
      bench_compare_team_to_cohort: {
        Args: {
          _cohort_id: string
          _metric_id: string
          _period_start: string
          _period_type: string
          _team_id: string
        }
        Returns: {
          cohort_mean: number
          cohort_n_orgs: number
          cohort_p10: number
          cohort_p25: number
          cohort_p50: number
          cohort_p75: number
          cohort_p90: number
          cohort_stddev: number
          computed_at: string
          rank_bucket: string
          source: string
          team_value: number
        }[]
      }
      bench_compute_snapshot: {
        Args: {
          _cohort_id: string
          _metric_id: string
          _period_start: string
          _period_type: string
        }
        Returns: {
          cohort_id: string
          computed_at: string
          excluded_count: number
          excluded_high_latency: number
          excluded_low_completeness: number
          excluded_low_consistency: number
          id: string
          included_count: number
          mean: number
          metric_id: string
          n_orgs: number
          p10: number
          p25: number
          p50: number
          p75: number
          p90: number
          period_start: string
          period_type: string
          quality_summary: Json
          stddev: number
          suppressed: boolean
          suppression_reason: string
        }[]
      }
      bench_get_aggregate_comparison: {
        Args: { _metric_key: string; _period_key: string }
        Returns: {
          confidence_label: string
          delta_p50: number
          delta_percent: number
          jane_mean: number
          jane_n_orgs: number
          jane_p25: number
          jane_p50: number
          jane_p75: number
          jane_suppressed: boolean
          metric_key: string
          non_jane_mean: number
          non_jane_n_orgs: number
          non_jane_p25: number
          non_jane_p50: number
          non_jane_p75: number
          non_jane_suppressed: boolean
          period_key: string
        }[]
      }
      bench_get_cohort_members: {
        Args: { _cohort_id: string }
        Returns: {
          emr_source_type: string
          joined_at: string
          team_id: string
          team_name: string
        }[]
      }
      bench_get_cohorts: {
        Args: never
        Returns: {
          created_at: string
          description: string
          id: string
          member_count: number
          name: string
        }[]
      }
      bench_get_matched_comparison: {
        Args: {
          _metric_key: string
          _period_key: string
          _use_peer_matching?: boolean
        }
        Returns: {
          confidence_label: string
          confidence_reason: string
          delta_percent: number
          jane_coefficient_of_variation: number
          jane_excluded_count: number
          jane_included_count: number
          jane_median: number
          jane_p25: number
          jane_p75: number
          jane_quality_summary: Json
          jane_sample_size: number
          jane_std_deviation: number
          metric_key: string
          non_jane_coefficient_of_variation: number
          non_jane_excluded_count: number
          non_jane_included_count: number
          non_jane_median: number
          non_jane_p25: number
          non_jane_p75: number
          non_jane_quality_summary: Json
          non_jane_sample_size: number
          non_jane_std_deviation: number
          peer_match_criteria: string
          peer_matching_used: boolean
          period_key: string
          suppressed: boolean
          suppression_reason: string
        }[]
      }
      bench_get_snapshot: {
        Args: { _snapshot_id: string }
        Returns: {
          cohort_id: string
          cohort_name: string
          computed_at: string
          confidence_label: string
          excluded_count: number
          excluded_high_latency: number
          excluded_low_completeness: number
          excluded_low_consistency: number
          exclusion_rate: number
          high_exclusion_warning: boolean
          id: string
          included_count: number
          mean: number
          metric_id: string
          metric_name: string
          n_orgs: number
          p10: number
          p25: number
          p50: number
          p75: number
          p90: number
          period_start: string
          period_type: string
          quality_summary: Json
          stddev: number
          suppressed: boolean
          suppression_reason: string
        }[]
      }
      bench_list_snapshots: {
        Args: { _cohort_id: string; _limit?: number }
        Returns: {
          cohort_id: string
          computed_at: string
          excluded_count: number
          excluded_high_latency: number
          excluded_low_completeness: number
          excluded_low_consistency: number
          high_exclusion_warning: boolean
          id: string
          included_count: number
          mean: number
          metric_id: string
          metric_name: string
          n_orgs: number
          p10: number
          p25: number
          p50: number
          p75: number
          p90: number
          period_start: string
          period_type: string
          quality_summary: Json
          stddev: number
          suppressed: boolean
          suppression_reason: string
        }[]
      }
      bench_refresh_default_cohorts: {
        Args: never
        Returns: {
          jane_cohort_id: string
          jane_member_count: number
          non_jane_cohort_id: string
          non_jane_member_count: number
        }[]
      }
      can_modify_intervention: {
        Args: { intervention_id: string }
        Returns: boolean
      }
      check_recommendation_eligibility: {
        Args: { _metric_id: string; _org_id: string; _period_start: string }
        Returns: {
          cooldown_active: boolean
          current_value: number
          deviation_percent: number
          eligible: boolean
          last_deviation: number
          last_run_at: string
          reason: string
          sample_size: number
          target_value: number
        }[]
      }
      compute_canonical_for_month: {
        Args: { _month_start: string; _org_id: string }
        Returns: Json
      }
      compute_canonical_for_week: {
        Args: { _org_id: string; _week_start: string }
        Returns: Json
      }
      compute_metric_canonical_results: {
        Args: {
          _metric_id: string
          _org_id: string
          _period_start: string
          _period_type: string
        }
        Returns: Json
      }
      current_user_id: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      current_user_team: { Args: never; Returns: string }
      emr_quality_thresholds: {
        Args: never
        Returns: {
          max_latency_days: number
          min_completeness: number
          min_consistency: number
          min_sample_size: number
        }[]
      }
      emr_safe_comparison: {
        Args: {
          _metric_key: string
          _period_key: string
          _use_peer_matching?: boolean
        }
        Returns: {
          confidence_label: string
          delta_percent: number
          jane_avg_completeness: number
          jane_avg_consistency: number
          jane_avg_latency_days: number
          jane_coefficient_of_variation: number
          jane_median: number
          jane_p25: number
          jane_p75: number
          jane_std_deviation: number
          metric_key: string
          non_jane_avg_completeness: number
          non_jane_avg_consistency: number
          non_jane_avg_latency_days: number
          non_jane_coefficient_of_variation: number
          non_jane_median: number
          non_jane_p25: number
          non_jane_p75: number
          non_jane_std_deviation: number
          orgs_excluded_quality: number
          peer_match_criteria: string
          peer_matching_used: boolean
          period_key: string
          sample_size_jane: number
          sample_size_non_jane: number
          suppressed: boolean
          suppression_reason: string
        }[]
      }
      expire_data_access_requests: { Args: never; Returns: number }
      get_canonical_source_priority: {
        Args: {
          _metric_id: string
          _organization_id: string
          _period_type: string
        }
        Returns: {
          is_override: boolean
          priority: number
          requires_audit_pass: boolean
          source: string
        }[]
      }
      get_onboarding_metrics: {
        Args: { org_id: string }
        Returns: {
          completed_count: number
          completion_rate: number
          pending_count: number
          total_users: number
        }[]
      }
      get_org_benchmark_opt_in: { Args: { _org_id: string }; Returns: boolean }
      get_provider_count_bucket: {
        Args: { provider_count: number }
        Returns: string
      }
      get_provider_size_bucket: {
        Args: { _provider_count: number }
        Returns: string
      }
      get_recommendation_config_value: {
        Args: { _default: number; _key: string; _org_id: string }
        Returns: number
      }
      get_recommendation_run: {
        Args: { _metric_id: string; _org_id: string; _period_start: string }
        Returns: {
          created_at: string
          eligible: boolean
          evidence: Json
          id: string
          ineligibility_reason: string
          inputs: Json
          metric_id: string
          organization_id: string
          period_start: string
          recommendations: Json
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_team_id: { Args: never; Returns: string }
      get_visit_volume_bucket: {
        Args: { _annual_visits: number }
        Returns: string
      }
      get_visits_quartile_bucket: {
        Args: {
          cohort_p25: number
          cohort_p50: number
          cohort_p75: number
          org_visits: number
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_valid_data_access: {
        Args: { _org_id: string; _resource_type: string; _user_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_simple: { Args: never; Returns: boolean }
      is_billing: { Args: never; Returns: boolean }
      is_intervention_creator: {
        Args: { intervention_id: string }
        Returns: boolean
      }
      is_jane_integrated: { Args: { org_id: string }; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      is_master_admin: { Args: never; Returns: boolean }
      is_metric_eligible_for_recommendations: {
        Args: { _current_value: number; _metric_id: string }
        Returns: {
          deviation_percent: number
          is_eligible: boolean
          reason: string
          target: number
          threshold_used: number
        }[]
      }
      is_org_admin_for: { Args: { org_id: string }; Returns: boolean }
      is_org_benchmark_opted_in: { Args: { _org_id: string }; Returns: boolean }
      is_recommendation_in_cooldown: {
        Args: {
          _current_deviation: number
          _intervention_type: string
          _metric_id: string
          _org_id: string
        }
        Returns: {
          deviation_worsened: boolean
          in_cooldown: boolean
          last_recommended_at: string
          reason: string
        }[]
      }
      is_same_team: { Args: { check_team_id: string }; Returns: boolean }
      is_user_admin: { Args: { _user_id: string }; Returns: boolean }
      is_user_manager: { Args: { _user_id: string }; Returns: boolean }
      log_intervention_event: {
        Args: { _details?: Json; _event_type: string; _intervention_id: string }
        Returns: string
      }
      match_doc_sections: {
        Args: {
          match_count?: number
          match_org_id: string
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          doc_id: string
          doc_title: string
          heading_path: string
          id: string
          section_body: string
          section_title: string
          section_type: string
          similarity: number
        }[]
      }
      org_get_benchmark_summary: {
        Args: {
          _metric_id: string
          _period_start: string
          _period_type: string
        }
        Returns: {
          bucket_label: string
          cohort_n_orgs: number
          cohort_name: string
          cohort_p25: number
          cohort_p50: number
          cohort_p75: number
          computed_at: string
          percentile_position: number
          team_value: number
        }[]
      }
      org_passes_quality_gates: {
        Args: { _org_id: string; _period_key: string }
        Returns: {
          avg_latency_hours: number
          completeness_score: number
          consistency_score: number
          fail_reason: string
          latency_score: number
          passes: boolean
        }[]
      }
      passes_emr_quality_gates: {
        Args: { _org_id: string; _period_key: string }
        Returns: {
          completeness_score: number
          consistency_score: number
          exclusion_reason: string
          latency_score: number
          passes: boolean
        }[]
      }
      select_canonical_metric_result: {
        Args: {
          _metric_id: string
          _organization_id: string
          _period_start: string
          _period_type: string
        }
        Returns: {
          metric_result_id: string
          selection_meta: Json
          selection_reason: string
          source: string
          value: number
        }[]
      }
      set_org_benchmark_opt_in: {
        Args: { _opt_in: boolean; _org_id: string }
        Returns: boolean
      }
    }
    Enums: {
      ar_bucket: "30-60" | "60-90" | "90-120" | "120+"
      assessment_status: "draft" | "pending_review" | "completed"
      assessment_type: "manager" | "self" | "peer"
      bulk_cadence: "daily" | "monthly"
      bulk_connector_status:
        | "active"
        | "paused"
        | "error"
        | "requested"
        | "awaiting_jane_setup"
        | "awaiting_first_file"
        | "receiving_data"
      bulk_delivery_method: "s3" | "secure_upload" | "manual_drop"
      bulk_source_system: "jane" | "advancedmd" | "other"
      doc_kind: "SOP" | "Policy" | "Handbook" | "Training"
      doc_status: "draft" | "approved" | "archived"
      expected_direction: "up" | "down" | "stable"
      gwc_rating: "+" | "±" | "-"
      ingest_status: "pending" | "processing" | "success" | "error"
      intervention_origin_type:
        | "issue"
        | "rock"
        | "todo"
        | "manual"
        | "ai_recommendation"
      intervention_status: "planned" | "active" | "completed" | "abandoned"
      intervention_type:
        | "staffing"
        | "marketing"
        | "referral_outreach"
        | "scheduling"
        | "pricing"
        | "workflow"
        | "training"
        | "equipment"
        | "service_line"
        | "other"
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
      meeting_type: "L10" | "leadership_sync" | "quarterly" | "annual"
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
      assessment_status: ["draft", "pending_review", "completed"],
      assessment_type: ["manager", "self", "peer"],
      bulk_cadence: ["daily", "monthly"],
      bulk_connector_status: [
        "active",
        "paused",
        "error",
        "requested",
        "awaiting_jane_setup",
        "awaiting_first_file",
        "receiving_data",
      ],
      bulk_delivery_method: ["s3", "secure_upload", "manual_drop"],
      bulk_source_system: ["jane", "advancedmd", "other"],
      doc_kind: ["SOP", "Policy", "Handbook", "Training"],
      doc_status: ["draft", "approved", "archived"],
      expected_direction: ["up", "down", "stable"],
      gwc_rating: ["+", "±", "-"],
      ingest_status: ["pending", "processing", "success", "error"],
      intervention_origin_type: [
        "issue",
        "rock",
        "todo",
        "manual",
        "ai_recommendation",
      ],
      intervention_status: ["planned", "active", "completed", "abandoned"],
      intervention_type: [
        "staffing",
        "marketing",
        "referral_outreach",
        "scheduling",
        "pricing",
        "workflow",
        "training",
        "equipment",
        "service_line",
        "other",
      ],
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
      meeting_type: ["L10", "leadership_sync", "quarterly", "annual"],
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
