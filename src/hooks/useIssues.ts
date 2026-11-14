import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Issue, Copy, CopyCondition } from '@/types'

export function useDueSoon() {
  return useQuery({
    queryKey: ['issues', 'due-soon'],
    queryFn: async (): Promise<Issue[]> => {
      const now = new Date()
      const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await (supabase as any)
        .from('issues')
        .select(`
          *,
          borrower:borrowers(*, class:classes(*)),
          copy:copies(
            *,
            title:titles(*)
          )
        `)
        .eq('status', 'open')
        .gte('due_at', now.toISOString())
        .lte('due_at', inThreeDays)
        .order('due_at', { ascending: true })

      if (error) throw new Error(error.message)
      return (data || []) as Issue[]
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: true,
  })
}

export function useOverdue() {
  return useQuery({
    queryKey: ['issues', 'overdue'],
    queryFn: async (): Promise<Issue[]> => {
      const now = new Date().toISOString()

      const { data, error } = await (supabase as any)
        .from('issues')
        .select(`
          *,
          borrower:borrowers(*, class:classes(*)),
          copy:copies(
            *,
            title:titles(*)
          )
        `)
        .eq('status', 'open')
        .lt('due_at', now)
        .order('due_at', { ascending: true })

      if (error) throw new Error(error.message)
      return (data || []) as Issue[]
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: true,
  })
}

export function useIssueByBarcode(barcode: string | undefined) {
  return useQuery({
    queryKey: ['issue-by-barcode', barcode],
    enabled: !!barcode && barcode.length > 0,
    queryFn: async (): Promise<{ issue: Issue | null; copy: Copy | null }> => {
      if (!barcode) return { issue: null, copy: null }

      // 1. Find copy
      const { data: copyData, error: copyError } = await (supabase as any)
        .from('copies')
        .select(`
          *,
          title:titles(*)
        `)
        .eq('barcode', barcode.trim())
        .maybeSingle()

      if (copyError || !copyData) {
        return { issue: null, copy: null }
      }

      // 2. Find open issue for this copy
      const { data: issueData, error: issueError } = await (supabase as any)
        .from('issues')
        .select(`
          *,
          borrower:borrowers(
            *,
            class:classes(*)
          ),
          copy:copies(
            *,
            title:titles(*)
          )
        `)
        .eq('copy_id', (copyData as any).id)
        .eq('status', 'open')
        .maybeSingle()

      if (issueError) {
        console.warn('Error fetching open issue:', issueError)
      }

      return {
        issue: (issueData as Issue) || null,
        copy: (copyData as Copy) || null,
      }
    },
  })
}

export function useCreateIssue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      copyId,
      borrowerId,
      dueAt,
      issuedBy,
      overrideReason,
    }: {
      copyId: string
      borrowerId: string
      dueAt: string
      issuedBy: string
      overrideReason?: string
    }) => {
      // If not overridden, check blocks via RPC or fallback to evaluation
      if (!overrideReason) {
        const { data: rpcRes, error: rpcErr } = await (supabase as any).rpc('check_issue_blocks', {
          p_copy_id: copyId,
          p_borrower_id: borrowerId,
        })

        if (!rpcErr && rpcRes && Array.isArray(rpcRes) && rpcRes.length > 0 && rpcRes[0].blocked) {
          throw new Error(rpcRes[0].reason)
        }
      }

      // Fetch copy condition
      const { data: copy } = await (supabase as any)
        .from('copies')
        .select('condition')
        .eq('id', copyId)
        .single()

      // Insert issue
      const { data: issue, error: issueError } = await (supabase as any)
        .from('issues')
        .insert({
          copy_id: copyId,
          borrower_id: borrowerId,
          issued_at: new Date().toISOString(),
          due_at: dueAt,
          issued_by: issuedBy,
          condition_at_issue: copy?.condition || 'good',
          status: 'open',
          renewal_count: 0,
        })
        .select(`
          *,
          copy:copies(*, title:titles(*)),
          borrower:borrowers(*)
        `)
        .single()

      if (issueError) throw new Error(issueError.message)

      // Update copy status to issued
      await (supabase as any)
        .from('copies')
        .update({ status: 'issued' })
        .eq('id', copyId)

      return issue as Issue
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['titles'] })
      queryClient.invalidateQueries({ queryKey: ['copies'] })
      queryClient.invalidateQueries({ queryKey: ['borrowers'] })
    },
  })
}

export function useReturnCopy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      issueId,
      copyId,
      returnedTo,
      conditionAtReturn,
      returnNote,
    }: {
      issueId: string
      copyId: string
      returnedTo: string
      conditionAtReturn: CopyCondition
      returnNote?: string
    }) => {
      const now = new Date().toISOString()

      // Close issue
      const { data: updatedIssue, error: issueError } = await (supabase as any)
        .from('issues')
        .update({
          returned_at: now,
          returned_to: returnedTo,
          condition_at_return: conditionAtReturn,
          return_note: returnNote || null,
          status: 'returned',
        })
        .eq('id', issueId)
        .select()
        .single()

      if (issueError) throw new Error(issueError.message)

      // Update copy status and condition
      const newStatus = conditionAtReturn === 'damaged' ? 'damaged' : 'available'
      const { error: copyError } = await (supabase as any)
        .from('copies')
        .update({
          status: newStatus,
          condition: conditionAtReturn,
        })
        .eq('id', copyId)

      if (copyError) throw new Error(copyError.message)

      // Handle reservations queue: if copy is available, offer to waiting reservation
      if (newStatus === 'available') {
        try {
          await (supabase as any).rpc('handle_return_reservations', { p_copy_id: copyId })
        } catch (resErr) {
          console.warn('handle_return_reservations error:', resErr)
        }
      }

      return updatedIssue as Issue
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['titles'] })
      queryClient.invalidateQueries({ queryKey: ['copies'] })
      queryClient.invalidateQueries({ queryKey: ['borrowers'] })
    },
  })
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayIso = todayStart.toISOString()
      const nowIso = new Date().toISOString()
      const threeDaysAhead = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

      // Issued today count
      const { count: issuedToday } = await supabase
        .from('issues')
        .select('*', { count: 'exact', head: true })
        .gte('issued_at', todayIso)

      // Returned today count
      const { count: returnedToday } = await supabase
        .from('issues')
        .select('*', { count: 'exact', head: true })
        .gte('returned_at', todayIso)

      // Overdue count
      const { count: overdueCount } = await supabase
        .from('issues')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')
        .lt('due_at', nowIso)

      // Due soon count (next 3 days)
      const { count: dueSoonCount } = await supabase
        .from('issues')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')
        .gte('due_at', nowIso)
        .lte('due_at', threeDaysAhead)

      return {
        issuedToday: issuedToday || 0,
        returnedToday: returnedToday || 0,
        overdueCount: overdueCount || 0,
        dueSoonCount: dueSoonCount || 0,
      }
    },
    refetchInterval: 30000,
  })
}
