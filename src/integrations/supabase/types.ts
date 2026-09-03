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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          batch_id: string
          created_at: string
          date: string
          id: string
          institute_id: string
          marked_by: string | null
          status: string
          student_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          date: string
          id?: string
          institute_id: string
          marked_by?: string | null
          status: string
          student_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          date?: string
          id?: string
          institute_id?: string
          marked_by?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          batch_id: string
          created_at: string
          expires_at: string
          id: string
          institute_id: string
          session_date: string
          started_at: string
          triggered_by: string | null
          triggered_by_teacher_id: string | null
          window_minutes: number
        }
        Insert: {
          batch_id: string
          created_at?: string
          expires_at: string
          id?: string
          institute_id: string
          session_date?: string
          started_at?: string
          triggered_by?: string | null
          triggered_by_teacher_id?: string | null
          window_minutes?: number
        }
        Update: {
          batch_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          institute_id?: string
          session_date?: string
          started_at?: string
          triggered_by?: string | null
          triggered_by_teacher_id?: string | null
          window_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_triggered_by_teacher_id_fkey"
            columns: ["triggered_by_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_students: {
        Row: {
          batch_id: string
          id: string
          student_id: string
        }
        Insert: {
          batch_id: string
          id?: string
          student_id: string
        }
        Update: {
          batch_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_students_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_teachers: {
        Row: {
          batch_id: string
          id: string
          teacher_id: string
        }
        Insert: {
          batch_id: string
          id?: string
          teacher_id: string
        }
        Update: {
          batch_id?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_teachers_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          batch_id: string | null
          created_at: string
          game_id: string | null
          id: string
          institute_id: string
          name: string
          teacher_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          institute_id: string
          name: string
          teacher_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          institute_id?: string
          name?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batches_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_history: {
        Row: {
          amount: number | null
          collected_amount: number | null
          created_at: string
          excess_amount: number | null
          fee_id: string | null
          game_id: string | null
          id: string
          institute_id: string
          month: string
          notes: string | null
          payment_mode: string | null
          status: string
          student_id: string
          updated_by: string | null
          updated_by_role: string | null
        }
        Insert: {
          amount?: number | null
          collected_amount?: number | null
          created_at?: string
          excess_amount?: number | null
          fee_id?: string | null
          game_id?: string | null
          id?: string
          institute_id: string
          month: string
          notes?: string | null
          payment_mode?: string | null
          status: string
          student_id: string
          updated_by?: string | null
          updated_by_role?: string | null
        }
        Update: {
          amount?: number | null
          collected_amount?: number | null
          created_at?: string
          excess_amount?: number | null
          fee_id?: string | null
          game_id?: string | null
          id?: string
          institute_id?: string
          month?: string
          notes?: string | null
          payment_mode?: string | null
          status?: string
          student_id?: string
          updated_by?: string | null
          updated_by_role?: string | null
        }
        Relationships: []
      }
      fees: {
        Row: {
          amount: number | null
          collected_amount: number | null
          created_at: string
          excess_amount: number | null
          game_id: string | null
          id: string
          institute_id: string
          month: string
          notes: string | null
          payment_mode: string | null
          status: string
          student_id: string
          updated_by: string | null
        }
        Insert: {
          amount?: number | null
          collected_amount?: number | null
          created_at?: string
          excess_amount?: number | null
          game_id?: string | null
          id?: string
          institute_id: string
          month: string
          notes?: string | null
          payment_mode?: string | null
          status?: string
          student_id: string
          updated_by?: string | null
        }
        Update: {
          amount?: number | null
          collected_amount?: number | null
          created_at?: string
          excess_amount?: number | null
          game_id?: string | null
          id?: string
          institute_id?: string
          month?: string
          notes?: string | null
          payment_mode?: string | null
          status?: string
          student_id?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fees_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          description: string | null
          game_id: string | null
          id: string
          institute_id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          game_id?: string | null
          id?: string
          institute_id: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          game_id?: string | null
          id?: string
          institute_id?: string
          name?: string
        }
        Relationships: []
      }
      institutes: {
        Row: {
          about: string | null
          address: string | null
          attendance_auto_absent: boolean
          attendance_automation_enabled: boolean
          attendance_window_minutes: number
          auto_batch_id: boolean
          auto_game_id: boolean
          auto_student_id: boolean
          auto_teacher_id: boolean
          branch_count: number | null
          city: string | null
          code: string
          contact_number: string | null
          country: string | null
          created_at: string
          email: string
          established_year: number | null
          facebook: string | null
          gst_number: string | null
          id: string
          instagram: string | null
          institute_type: string | null
          logo_url: string | null
          name: string
          owner_name: string | null
          pin_code: string | null
          registration_number: string | null
          show_batch_id: boolean
          show_game_id: boolean
          state: string | null
          subscription_plan: string | null
          user_id: string
          website: string | null
          youtube: string | null
        }
        Insert: {
          about?: string | null
          address?: string | null
          attendance_auto_absent?: boolean
          attendance_automation_enabled?: boolean
          attendance_window_minutes?: number
          auto_batch_id?: boolean
          auto_game_id?: boolean
          auto_student_id?: boolean
          auto_teacher_id?: boolean
          branch_count?: number | null
          city?: string | null
          code: string
          contact_number?: string | null
          country?: string | null
          created_at?: string
          email: string
          established_year?: number | null
          facebook?: string | null
          gst_number?: string | null
          id?: string
          instagram?: string | null
          institute_type?: string | null
          logo_url?: string | null
          name: string
          owner_name?: string | null
          pin_code?: string | null
          registration_number?: string | null
          show_batch_id?: boolean
          show_game_id?: boolean
          state?: string | null
          subscription_plan?: string | null
          user_id: string
          website?: string | null
          youtube?: string | null
        }
        Update: {
          about?: string | null
          address?: string | null
          attendance_auto_absent?: boolean
          attendance_automation_enabled?: boolean
          attendance_window_minutes?: number
          auto_batch_id?: boolean
          auto_game_id?: boolean
          auto_student_id?: boolean
          auto_teacher_id?: boolean
          branch_count?: number | null
          city?: string | null
          code?: string
          contact_number?: string | null
          country?: string | null
          created_at?: string
          email?: string
          established_year?: number | null
          facebook?: string | null
          gst_number?: string | null
          id?: string
          instagram?: string | null
          institute_type?: string | null
          logo_url?: string | null
          name?: string
          owner_name?: string | null
          pin_code?: string | null
          registration_number?: string | null
          show_batch_id?: boolean
          show_game_id?: boolean
          state?: string | null
          subscription_plan?: string | null
          user_id?: string
          website?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          institute_id: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          institute_id?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          institute_id?: string | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      student_games: {
        Row: {
          created_at: string
          game_id: string
          id: string
          institute_id: string
          monthly_fee: number
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          institute_id: string
          monthly_fee?: number
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          institute_id?: string
          monthly_fee?: number
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          created_at: string
          dob: string
          emergency_contact: string | null
          gender: string | null
          id: string
          institute_id: string
          parent_name: string | null
          parent_phone: string | null
          reg_no: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dob: string
          emergency_contact?: string | null
          gender?: string | null
          id?: string
          institute_id: string
          parent_name?: string | null
          parent_phone?: string | null
          reg_no: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dob?: string
          emergency_contact?: string | null
          gender?: string | null
          id?: string
          institute_id?: string
          parent_name?: string | null
          parent_phone?: string | null
          reg_no?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      teacher_attendance: {
        Row: {
          batch_id: string
          created_at: string
          date: string
          id: string
          institute_id: string
          marked_by: string | null
          status: string
          teacher_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          date: string
          id?: string
          institute_id: string
          marked_by?: string | null
          status?: string
          teacher_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          date?: string
          id?: string
          institute_id?: string
          marked_by?: string | null
          status?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          birth_year: string
          blood_group: string | null
          created_at: string
          date_of_birth: string | null
          emergency_contact: string | null
          gender: string | null
          id: string
          institute_id: string
          phone: string
          role: string
          teacher_id: string | null
          user_id: string
        }
        Insert: {
          birth_year: string
          blood_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string | null
          gender?: string | null
          id?: string
          institute_id: string
          phone: string
          role?: string
          teacher_id?: string | null
          user_id: string
        }
        Update: {
          birth_year?: string
          blood_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string | null
          gender?: string | null
          id?: string
          institute_id?: string
          phone?: string
          role?: string
          teacher_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          institute_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          institute_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          institute_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_institute_code: { Args: never; Returns: string }
      get_user_institute_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "teacher", "student"],
    },
  },
} as const
