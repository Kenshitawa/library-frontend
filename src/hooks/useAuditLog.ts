import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AuditLog } from '@/types'

export interface AuditLogFilters {
  action?: string
  entity?: string
  userId?: string
  fromDate?: string
  toDate?: string
}

export function useAuditLog(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: ['audit-log', filters],
    queryFn: async (): Promise<AuditLog[]> => {
      let query = (supabase as any)
        .from('audit_log')
        .select(`
          *,
          user:users_profile(name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (filters?.action) {
        query = query.eq('action', filters.action)
      }
      if (filters?.entity) {
        query = query.eq('entity', filters.entity)
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId)
      }
      if (filters?.fromDate) {
        query = query.gte('created_at', filters.fromDate)
      }
      if (filters?.toDate) {
        query = query.lte('created_at', filters.toDate)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data || []) as AuditLog[]
    },
  })
}
