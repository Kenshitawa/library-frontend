// Database type definitions generated from the Supabase schema.
// Re-generate with: npx supabase gen types typescript --local > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      library_profile: {
        Row: {
          id: string
          name: string
          address: string | null
          phone: string | null
          email: string | null
          logo_url: string | null
          term_dates: Json
          primary_color: string
          currency: string
          timezone: string
          damage_window_days: number
          lost_threshold_weeks: number
          lost_reversal_window_weeks: number
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['library_profile']['Row']>
        Update: Partial<Database['public']['Tables']['library_profile']['Row']>
      }
      subjects: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['subjects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['subjects']['Insert']>
      }
      locations: {
        Row: {
          id: string
          name: string
          parent_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['locations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['locations']['Insert']>
      }
      borrower_types: {
        Row: {
          id: string
          name: string
          return_rule: 'fixed_term' | 'year_end' | 'days'
          return_days: number
          max_items: number
          max_renewals: number
          can_reserve: boolean
          overdue_fee_enabled: boolean
          overdue_fee_per_day: number
          charge_threshold: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['borrower_types']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['borrower_types']['Insert']>
      }
      classes: {
        Row: {
          id: string
          name: string
          grade_level: string | null
          stream: string | null
          year: number
          teacher_in_charge_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['classes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['classes']['Insert']>
      }
      borrowers: {
        Row: {
          id: string
          borrower_type_id: string | null
          borrower_no: string
          name: string
          class_id: string | null
          date_of_birth: string | null
          phone: string | null
          email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          guardian_email: string | null
          department: string | null
          status: 'active' | 'inactive'
          joined_on: string | null
          left_on: string | null
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['borrowers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['borrowers']['Insert']>
      }
      users_profile: {
        Row: {
          id: string
          name: string
          email: string
          role: 'librarian' | 'teacher'
          active: boolean
          borrower_id: string | null
          theme: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users_profile']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users_profile']['Insert']>
      }
      authors: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['authors']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['authors']['Insert']>
      }
      titles: {
        Row: {
          id: string
          title: string
          subtitle: string | null
          isbn10: string | null
          isbn13: string | null
          publisher: string | null
          year: number | null
          edition: string | null
          language: string
          subject_id: string | null
          grade_level: string | null
          type: 'textbook' | 'library' | 'reference'
          description: string | null
          cover_url: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['titles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['titles']['Insert']>
      }
      title_authors: {
        Row: {
          title_id: string
          author_id: string
        }
        Insert: Database['public']['Tables']['title_authors']['Row']
        Update: Partial<Database['public']['Tables']['title_authors']['Insert']>
      }
      copies: {
        Row: {
          id: string
          title_id: string
          barcode: string
          location_id: string | null
          call_number: string | null
          status: 'available' | 'issued' | 'reserved' | 'in_processing' | 'lost' | 'damaged' | 'withdrawn'
          condition: 'good' | 'fair' | 'poor' | 'damaged'
          acquired_on: string | null
          price: number | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['copies']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['copies']['Insert']>
      }
      issues: {
        Row: {
          id: string
          copy_id: string
          borrower_id: string
          issued_at: string
          due_at: string
          returned_at: string | null
          renewal_count: number
          condition_at_issue: 'good' | 'fair' | 'poor' | 'damaged'
          condition_at_return: 'good' | 'fair' | 'poor' | 'damaged' | null
          issued_by: string | null
          returned_to: string | null
          status: 'open' | 'returned' | 'lost'
          return_note: string | null
          return_photo_url: string | null
          override_reason: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['issues']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['issues']['Insert']>
      }
      reservations: {
        Row: {
          id: string
          title_id: string
          borrower_id: string
          placed_at: string
          status: 'waiting' | 'ready' | 'fulfilled' | 'cancelled' | 'expired'
          ready_copy_id: string | null
          pickup_deadline: string | null
          queue_position: number | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['reservations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['reservations']['Insert']>
      }
      charges: {
        Row: {
          id: string
          borrower_id: string
          issue_id: string | null
          type: 'lost' | 'damaged' | 'overdue' | 'manual'
          amount: number
          paid_amount: number
          status: 'open' | 'partial' | 'paid' | 'waived'
          reason: string | null
          waived_by: string | null
          waive_reason: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['charges']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['charges']['Insert']>
      }
      payments: {
        Row: {
          id: string
          charge_id: string
          borrower_id: string
          amount: number
          received_by: string | null
          received_at: string
          receipt_no: string | null
          receipt_url: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          borrower_id: string | null
          type: string
          channel: string
          recipient: string | null
          subject: string | null
          body: string | null
          sent_at: string | null
          status: 'pending' | 'sent' | 'failed' | 'not_sent'
          error: string | null
          read_at: string | null
          report_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      inventory_reports: {
        Row: {
          id: string
          generated_at: string
          row_count: number
          snapshot: Json
        }
        Insert: Omit<Database['public']['Tables']['inventory_reports']['Row'], 'id' | 'generated_at'>
        Update: Partial<Database['public']['Tables']['inventory_reports']['Insert']>
      }
      calendar_feeds: {
        Row: {
          id: string
          user_id: string
          token_hash: string
          created_at: string
          revoked_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['calendar_feeds']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['calendar_feeds']['Insert']>
      }
      audit_log: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity: string
          entity_id: string | null
          before: Json | null
          after: Json | null
          ip_addr: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_log']['Row'], 'id' | 'created_at'>
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: {
      get_user_role: {
        Args: Record<string, never>
        Returns: string
      }
      get_borrower_open_issues: {
        Args: { p_borrower_id: string }
        Returns: number
      }
      get_borrower_outstanding_charges: {
        Args: { p_borrower_id: string }
        Returns: number
      }
      check_issue_blocks: {
        Args: { p_copy_id: string; p_borrower_id: string }
        Returns: { blocked: boolean; reason: string }[]
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
  }
}

// Convenience row types
export type LibraryProfile = Database['public']['Tables']['library_profile']['Row']
export type Subject = Database['public']['Tables']['subjects']['Row']
export type Location = Database['public']['Tables']['locations']['Row']
export type BorrowerType = Database['public']['Tables']['borrower_types']['Row']
export type Class = Database['public']['Tables']['classes']['Row']
export type Borrower = Database['public']['Tables']['borrowers']['Row']
export type UserProfile = Database['public']['Tables']['users_profile']['Row']
export type Author = Database['public']['Tables']['authors']['Row']
export type Title = Database['public']['Tables']['titles']['Row']
export type TitleAuthor = Database['public']['Tables']['title_authors']['Row']
export type Copy = Database['public']['Tables']['copies']['Row']
export type Issue = Database['public']['Tables']['issues']['Row']
export type Reservation = Database['public']['Tables']['reservations']['Row']
export type Charge = Database['public']['Tables']['charges']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type CalendarFeed = Database['public']['Tables']['calendar_feeds']['Row']
export type AuditLog = Database['public']['Tables']['audit_log']['Row']

