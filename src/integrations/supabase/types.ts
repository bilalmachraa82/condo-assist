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
      app_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
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
      assistance_progress: {
        Row: {
          assistance_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          photo_urls: string[] | null
          progress_type: string
          supplier_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          assistance_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          photo_urls?: string[] | null
          progress_type: string
          supplier_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          assistance_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          photo_urls?: string[] | null
          progress_type?: string
          supplier_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistance_progress_assistance_id_fkey"
            columns: ["assistance_id"]
            isOneToOne: false
            referencedRelation: "assistances"
            referencedColumns: ["id"]
          },
        ]
      }
      assistances: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          admin_notes: string | null
          assigned_supplier_id: string | null
          assistance_number: number
          building_id: string
          completed_date: string | null
          completion_photos_required: boolean | null
          created_at: string
          created_by: string | null
          deadline_response: string | null
          description: string | null
          escalated_at: string | null
          estimated_cost: number | null
          estimated_duration_hours: number | null
          expected_completion_date: string | null
          final_cost: number | null
          follow_up_count: number | null
          id: string
          intervention_type_id: string
          last_follow_up_sent: string | null
          last_quotation_follow_up_sent: string | null
          last_work_reminder_sent: string | null
          priority: Database["public"]["Enums"]["assistance_priority"]
          progress_notes: string | null
          quotation_deadline: string | null
          quotation_follow_up_count: number | null
          quotation_requested_at: string | null
          requires_quotation: boolean | null
          requires_validation: boolean | null
          response_deadline: string | null
          scheduled_date: string | null
          scheduled_end_date: string | null
          scheduled_start_date: string | null
          status: Database["public"]["Enums"]["assistance_status"]
          supplier_notes: string | null
          title: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          work_reminder_count: number | null
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          admin_notes?: string | null
          assigned_supplier_id?: string | null
          assistance_number: number
          building_id: string
          completed_date?: string | null
          completion_photos_required?: boolean | null
          created_at?: string
          created_by?: string | null
          deadline_response?: string | null
          description?: string | null
          escalated_at?: string | null
          estimated_cost?: number | null
          estimated_duration_hours?: number | null
          expected_completion_date?: string | null
          final_cost?: number | null
          follow_up_count?: number | null
          id?: string
          intervention_type_id: string
          last_follow_up_sent?: string | null
          last_quotation_follow_up_sent?: string | null
          last_work_reminder_sent?: string | null
          priority?: Database["public"]["Enums"]["assistance_priority"]
          progress_notes?: string | null
          quotation_deadline?: string | null
          quotation_follow_up_count?: number | null
          quotation_requested_at?: string | null
          requires_quotation?: boolean | null
          requires_validation?: boolean | null
          response_deadline?: string | null
          scheduled_date?: string | null
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          status?: Database["public"]["Enums"]["assistance_status"]
          supplier_notes?: string | null
          title: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          work_reminder_count?: number | null
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          admin_notes?: string | null
          assigned_supplier_id?: string | null
          assistance_number?: number
          building_id?: string
          completed_date?: string | null
          completion_photos_required?: boolean | null
          created_at?: string
          created_by?: string | null
          deadline_response?: string | null
          description?: string | null
          escalated_at?: string | null
          estimated_cost?: number | null
          estimated_duration_hours?: number | null
          expected_completion_date?: string | null
          final_cost?: number | null
          follow_up_count?: number | null
          id?: string
          intervention_type_id?: string
          last_follow_up_sent?: string | null
          last_quotation_follow_up_sent?: string | null
          last_work_reminder_sent?: string | null
          priority?: Database["public"]["Enums"]["assistance_priority"]
          progress_notes?: string | null
          quotation_deadline?: string | null
          quotation_follow_up_count?: number | null
          quotation_requested_at?: string | null
          requires_quotation?: boolean | null
          requires_validation?: boolean | null
          response_deadline?: string | null
          scheduled_date?: string | null
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          status?: Database["public"]["Enums"]["assistance_status"]
          supplier_notes?: string | null
          title?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          work_reminder_count?: number | null
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
      follow_up_schedules: {
        Row: {
          assistance_id: string
          attempt_count: number
          created_at: string
          follow_up_type: string
          id: string
          max_attempts: number
          metadata: Json | null
          next_attempt_at: string | null
          priority: Database["public"]["Enums"]["assistance_priority"]
          scheduled_for: string
          sent_at: string | null
          status: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          assistance_id: string
          attempt_count?: number
          created_at?: string
          follow_up_type: string
          id?: string
          max_attempts?: number
          metadata?: Json | null
          next_attempt_at?: string | null
          priority?: Database["public"]["Enums"]["assistance_priority"]
          scheduled_for: string
          sent_at?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          assistance_id?: string
          attempt_count?: number
          created_at?: string
          follow_up_type?: string
          id?: string
          max_attempts?: number
          metadata?: Json | null
          next_attempt_at?: string | null
          priority?: Database["public"]["Enums"]["assistance_priority"]
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_schedules_assistance_id_fkey"
            columns: ["assistance_id"]
            isOneToOne: false
            referencedRelation: "assistances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_schedules_supplier_id_fkey"
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
      magic_code_attempts: {
        Row: {
          attempt_time: string | null
          id: string
          ip_address: unknown | null
          magic_code: string | null
          success: boolean | null
        }
        Insert: {
          attempt_time?: string | null
          id?: string
          ip_address?: unknown | null
          magic_code?: string | null
          success?: boolean | null
        }
        Update: {
          attempt_time?: string | null
          id?: string
          ip_address?: unknown | null
          magic_code?: string | null
          success?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          assistance_id: string
          created_at: string
          id: string
          metadata: Json | null
          notification_type: string
          priority: string
          reminder_count: number | null
          scheduled_for: string
          sent_at: string | null
          status: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          assistance_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          notification_type: string
          priority: string
          reminder_count?: number | null
          scheduled_for: string
          sent_at?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          assistance_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          notification_type?: string
          priority?: string
          reminder_count?: number | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
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
          approved_by: string | null
          assistance_id: string
          created_at: string
          description: string | null
          id: string
          is_requested: boolean | null
          notes: string | null
          requested_at: string | null
          status: Database["public"]["Enums"]["quotation_status"]
          submitted_at: string | null
          supplier_id: string
          validity_days: number | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          assistance_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_requested?: boolean | null
          notes?: string | null
          requested_at?: string | null
          status?: Database["public"]["Enums"]["quotation_status"]
          submitted_at?: string | null
          supplier_id: string
          validity_days?: number | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          assistance_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_requested?: boolean | null
          notes?: string | null
          requested_at?: string | null
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
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: unknown
          request_count: number
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address: unknown
          request_count?: number
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: unknown
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      supplier_access_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown | null
          magic_code: string
          metadata: Json | null
          success: boolean | null
          supplier_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          magic_code: string
          metadata?: Json | null
          success?: boolean | null
          supplier_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          magic_code?: string
          metadata?: Json | null
          success?: boolean | null
          supplier_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      supplier_magic_codes: {
        Row: {
          access_count: number | null
          assistance_id: string | null
          created_at: string
          expires_at: string
          id: string
          is_used: boolean
          last_used_at: string | null
          magic_code: string
          session_expires_at: string | null
          supplier_id: string
        }
        Insert: {
          access_count?: number | null
          assistance_id?: string | null
          created_at?: string
          expires_at: string
          id?: string
          is_used?: boolean
          last_used_at?: string | null
          magic_code: string
          session_expires_at?: string | null
          supplier_id: string
        }
        Update: {
          access_count?: number | null
          assistance_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          last_used_at?: string | null
          magic_code?: string
          session_expires_at?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_magic_codes_assistance_id_fkey"
            columns: ["assistance_id"]
            isOneToOne: false
            referencedRelation: "assistances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_magic_codes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_responses: {
        Row: {
          assistance_id: string
          created_at: string
          decline_reason: string | null
          estimated_completion_date: string | null
          estimated_duration_hours: number | null
          id: string
          notes: string | null
          response_comments: string | null
          response_date: string | null
          response_type: string
          scheduled_end_date: string | null
          scheduled_start_date: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          assistance_id: string
          created_at?: string
          decline_reason?: string | null
          estimated_completion_date?: string | null
          estimated_duration_hours?: number | null
          id?: string
          notes?: string | null
          response_comments?: string | null
          response_date?: string | null
          response_type: string
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          assistance_id?: string
          created_at?: string
          decline_reason?: string | null
          estimated_completion_date?: string | null
          estimated_duration_hours?: number | null
          id?: string
          notes?: string | null
          response_comments?: string | null
          response_date?: string | null
          response_type?: string
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_responses_assistance_id_fkey"
            columns: ["assistance_id"]
            isOneToOne: false
            referencedRelation: "assistances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_responses_supplier_id_fkey"
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
      assistance_needs_followup: {
        Args: { assistance_id: string }
        Returns: boolean
      }
      atualizar_estado_assistencia_por_codigo: {
        Args: {
          p_magic_code: string
          p_new_status: Database["public"]["Enums"]["assistance_status"]
          p_supplier_notes?: string
        }
        Returns: Json
      }
      auto_process_followups: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      calculate_next_followup: {
        Args: {
          p_attempt_count: number
          p_base_date?: string
          p_follow_up_type: string
          p_priority: Database["public"]["Enums"]["assistance_priority"]
        }
        Returns: string
      }
      calculate_reminder_schedule: {
        Args: {
          assistance_priority: Database["public"]["Enums"]["assistance_priority"]
        }
        Returns: Json
      }
      can_complete_assistance: {
        Args: { assistance_id_param: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: { p_ip: unknown; p_magic_code: string }
        Returns: boolean
      }
      check_supplier_dependencies: {
        Args: { p_supplier_id: string }
        Returns: Json
      }
      create_communication_via_code: {
        Args: {
          p_assistance_id: string
          p_magic_code: string
          p_message: string
          p_message_type?: string
        }
        Returns: Json
      }
      create_quotation_via_code: {
        Args: {
          p_amount: number
          p_assistance_id?: string
          p_description?: string
          p_magic_code: string
          p_notes?: string
          p_validity_days?: number
        }
        Returns: Json
      }
      create_supplier_session: {
        Args: { p_magic_code: string; p_supplier_id: string }
        Returns: Json
      }
      criar_resposta_fornecedor_por_codigo: {
        Args: {
          p_estimated_completion_date?: string
          p_estimated_duration_hours?: number
          p_magic_code: string
          p_notes?: string
          p_response_type: string
          p_scheduled_end_date?: string
          p_scheduled_start_date?: string
        }
        Returns: Json
      }
      generate_assistance_number: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      generate_magic_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_assistances_for_code: {
        Args: { p_magic_code: string }
        Returns: {
          actual_end_date: string
          actual_start_date: string
          building_address: string
          building_id: string
          building_name: string
          completion_photos_required: boolean
          created_at: string
          description: string
          id: string
          intervention_type_id: string
          intervention_type_name: string
          quotation_deadline: string
          quotation_requested_at: string
          requires_quotation: boolean
          requires_validation: boolean
          scheduled_end_date: string
          scheduled_start_date: string
          status: Database["public"]["Enums"]["assistance_status"]
          supplier_notes: string
          title: string
        }[]
      }
      get_basic_suppliers: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          is_active: boolean
          name: string
          rating: number
          specialization: string
          total_jobs: number
        }[]
      }
      get_communications_for_code: {
        Args: { p_assistance_id: string; p_magic_code: string }
        Returns: {
          assistance_id: string
          created_at: string
          id: string
          message: string
          message_type: string
          sender_id: string
          sender_type: string
        }[]
      }
      get_followup_processing_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      link_code_to_latest_assistance: {
        Args: { p_magic_code: string }
        Returns: Json
      }
      log_security_event: {
        Args:
          | { details?: string; event_type: string; metadata?: Json }
          | {
              p_details?: Json
              p_event_type: string
              p_ip_address?: unknown
              p_severity?: string
              p_user_agent?: string
            }
        Returns: undefined
      }
      log_supplier_access: {
        Args: {
          p_action: string
          p_magic_code: string
          p_metadata?: Json
          p_success?: boolean
          p_supplier_id: string
        }
        Returns: undefined
      }
      magic_code_valid_days: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      process_pending_followups: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      purge_supplier_non_critical: {
        Args: { p_supplier_id: string }
        Returns: Json
      }
      safe_delete_supplier: {
        Args: { p_supplier_id: string }
        Returns: Json
      }
      schedule_assistance_reminders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      validate_supplier_session: {
        Args: { p_magic_code: string }
        Returns: Json
      }
      validate_supplier_session_secure: {
        Args: {
          p_ip_address?: unknown
          p_magic_code: string
          p_user_agent?: string
        }
        Returns: Json
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
        | "awaiting_quotation"
        | "quotation_received"
        | "quotation_approved"
        | "quotation_rejected"
        | "accepted"
        | "awaiting_validation"
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
        "awaiting_quotation",
        "quotation_received",
        "quotation_approved",
        "quotation_rejected",
        "accepted",
        "awaiting_validation",
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
