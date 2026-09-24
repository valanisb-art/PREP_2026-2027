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
      activity_date_overrides: {
        Row: {
          activity_id: number
          created_at: string
          id: string
          inicio: string | null
          termino: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activity_id: number
          created_at?: string
          id?: string
          inicio?: string | null
          termino?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activity_id?: number
          created_at?: string
          id?: string
          inicio?: string | null
          termino?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      activity_evidence: {
        Row: {
          activity_id: number
          created_at: string
          file_name: string
          file_url: string
          id: string
          section: string
          sub_activity_entregable: string | null
          uploaded_by: string | null
        }
        Insert: {
          activity_id: number
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          section?: string
          sub_activity_entregable?: string | null
          uploaded_by?: string | null
        }
        Update: {
          activity_id?: number
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          section?: string
          sub_activity_entregable?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      activity_status: {
        Row: {
          activity_id: number
          id: string
          section: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activity_id: number
          id?: string
          section?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activity_id?: number
          id?: string
          section?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      activity_text_overrides: {
        Row: {
          actividad: string | null
          created_at: string
          entregable: string | null
          id: string
          static_activity_id: number | null
          sub_entregable: string | null
          updated_at: string
        }
        Insert: {
          actividad?: string | null
          created_at?: string
          entregable?: string | null
          id?: string
          inicio?: string | null
          remisionINE2?: string | null
          static_activity_id?: number | null
          sub_entregable?: string | null
          updated_at?: string
        }
        Update: {
          actividad?: string | null
          created_at?: string
          entregable?: string | null
          id?: string
          inicio?: string | null
          remisionINE2?: string | null
          static_activity_id?: number | null
          sub_entregable?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      custom_activities: {
        Row: {
          actividad: string
          area_interna: string | null
          area_responsable: string | null
          areas_involucradas: string[] | null
          created_at: string
          created_by: string | null
          dias: number | null
          documento: string | null
          entregable: string
          etiquetas: string[] | null
          fundamento: string | null
          id: string
          inicio: string
          organo_aprueba: string | null
          personal_area: string | null
          situacion_critica: string | null
          status: string | null
          termino: string
        }
        Insert: {
          actividad: string
          area_interna?: string | null
          area_responsable?: string | null
          areas_involucradas?: string[] | null
          created_at?: string
          created_by?: string | null
          dias?: number | null
          documento?: string | null
          entregable: string
          etiquetas?: string[] | null
          fundamento?: string | null
          id?: string
          inicio: string
          organo_aprueba?: string | null
          personal_area?: string | null
          situacion_critica?: string | null
          status?: string | null
          termino: string
        }
        Update: {
          actividad?: string
          area_interna?: string | null
          area_responsable?: string | null
          areas_involucradas?: string[] | null
          created_at?: string
          created_by?: string | null
          dias?: number | null
          documento?: string | null
          entregable?: string
          etiquetas?: string[] | null
          fundamento?: string | null
          id?: string
          inicio?: string
          organo_aprueba?: string | null
          personal_area?: string | null
          situacion_critica?: string | null
          status?: string | null
          termino?: string
        }
        Relationships: []
      }
      custom_sub_activities: {
        Row: {
          actividad: string
          created_at: string
          documento: string | null
          entregable: string
          id: string
          level: number
          parent_activity_id: string | null
          parent_static_activity_id: number | null
        }
        Insert: {
          actividad: string
          created_at?: string
          documento?: string | null
          entregable: string
          id?: string
          inicio?: string | null
          level?: number
          parent_activity_id?: string | null
          parent_static_activity_id?: number | null
          remisionINE2?: string | null
        }
        Update: {
          actividad?: string
          created_at?: string
          documento?: string | null
          entregable?: string
          id?: string
          inicio?: string | null
          level?: number
          parent_activity_id?: string | null
          parent_static_activity_id?: number | null
          remisionINE2?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_sub_activities_parent_activity_id_fkey"
            columns: ["parent_activity_id"]
            isOneToOne: false
            referencedRelation: "custom_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_activities: {
        Row: {
          activity_id: number
          deleted_at: string
          deleted_by: string | null
          id: string
        }
        Insert: {
          activity_id: number
          deleted_at?: string
          deleted_by?: string | null
          id?: string
        }
        Update: {
          activity_id?: number
          deleted_at?: string
          deleted_by?: string | null
          id?: string
        }
        Relationships: []
      }
      hidden_static_subs: {
        Row: {
          created_at: string
          hidden_by: string | null
          id: string
          static_activity_id: number
          sub_entregable: string
        }
        Insert: {
          created_at?: string
          hidden_by?: string | null
          id?: string
          static_activity_id: number
          sub_entregable: string
        }
        Update: {
          created_at?: string
          hidden_by?: string | null
          id?: string
          static_activity_id?: number
          sub_entregable?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "operativo" | "invitado"
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
      app_role: ["admin", "operativo", "invitado"],
    },
  },
} as const
