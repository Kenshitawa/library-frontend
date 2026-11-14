import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface NotificationRecord {
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
  borrower?: { name: string; borrower_no: string } | null
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<NotificationRecord[]> => {
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*, borrower:borrowers(name, borrower_no)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw new Error(error.message)
      return (data || []) as NotificationRecord[]
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: true,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await (supabase as any).rpc('mark_notification_read', {
        p_notification_id: notificationId,
      })

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
