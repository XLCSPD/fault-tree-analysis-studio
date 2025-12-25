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
          analysis_id: string
          created_at: string | null
          id: string
          investigation_item: string
          investigation_result: string | null
          judgment: number | null
          node_id: string | null
          person_responsible_id: string | null
          remarks: string | null
          schedule: string | null
          updated_at: string | null
        }
        Insert: {
          analysis_id: string
          created_at?: string | null
          id?: string
          investigation_item: string
          investigation_result?: string | null
          judgment?: number | null
          node_id?: string | null
          person_responsible_id?: string | null
          remarks?: string | null
          schedule?: string | null
          updated_at?: string | null
        }
        Update: {
          analysis_id?: string
          created_at?: string | null
          id?: string
          investigation_item?: string
          investigation_result?: string | null
          judgment?: number | null
          node_id?: string | null
          person_responsible_id?: string | null
          remarks?: string | null
          schedule?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
        ]
      }
      action_week_status: {
        Row: {
          action_item_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["action_status"]
          updated_at: string | null
          week_number: number
        }
        Insert: {
          action_item_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          updated_at?: string | null
          week_number: number
        }
        Update: {
          action_item_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          updated_at?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "action_week_status_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
        ]
      }
      analyses: {
        Row: {
          abstract: string | null
          analysis_date: string | null
          application: string | null
          created_at: string | null
          created_by: string
          id: string
          model: string | null
          organization_id: string
          part_name: string | null
          problem_statement: string | null
          related_document: string | null
          status: string | null
          title: string
          updated_at: string | null
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
          detection: number
          failure_mode_top: string
          investigation_item: string
          investigation_result: string
          judgment: number
          leaf_node_id: string
          metric: string
          occurrence: number
          person_responsible_name: string
          remarks: string
          row_id: string
          rpn: number
          schedule: string
          severity: number
          specification: string
          units: string
          week_1_status: Database["public"]["Enums"]["action_status"]
          week_2_status: Database["public"]["Enums"]["action_status"]
          week_3_status: Database["public"]["Enums"]["action_status"]
          week_4_status: Database["public"]["Enums"]["action_status"]
          why_1: string
          why_2: string
          why_3: string
          why_4: string
          why_5: string
          why_6: string
          why_7: string
          why_8: string
          why_9: string
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
      evidence_type: "photo" | "file" | "link" | "note" | "measurement"
      gate_type: "AND" | "OR"
      node_type: "top_event" | "intermediate_event" | "basic_event" | "gate"
      user_role: "viewer" | "contributor" | "facilitator" | "admin"
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
      evidence_type: ["photo", "file", "link", "note", "measurement"],
      gate_type: ["AND", "OR"],
      node_type: ["top_event", "intermediate_event", "basic_event", "gate"],
      user_role: ["viewer", "contributor", "facilitator", "admin"],
    },
  },
} as const
