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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alerts_sent: {
        Row: {
          created_at: string
          key: string
        }
        Insert: {
          created_at?: string
          key: string
        }
        Update: {
          created_at?: string
          key?: string
        }
        Relationships: []
      }
      dose_events: {
        Row: {
          confirmed_at: string
          day: string
          elder_id: string
          id: string
          medicine_id: string
        }
        Insert: {
          confirmed_at?: string
          day: string
          elder_id: string
          id?: string
          medicine_id: string
        }
        Update: {
          confirmed_at?: string
          day?: string
          elder_id?: string
          id?: string
          medicine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dose_events_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dose_events_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      elders: {
        Row: {
          created_at: string
          device_token: string
          id: string
          last_active_at: string | null
          last_checkin_date: string | null
          name: string
          owner_id: string
          paired_at: string | null
          pairing_code: string
          sharing_paused: boolean
        }
        Insert: {
          created_at?: string
          device_token?: string
          id?: string
          last_active_at?: string | null
          last_checkin_date?: string | null
          name: string
          owner_id: string
          paired_at?: string | null
          pairing_code?: string
          sharing_paused?: boolean
        }
        Update: {
          created_at?: string
          device_token?: string
          id?: string
          last_active_at?: string | null
          last_checkin_date?: string | null
          name?: string
          owner_id?: string
          paired_at?: string | null
          pairing_code?: string
          sharing_paused?: boolean
        }
        Relationships: []
      }
      medicines: {
        Row: {
          color: string
          created_at: string
          dose: string
          elder_id: string
          id: string
          name: string
          note: string
          pills_remaining: number
          time: string
        }
        Insert: {
          color?: string
          created_at?: string
          dose?: string
          elder_id: string
          id?: string
          name: string
          note?: string
          pills_remaining?: number
          time: string
        }
        Update: {
          color?: string
          created_at?: string
          dose?: string
          elder_id?: string
          id?: string
          name?: string
          note?: string
          pills_remaining?: number
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicines_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          checkin_alerts: boolean
          checkin_by: string
          dose_alerts: boolean
          quiet_enabled: boolean
          quiet_end: string
          quiet_start: string
          sos_alerts: boolean
          sos_ignores_quiet: boolean
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checkin_alerts?: boolean
          checkin_by?: string
          dose_alerts?: boolean
          quiet_enabled?: boolean
          quiet_end?: string
          quiet_start?: string
          sos_alerts?: boolean
          sos_ignores_quiet?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checkin_alerts?: boolean
          checkin_by?: string
          dose_alerts?: boolean
          quiet_enabled?: boolean
          quiet_end?: string
          quiet_start?: string
          sos_alerts?: boolean
          sos_ignores_quiet?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      sos_events: {
        Row: {
          accuracy_m: number | null
          created_at: string
          elder_id: string
          id: string
          latitude: number | null
          longitude: number | null
          resolved: boolean
        }
        Insert: {
          accuracy_m?: number | null
          created_at?: string
          elder_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          resolved?: boolean
        }
        Update: {
          accuracy_m?: number | null
          created_at?: string
          elder_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          resolved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sos_events_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
