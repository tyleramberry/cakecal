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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      events: {
        Row: {
          bake_duration_days: number | null
          bake_duration_hours: number | null
          cake_name: string
          client_name: string
          created_at: string
          date: string
          duration_hours: number | null
          end_time: string | null
          id: string
          linked_order_id: string | null
          notes: string
          start_time: string | null
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          bake_duration_days?: number | null
          bake_duration_hours?: number | null
          cake_name?: string
          client_name?: string
          created_at?: string
          date: string
          duration_hours?: number | null
          end_time?: string | null
          id?: string
          linked_order_id?: string | null
          notes?: string
          start_time?: string | null
          type: Database["public"]["Enums"]["event_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          bake_duration_days?: number | null
          bake_duration_hours?: number | null
          cake_name?: string
          client_name?: string
          created_at?: string
          date?: string
          duration_hours?: number | null
          end_time?: string | null
          id?: string
          linked_order_id?: string | null
          notes?: string
          start_time?: string | null
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_linked_order_id_fkey"
            columns: ["linked_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          balance_paid: boolean
          cake_name: string
          categories: string[]
          client_name: string
          consultation_date: string | null
          contact: string
          created_at: string
          delivery_date: string | null
          deposit_amount: number
          deposit_paid: boolean
          design_notes: string
          dietary_restrictions: string
          finish: string
          flavor: string
          id: string
          layers: number
          price: number
          reference_photos: string[]
          servings: number
          size: string
          status: Database["public"]["Enums"]["order_status"]
          tiers: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_paid?: boolean
          cake_name?: string
          categories?: string[]
          client_name?: string
          consultation_date?: string | null
          contact?: string
          created_at?: string
          delivery_date?: string | null
          deposit_amount?: number
          deposit_paid?: boolean
          design_notes?: string
          dietary_restrictions?: string
          finish?: string
          flavor?: string
          id?: string
          layers?: number
          price?: number
          reference_photos?: string[]
          servings?: number
          size?: string
          status?: Database["public"]["Enums"]["order_status"]
          tiers?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_paid?: boolean
          cake_name?: string
          categories?: string[]
          client_name?: string
          consultation_date?: string | null
          contact?: string
          created_at?: string
          delivery_date?: string | null
          deposit_amount?: number
          deposit_paid?: boolean
          design_notes?: string
          dietary_restrictions?: string
          finish?: string
          flavor?: string
          id?: string
          layers?: number
          price?: number
          reference_photos?: string[]
          servings?: number
          size?: string
          status?: Database["public"]["Enums"]["order_status"]
          tiers?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string
          order_id: string | null
          payment_date: string
          payment_method: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string
          order_id?: string | null
          payment_date?: string
          payment_method?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string
          order_id?: string | null
          payment_date?: string
          payment_method?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      event_type: "bake" | "delivery" | "consultation"
      order_status:
        | "Inquiry"
        | "Confirmed"
        | "In Production"
        | "Ready"
        | "Delivered"
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
      event_type: ["bake", "delivery", "consultation"],
      order_status: [
        "Inquiry",
        "Confirmed",
        "In Production",
        "Ready",
        "Delivered",
      ],
    },
  },
} as const
