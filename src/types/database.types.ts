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
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: number
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: never
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: never
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: number
          is_read: boolean
          message: string
          ticket_id: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          is_read?: boolean
          message: string
          ticket_id?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          is_read?: boolean
          message?: string
          ticket_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          is_rt_verified: boolean
          phone: string | null
          region_id: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          is_rt_verified?: boolean
          phone?: string | null
          region_id?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_rt_verified?: boolean
          phone?: string | null
          region_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          name: string
          rw: string
        }
        Insert: {
          created_at?: string
          id?: never
          is_active?: boolean
          name: string
          rw?: string
        }
        Update: {
          created_at?: string
          id?: never
          is_active?: boolean
          name?: string
          rw?: string
        }
        Relationships: []
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: number
          mime_type: string
          size_bytes: number
          storage_path: string
          ticket_id: number
          type: Database["public"]["Enums"]["attachment_type"]
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: never
          mime_type: string
          size_bytes: number
          storage_path: string
          ticket_id: number
          type: Database["public"]["Enums"]["attachment_type"]
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: never
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          ticket_id?: number
          type?: Database["public"]["Enums"]["attachment_type"]
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_timeline: {
        Row: {
          actor_id: string | null
          actor_name: string
          actor_role: string
          created_at: string
          from_status: Database["public"]["Enums"]["ticket_status"] | null
          id: number
          note: string | null
          ticket_id: number
          to_status: Database["public"]["Enums"]["ticket_status"]
        }
        Insert: {
          actor_id?: string | null
          actor_name: string
          actor_role: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["ticket_status"] | null
          id?: never
          note?: string | null
          ticket_id: number
          to_status: Database["public"]["Enums"]["ticket_status"]
        }
        Update: {
          actor_id?: string | null
          actor_name?: string
          actor_role?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["ticket_status"] | null
          id?: never
          note?: string | null
          ticket_id?: number
          to_status?: Database["public"]["Enums"]["ticket_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ticket_timeline_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          category_id: number
          completed_at: string | null
          created_at: string
          description: string
          handler_rt_id: string | null
          handler_rw_id: string | null
          id: number
          location_landmark: string | null
          processed_at: string | null
          rated_at: string | null
          rating: number | null
          rating_comment: string | null
          region_id: number
          rejected_at: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          submitted_at: string | null
          ticket_number: string | null
          title: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          category_id: number
          completed_at?: string | null
          created_at?: string
          description: string
          handler_rt_id?: string | null
          handler_rw_id?: string | null
          id?: never
          location_landmark?: string | null
          processed_at?: string | null
          rated_at?: string | null
          rating?: number | null
          rating_comment?: string | null
          region_id: number
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          submitted_at?: string | null
          ticket_number?: string | null
          title: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          category_id?: number
          completed_at?: string | null
          created_at?: string
          description?: string
          handler_rt_id?: string | null
          handler_rw_id?: string | null
          id?: never
          location_landmark?: string | null
          processed_at?: string | null
          rated_at?: string | null
          rating?: number | null
          rating_comment?: string | null
          region_id?: number
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          submitted_at?: string | null
          ticket_number?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _count_laporan_attachments: {
        Args: { p_ticket_id: number }
        Returns: number
      }
      _get_actor_info: { Args: never; Returns: Record<string, unknown> }
      _is_caller_active: { Args: never; Returns: boolean }
      _notify_users: {
        Args: { p_message: string; p_ticket_id: number; p_user_ids: string[] }
        Returns: undefined
      }
      complete_ticket: { Args: { p_ticket_id: number }; Returns: undefined }
      generate_ticket_number: { Args: { p_year?: number }; Returns: string }
      process_ticket: { Args: { p_ticket_id: number }; Returns: undefined }
      public_stats: { Args: never; Returns: Json }
      rate_ticket: {
        Args: { p_comment?: string; p_rating: number; p_ticket_id: number }
        Returns: undefined
      }
      reject_ticket: {
        Args: { p_reason: string; p_ticket_id: number }
        Returns: undefined
      }
      submit_ticket: { Args: { p_ticket_id: number }; Returns: undefined }
      verify_resident:
        | {
            Args: { p_is_verified?: boolean; p_user_id: string }
            Returns: undefined
          }
        | {
            Args: { p_region_id: number; p_user_id: string }
            Returns: undefined
          }
      verify_ticket: { Args: { p_ticket_id: number }; Returns: undefined }
    }
    Enums: {
      attachment_type: "laporan" | "penyelesaian"
      ticket_status:
        | "draft"
        | "terkirim"
        | "diverifikasi_rt"
        | "diproses_rw"
        | "selesai"
        | "ditolak"
      user_role: "warga" | "ketua_rt" | "ketua_rw" | "admin"
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
      attachment_type: ["laporan", "penyelesaian"],
      ticket_status: [
        "draft",
        "terkirim",
        "diverifikasi_rt",
        "diproses_rw",
        "selesai",
        "ditolak",
      ],
      user_role: ["warga", "ketua_rt", "ketua_rw", "admin"],
    },
  },
} as const

// Convenience aliases
export type UserRole = Database["public"]["Enums"]["user_role"]
export type TicketStatus = Database["public"]["Enums"]["ticket_status"]
export type AttachmentType = Database["public"]["Enums"]["attachment_type"]

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Region = Database["public"]["Tables"]["regions"]["Row"]
export type Category = Database["public"]["Tables"]["categories"]["Row"]
export type Ticket = Database["public"]["Tables"]["tickets"]["Row"]
export type TicketAttachment = Database["public"]["Tables"]["ticket_attachments"]["Row"]
export type TicketTimeline = Database["public"]["Tables"]["ticket_timeline"]["Row"]
export type Notification = Database["public"]["Tables"]["notifications"]["Row"]
