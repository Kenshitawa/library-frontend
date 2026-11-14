import type { Database } from './database'

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

export type UserRole = 'librarian' | 'teacher'
export type BorrowerStatus = 'active' | 'inactive'
export type CopyStatus = 'available' | 'issued' | 'reserved' | 'in_processing' | 'lost' | 'damaged' | 'withdrawn'
export type CopyCondition = 'good' | 'fair' | 'poor' | 'damaged'
export type IssueStatus = 'open' | 'returned' | 'lost'
export type BookType = 'textbook' | 'library' | 'reference'
export type ChargeType = 'lost' | 'damaged' | 'overdue' | 'manual'
export type ChargeStatus = 'open' | 'partial' | 'paid' | 'waived'
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'not_sent'

export type LibraryProfile = Tables<'library_profile'>
export type Subject = Tables<'subjects'>
export type Location = Tables<'locations'>
export type BorrowerType = Tables<'borrower_types'>
export type ClassGroup = Tables<'classes'>

export type Borrower = Tables<'borrowers'> & {
  borrower_type?: BorrowerType | null
  class?: ClassGroup | null
}

export type Title = Tables<'titles'> & {
  author?: string | null
  subject?: Subject | null
  copies?: Copy[]
  available_copies_count?: number
  total_copies_count?: number
}

export type Copy = Tables<'copies'> & {
  title?: Title | null
  location?: Location | null
}

export type Issue = Tables<'issues'> & {
  copy?: (Copy & { title?: Title | null }) | null
  borrower?: (Borrower & { class?: ClassGroup | null }) | null
}

export type Charge = Tables<'charges'> & {
  borrower?: Borrower | null
  issue?: Issue | null
}

export type Payment = Tables<'payments'>
export type Reservation = Tables<'reservations'> & {
  title?: Title | null
  borrower?: Borrower | null
}

export type UserProfile = Tables<'users_profile'>
export type AuditLog = Tables<'audit_log'> & {
  timestamp?: string
  user?: { name?: string | null; email?: string | null } | null
}
export type CalendarFeed = Tables<'calendar_feeds'>

export interface DueDateStatus {
  status: 'overdue' | 'due-today' | 'due-soon' | 'ok'
  daysRemaining: number
  label: string
}

