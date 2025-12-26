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
      action_items: {
        Row: {
          id: string
          organization_id: string
          analysis_id: string
          node_id: string | null
          action_type: Database["public"]["Enums"]["action_type"]
          title: string
          description: string | null
          investigation_item: string
          person_responsible_id: string | null
          owner_user_id: string | null
          due_date: string | null
          schedule: string | null
          status: Database["public"]["Enums"]["action_lifecycle_status"]
          priority: Database["public"]["Enums"]["action_priority"] | null
          close_criteria: string | null
          result: string | null
          investigation_result: string | null
          judgment: number | null
          remarks: string | null
          evidence_required: string | null
          evidence_status: Database["public"]["Enums"]["evidence_status"]
          created_by: string | null
          updated_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          analysis_id: string
          node_id?: string | null
          action_type?: Database["public"]["Enums"]["action_type"]
          title: string
          description?: string | null
          investigation_item?: string
          person_responsible_id?: string | null
          owner_user_id?: string | null
          due_date?: string | null
          schedule?: string | null
          status?: Database["public"]["Enums"]["action_lifecycle_status"]
          priority?: Database["public"]["Enums"]["action_priority"] | null
          close_criteria?: string | null
          result?: string | null
          investigation_result?: string | null
          judgment?: number | null
          remarks?: string | null
          evidence_required?: string | null
          evidence_status?: Database["public"]["Enums"]["evidence_status"]
          created_by?: string | null
          updated_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          analysis_id?: string
          node_id?: string | null
          action_type?: Database["public"]["Enums"]["action_type"]
          title?: string
          description?: string | null
          investigation_item?: string
          person_responsible_id?: string | null
          owner_user_id?: string | null
          due_date?: string | null
          schedule?: string | null
          status?: Database["public"]["Enums"]["action_lifecycle_status"]
          priority?: Database["public"]["Enums"]["action_priority"] | null
          close_criteria?: string | null
          result?: string | null
          investigation_result?: string | null
          judgment?: number | null
          remarks?: string | null
          evidence_required?: string | null
          evidence_status?: Database["public"]["Enums"]["evidence_status"]
          created_by?: string | null
          updated_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_person_responsible_id_fkey"
            columns: ["person_responsible_id"]
            isOneToOne: false
            referencedRelation: "people_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_runs: {
        Row: {
          id: string
          organization_id: string
          analysis_id: string
          node_id: string | null
          context_type: string
          feature: Database["public"]["Enums"]["ai_feature_type"]
          model_provider: string
          model_name: string | null
          prompt_version: string | null
          input_summary: Json | null
          output_summary: Json | null
          tokens_used: number | null
          latency_ms: number | null
          error_message: string | null
          created_by: string
          created_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          analysis_id: string
          node_id?: string | null
          context_type: string
          feature: Database["public"]["Enums"]["ai_feature_type"]
          model_provider?: string
          model_name?: string | null
          prompt_version?: string | null
          input_summary?: Json | null
          output_summary?: Json | null
          tokens_used?: number | null
          latency_ms?: number | null
          error_message?: string | null
          created_by: string
          created_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          analysis_id?: string
          node_id?: string | null
          context_type?: string
          feature?: Database["public"]["Enums"]["ai_feature_type"]
          model_provider?: string
          model_name?: string | null
          prompt_version?: string | null
          input_summary?: Json | null
          output_summary?: Json | null
          tokens_used?: number | null
          latency_ms?: number | null
          error_message?: string | null
          created_by?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_suggestions: {
        Row: {
          id: string
          ai_run_id: string
          suggestion_type: Database["public"]["Enums"]["ai_suggestion_type"]
          payload: Json
          confidence: Database["public"]["Enums"]["ai_confidence"]
          rationale: string | null
          evidence_required: string | null
          category: string | null
          status: Database["public"]["Enums"]["ai_suggestion_status"]
          accepted_by: string | null
          accepted_at: string | null
          dismissed_by: string | null
          dismissed_at: string | null
          dismiss_reason: string | null
          applied_entity_id: string | null
          applied_entity_type: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          ai_run_id: string
          suggestion_type: Database["public"]["Enums"]["ai_suggestion_type"]
          payload: Json
          confidence?: Database["public"]["Enums"]["ai_confidence"]
          rationale?: string | null
          evidence_required?: string | null
          category?: string | null
          status?: Database["public"]["Enums"]["ai_suggestion_status"]
          accepted_by?: string | null
          accepted_at?: string | null
          dismissed_by?: string | null
          dismissed_at?: string | null
          dismiss_reason?: string | null
          applied_entity_id?: string | null
          applied_entity_type?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          ai_run_id?: string
          suggestion_type?: Database["public"]["Enums"]["ai_suggestion_type"]
          payload?: Json
          confidence?: Database["public"]["Enums"]["ai_confidence"]
          rationale?: string | null
          evidence_required?: string | null
          category?: string | null
          status?: Database["public"]["Enums"]["ai_suggestion_status"]
          accepted_by?: string | null
          accepted_at?: string | null
          dismissed_by?: string | null
          dismissed_at?: string | null
          dismiss_reason?: string | null
          applied_entity_id?: string | null
          applied_entity_type?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_ai_run_id_fkey"
            columns: ["ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      industries: {
        Row: {
          id: string
          name: string
          description: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      issue_categories: {
        Row: {
          id: string
          organization_id: string | null
          name: string
          description: string | null
          color: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          name: string
          description?: string | null
          color?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          name?: string
          description?: string | null
          color?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      metadata_fields: {
        Row: {
          id: string
          organization_id: string
          key: string
          label: string
          field_type: Database["public"]["Enums"]["metadata_field_type"]
          placeholder: string | null
          help_text: string | null
          options: Json | null
          validation: Json | null
          is_required: boolean
          is_active: boolean
          sort_order: number
          scope: Database["public"]["Enums"]["metadata_field_scope"]
          created_at: string
          created_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          key: string
          label: string
          field_type?: Database["public"]["Enums"]["metadata_field_type"]
          placeholder?: string | null
          help_text?: string | null
          options?: Json | null
          validation?: Json | null
          is_required?: boolean
          is_active?: boolean
          sort_order?: number
          scope?: Database["public"]["Enums"]["metadata_field_scope"]
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          key?: string
          label?: string
          field_type?: Database["public"]["Enums"]["metadata_field_type"]
          placeholder?: string | null
          help_text?: string | null
          options?: Json | null
          validation?: Json | null
          is_required?: boolean
          is_active?: boolean
          sort_order?: number
          scope?: Database["public"]["Enums"]["metadata_field_scope"]
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metadata_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metadata_fields_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_metadata_values: {
        Row: {
          id: string
          organization_id: string
          analysis_id: string
          field_id: string
          value_text: string | null
          value_number: number | null
          value_date: string | null
          value_boolean: boolean | null
          value_json: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          analysis_id: string
          field_id: string
          value_text?: string | null
          value_number?: number | null
          value_date?: string | null
          value_boolean?: boolean | null
          value_json?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          analysis_id?: string
          field_id?: string
          value_text?: string | null
          value_number?: number | null
          value_date?: string | null
          value_boolean?: boolean | null
          value_json?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_metadata_values_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_metadata_values_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_metadata_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "metadata_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_metadata_values_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analyses: {
        Row: {
          abstract: string | null
          analysis_date: string | null
          /** @deprecated Use process_workflow instead */
          application: string | null
          created_at: string | null
          created_by: string
          id: string
          /** @deprecated Use asset_system instead */
          model: string | null
          organization_id: string
          /** @deprecated Use item_output instead */
          part_name: string | null
          problem_statement: string | null
          related_document: string | null
          status: string | null
          title: string
          updated_at: string | null
          // New industry-neutral fields
          industry_id: string | null
          site_name: string | null
          area_function: string | null
          process_workflow: string | null
          asset_system: string | null
          item_output: string | null
          issue_category_id: string | null
          /** Custom subcategory when Issue Category is "Other (Specify)" */
          issue_subcategory: string | null
        }
        Insert: {
          abstract?: string | null
          analysis_date?: string | null
          application?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          model?: string | null
          organization_id: string
          part_name?: string | null
          problem_statement?: string | null
          related_document?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          // New industry-neutral fields
          industry_id?: string | null
          site_name?: string | null
          area_function?: string | null
          process_workflow?: string | null
          asset_system?: string | null
          item_output?: string | null
          issue_category_id?: string | null
          issue_subcategory?: string | null
        }
        Update: {
          abstract?: string | null
          analysis_date?: string | null
          application?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          model?: string | null
          organization_id?: string
          part_name?: string | null
          problem_statement?: string | null
          related_document?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          // New industry-neutral fields
          industry_id?: string | null
          site_name?: string | null
          area_function?: string | null
          process_workflow?: string | null
          asset_system?: string | null
          item_output?: string | null
          issue_category_id?: string | null
          issue_subcategory?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analyses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_issue_category_id_fkey"
            columns: ["issue_category_id"]
            isOneToOne: false
            referencedRelation: "issue_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_mappings: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          mapping_rules: Json
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          mapping_rules: Json
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          mapping_rules?: Json
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ap_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_attachments: {
        Row: {
          action_item_id: string | null
          created_at: string | null
          description: string | null
          file_path: string | null
          id: string
          metadata: Json | null
          node_id: string | null
          title: string
          type: Database["public"]["Enums"]["evidence_type"]
          uploaded_by: string
          url: string | null
        }
        Insert: {
          action_item_id?: string | null
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json | null
          node_id?: string | null
          title: string
          type: Database["public"]["Enums"]["evidence_type"]
          uploaded_by: string
          url?: string | null
        }
        Update: {
          action_item_id?: string | null
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json | null
          node_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["evidence_type"]
          uploaded_by?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_attachments_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_attachments_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      node_edges: {
        Row: {
          analysis_id: string
          created_at: string | null
          gate_type: Database["public"]["Enums"]["gate_type"] | null
          id: string
          order_index: number | null
          source_id: string
          target_id: string
        }
        Insert: {
          analysis_id: string
          created_at?: string | null
          gate_type?: Database["public"]["Enums"]["gate_type"] | null
          id?: string
          order_index?: number | null
          source_id: string
          target_id: string
        }
        Update: {
          analysis_id?: string
          created_at?: string | null
          gate_type?: Database["public"]["Enums"]["gate_type"] | null
          id?: string
          order_index?: number | null
          source_id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "node_edges_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "node_edges_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "node_edges_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      nodes: {
        Row: {
          analysis_id: string
          collapsed: boolean | null
          created_at: string | null
          evidence_status: string | null
          id: string
          label: string
          metric: string | null
          notes: string | null
          position: Json | null
          specification: string | null
          tags: string[] | null
          type: Database["public"]["Enums"]["node_type"]
          units: string | null
          updated_at: string | null
        }
        Insert: {
          analysis_id: string
          collapsed?: boolean | null
          created_at?: string | null
          evidence_status?: string | null
          id?: string
          label: string
          metric?: string | null
          notes?: string | null
          position?: Json | null
          specification?: string | null
          tags?: string[] | null
          type: Database["public"]["Enums"]["node_type"]
          units?: string | null
          updated_at?: string | null
        }
        Update: {
          analysis_id?: string
          collapsed?: boolean | null
          created_at?: string | null
          evidence_status?: string | null
          id?: string
          label?: string
          metric?: string | null
          notes?: string | null
          position?: Json | null
          specification?: string | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["node_type"]
          units?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nodes_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      people_directory: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          initials: string
          is_active: boolean | null
          name: string
          organization_id: string
          role: string | null
          site: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          initials: string
          is_active?: boolean | null
          name: string
          organization_id: string
          role?: string | null
          site?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          initials?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          role?: string | null
          site?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_directory_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          initials: string | null
          organization_id: string
          role: Database["public"]["Enums"]["user_role"] | null
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          initials?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["user_role"] | null
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          initials?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_scores: {
        Row: {
          ap_category: string | null
          created_at: string | null
          detection: number | null
          id: string
          node_id: string
          occurrence: number | null
          rpn: number | null
          scale_version_id: string | null
          severity: number | null
          updated_at: string | null
        }
        Insert: {
          ap_category?: string | null
          created_at?: string | null
          detection?: number | null
          id?: string
          node_id: string
          occurrence?: number | null
          rpn?: number | null
          scale_version_id?: string | null
          severity?: number | null
          updated_at?: string | null
        }
        Update: {
          ap_category?: string | null
          created_at?: string | null
          detection?: number | null
          id?: string
          node_id?: string
          occurrence?: number | null
          rpn?: number | null
          scale_version_id?: string | null
          severity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_scores_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: true
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_scores_scale_version_id_fkey"
            columns: ["scale_version_id"]
            isOneToOne: false
            referencedRelation: "scale_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      scale_versions: {
        Row: {
          created_at: string | null
          effective_date: string
          id: string
          items: Json
          scale_id: string
          version: number
        }
        Insert: {
          created_at?: string | null
          effective_date: string
          id?: string
          items: Json
          scale_id: string
          version: number
        }
        Update: {
          created_at?: string | null
          effective_date?: string
          id?: string
          items?: Json
          scale_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "scale_versions_scale_id_fkey"
            columns: ["scale_id"]
            isOneToOne: false
            referencedRelation: "scales"
            referencedColumns: ["id"]
          },
        ]
      }
      scales: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          description: string | null
          analysis_id: string | null
          action_item_id: string | null
          node_id: string | null
          actor_id: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          description?: string | null
          analysis_id?: string | null
          action_item_id?: string | null
          node_id?: string | null
          actor_id?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          type?: Database["public"]["Enums"]["notification_type"]
          title?: string
          description?: string | null
          analysis_id?: string | null
          action_item_id?: string | null
          node_id?: string | null
          actor_id?: string | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          user_id: string
          action_assigned: boolean
          action_due_reminder: boolean
          action_overdue: boolean
          analysis_shared: boolean
          collaboration_updates: boolean
          email_enabled: boolean
          email_digest_frequency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          action_assigned?: boolean
          action_due_reminder?: boolean
          action_overdue?: boolean
          analysis_shared?: boolean
          collaboration_updates?: boolean
          email_enabled?: boolean
          email_digest_frequency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          action_assigned?: boolean
          action_due_reminder?: boolean
          action_overdue?: boolean
          analysis_shared?: boolean
          collaboration_updates?: boolean
          email_enabled?: boolean
          email_digest_frequency?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_nodes_from_table_row: {
        Args: {
          analysis_id_param: string
          failure_mode_top_param: string
          metric_param?: string
          specification_param?: string
          units_param?: string
          why_1_param?: string
          why_2_param?: string
          why_3_param?: string
          why_4_param?: string
          why_5_param?: string
          why_6_param?: string
          why_7_param?: string
          why_8_param?: string
          why_9_param?: string
        }
        Returns: string
      }
      get_leaf_nodes: {
        Args: { analysis_id_param: string }
        Returns: {
          node_id: string
        }[]
      }
      get_node_path: { Args: { node_id: string }; Returns: string[] }
      get_table_projection: {
        Args: { analysis_id_param: string }
        Returns: {
          row_id: string
          path_depth: number
          leaf_node_id: string
          failure_mode_top: string
          why_1: string
          why_2: string
          why_3: string
          why_4: string
          why_5: string
          why_6: string
          why_7: string
          why_8: string
          why_9: string
          units: string
          specification: string
          metric: string
          severity: number
          occurrence: number
          detection: number
          rpn: number
          investigation_item: string
          person_responsible_name: string
          due_date: string
          status: Database["public"]["Enums"]["action_lifecycle_status"]
          result: string
          judgment: number
          remarks: string
          action_count: number
          evidence_count: number
        }[]
      }
      get_user_organization_id: { Args: never; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      update_node_from_table: {
        Args: {
          analysis_id_param: string
          new_label: string
          old_label: string
          path_position: number
        }
        Returns: undefined
      }
    }
    Enums: {
      action_status: "not_started" | "in_progress" | "done" | "blocked"
      action_type: "INVESTIGATION" | "CONTAINMENT" | "CORRECTIVE" | "PREVENTIVE"
      action_lifecycle_status: "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "VERIFIED"
      action_priority: "LOW" | "MEDIUM" | "HIGH"
      evidence_status: "NONE" | "REQUESTED" | "ATTACHED" | "VERIFIED"
      evidence_type: "photo" | "file" | "link" | "note" | "measurement"
      gate_type: "AND" | "OR"
      node_type: "top_event" | "intermediate_event" | "basic_event" | "gate"
      notification_type: "action_assigned" | "action_due" | "action_overdue" | "analysis_shared" | "mention" | "collaboration"
      user_role: "viewer" | "contributor" | "facilitator" | "admin"
      ai_feature_type: "next_whys" | "investigations" | "rewrite_cause" | "controls" | "quality_check"
      ai_suggestion_type: "node" | "action" | "rewrite" | "control" | "fix"
      ai_suggestion_status: "proposed" | "accepted" | "dismissed"
      ai_confidence: "low" | "medium" | "high"
      metadata_field_type: "text" | "number" | "date" | "select" | "multi_select" | "boolean" | "url" | "email"
      metadata_field_scope: "analysis" | "node" | "action_item"
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
      action_status: ["not_started", "in_progress", "done", "blocked"],
      action_type: ["INVESTIGATION", "CONTAINMENT", "CORRECTIVE", "PREVENTIVE"],
      action_lifecycle_status: ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE", "VERIFIED"],
      action_priority: ["LOW", "MEDIUM", "HIGH"],
      evidence_status: ["NONE", "REQUESTED", "ATTACHED", "VERIFIED"],
      evidence_type: ["photo", "file", "link", "note", "measurement"],
      gate_type: ["AND", "OR"],
      node_type: ["top_event", "intermediate_event", "basic_event", "gate"],
      user_role: ["viewer", "contributor", "facilitator", "admin"],
      ai_feature_type: ["next_whys", "investigations", "rewrite_cause", "controls", "quality_check"],
      ai_suggestion_type: ["node", "action", "rewrite", "control", "fix"],
      ai_suggestion_status: ["proposed", "accepted", "dismissed"],
      ai_confidence: ["low", "medium", "high"],
      metadata_field_type: ["text", "number", "date", "select", "multi_select", "boolean", "url", "email"],
      metadata_field_scope: ["analysis", "node", "action_item"],
    },
  },
} as const
