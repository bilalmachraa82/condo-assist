export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          assistance_id: string | null
          created_at: string
          details: string | null
          id: string
          metadata: Json | null
          supplier_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          assistance_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          metadata?: Json | null
          supplier_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          assistance_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          metadata?: Json | null
          supplier_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_assistance_id_fkey"
            columns: ["assistance_id"]
            isOneToOne: false
            referencedRelation: "assistances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      assistance_photos: {
        Row: {
          assistance_id: string
          caption: string | null
          created_at: string
          file_url: string
          id: string
          photo_type: string
          uploaded_by: string | null
          uploaded_by_supplier: string | null
        }
        Insert: {
          assistance_id: string
          caption?: string | null
          created_at?: string
          file_url: string
          id?: string
          photo_type: string
          uploaded_by?: string | null
          uploaded_by_supplier?: string | null
        }
        Update: {
          assistance_id?: string
          caption?: string | null
          created_at?: string
          file_url?: string
          id?: string
          photo_type?: string
          uploaded_by?: string | null
          uploaded_by_supplier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assistance_photos_assistance_id_fkey"
            columns: ["assistance_id"]
            isOneToOne: false
            referencedRelation: "assistances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistance_photos_uploaded_by_supplier_fkey"
            columns: ["uploaded_by_supplier"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      assistances: {
        Row: {
          admin_notes: string | null
          assigned_supplier_id: string | null
          building_id: string
          completed_date: string | null
          created_at: string
          created_by: string | null
          deadline_response: string | null
          description: string | null
          estimated_cost: number | null
          final_cost: number | null
          id: string
          intervention_type_id: string
          priority: Database["public"]["Enums"]["assistance_priority"]
          scheduled_date: string | null
          status: Database["public"]["Enums"]["assistance_status"]
          supplier_notes: string | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_supplier_id?: string | null
          building_id: string
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          deadline_response?: string | null
          description?: string | null
          estimated_cost?: number | null
          final_cost?: number | null
          id?: string
          intervention_type_id: string
          priority?: Database["public"]["Enums"]["assistance_priority"]
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["assistance_status"]
          supplier_notes?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          assigned_supplier_id?: string | null
          building_id?: string
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          deadline_response?: string | null
          description?: string | null
          estimated_cost?: number | null
          final_cost?: number | null
          id?: string
          intervention_type_id?: string
          priority?: Database["public"]["Enums"]["assistance_priority"]
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["assistance_status"]
          supplier_notes?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistances_assigned_supplier_id_fkey"
            columns: ["assigned_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistances_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistances_intervention_type_id_fkey"
            columns: ["intervention_type_id"]
            isOneToOne: false
            referencedRelation: "intervention_types"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          address: string | null
          admin_notes: string | null
          cadastral_code: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          nif: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          cadastral_code?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          nif?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          cadastral_code?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          nif?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      communications_log: {
        Row: {
          assistance_id: string
          created_at: string
          id: string
          message: string
          message_type: string | null
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          assistance_id: string
          created_at?: string
          id?: string
          message: string
          message_type?: string | null
          sender_id?: string | null
          sender_type: string
        }
        Update: {
          assistance_id?: string
          created_at?: string
          id?: string
          message?: string
          message_type?: string | null
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_log_assistance_id_fkey"
            columns: ["assistance_id"]
            isOneToOne: false
            referencedRelation: "assistances"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          archived_at: string
          assistance_id: string | null
          email_content: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          sent_at: string
          status: string
          subject: string
          supplier_id: string | null
          template_used: string | null
        }
        Insert: {
          archived_at?: string
          assistance_id?: string | null
          email_content?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          sent_at?: string
          status: string
          subject: string
          supplier_id?: string | null
          template_used?: string | null
        }
        Update: {
          archived_at?: string
          assistance_id?: string | null
          email_content?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          sent_at?: string
          status?: string
          subject?: string
          supplier_id?: string | null
          template_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_assistance_id_fkey"
            columns: ["assistance_id"]
            isOneToOne: false
            referencedRelation: "assistances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_types: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          urgency_level: Database["public"]["Enums"]["assistance_priority"]
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          urgency_level?: Database["public"]["Enums"]["assistance_priority"]
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          urgency_level?: Database["public"]["Enums"]["assistance_priority"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotations: {
        Row: {
          amount: number
          approved_at: string | null
          assistance_id: string
          created_at: string
          description: string | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["quotation_status"]
          submitted_at: string | null
          supplier_id: string
          validity_days: number | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          assistance_id: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["quotation_status"]
          submitted_at?: string | null
          supplier_id: string
          validity_days?: number | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          assistance_id?: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["quotation_status"]
          submitted_at?: string | null
          supplier_id?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_assistance_id_fkey"
            columns: ["assistance_id"]
            isOneToOne: false
            referencedRelation: "assistances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_magic_codes: {
        Row: {
          assistance_id: string | null
          created_at: string
          expires_at: string
          id: string
          is_used: boolean
          magic_code: string
          supplier_id: string
        }
        Insert: {
          assistance_id?: string | null
          created_at?: string
          expires_at: string
          id?: string
          is_used?: boolean
          magic_code: string
          supplier_id: string
        }
        Update: {
          assistance_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          magic_code?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_magic_codes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          admin_notes: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          nif: string | null
          phone: string | null
          rating: number | null
          specialization: string | null
          total_jobs: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          nif?: string | null
          phone?: string | null
          rating?: number | null
          specialization?: string | null
          total_jobs?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          nif?: string | null
          phone?: string | null
          rating?: number | null
          specialization?: string | null
          total_jobs?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_magic_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "supplier"
      assistance_priority: "normal" | "urgent" | "critical"
      assistance_status:
        | "pending"
        | "sent_to_suppliers"
        | "quotes_received"
        | "quote_approved"
        | "scheduled"
        | "in_progress"
        | "awaiting_approval"
        | "completed"
        | "cancelled"
      quotation_status:
        | "pending"
        | "submitted"
        | "approved"
        | "rejected"
        | "expired"
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
      app_role: ["admin", "user", "supplier"],
      assistance_priority: ["normal", "urgent", "critical"],
      assistance_status: [
        "pending",
        "sent_to_suppliers",
        "quotes_received",
        "quote_approved",
        "scheduled",
        "in_progress",
        "awaiting_approval",
        "completed",
        "cancelled",
      ],
      quotation_status: [
        "pending",
        "submitted",
        "approved",
        "rejected",
        "expired",
      ],
    },
  },
} as const
