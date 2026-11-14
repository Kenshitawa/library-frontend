import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Borrower } from '@/types'

export interface ClassLearnerStatus {
  borrower: Borrower
  alreadyIssued: boolean
  existingIssueId?: string
  copyBarcode?: string
}

export function useClassLearners(classId?: string, titleId?: string) {
  return useQuery({
    queryKey: ['class-learners', classId, titleId],
    enabled: !!classId,
    queryFn: async (): Promise<ClassLearnerStatus[]> => {
      if (!classId) return []

      // 1. Get learners in this class
      const { data: learners, error: lErr } = await (supabase as any)
        .from('borrowers')
        .select('*, borrower_type:borrower_types(*), class:classes(*)')
        .eq('class_id', classId)
        .order('name', { ascending: true })

      if (lErr) throw new Error(lErr.message)
      if (!learners || learners.length === 0) return []

      // 2. If titleId is selected, find which learners already hold this title
      let openIssuesMap = new Map<string, { issueId: string; barcode: string }>()
      if (titleId) {
        const learnerIds = learners.map((l: any) => l.id)
        const { data: openIssues, error: iErr } = await (supabase as any)
          .from('issues')
          .select(`
            id,
            borrower_id,
            copy:copies!inner(
              id,
              barcode,
              title_id
            )
          `)
          .in('borrower_id', learnerIds)
          .eq('status', 'open')
          .eq('copies.title_id', titleId)

        if (!iErr && openIssues) {
          openIssues.forEach((issue: any) => {
            openIssuesMap.set(issue.borrower_id, {
              issueId: issue.id,
              barcode: issue.copy?.barcode || '',
            })
          })
        }
      }

      return learners.map((learner: any) => {
        const existing = openIssuesMap.get(learner.id)
        return {
          borrower: learner,
          alreadyIssued: !!existing,
          existingIssueId: existing?.issueId,
          copyBarcode: existing?.barcode,
        }
      })
    },
  })
}

export function useAvailableCopiesCount(titleId?: string) {
  return useQuery({
    queryKey: ['available-copies-count', titleId],
    enabled: !!titleId,
    queryFn: async (): Promise<number> => {
      if (!titleId) return 0
      const { count, error } = await (supabase as any)
        .from('copies')
        .select('*', { count: 'exact', head: true })
        .eq('title_id', titleId)
        .eq('status', 'available')

      if (error) return 0
      return count || 0
    },
  })
}

export function useIssueToClass() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      classId,
      titleId,
      issuedBy,
      dueAt,
      learnerIds,
    }: {
      classId: string
      titleId: string
      issuedBy: string
      dueAt: string
      learnerIds: string[]
    }) => {
      // 1. Try single RPC call for atomic and <10s bulk processing
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc('issue_to_class', {
        p_class_id: classId,
        p_title_id: titleId,
        p_issued_by: issuedBy,
        p_due_at: dueAt,
        p_learner_ids: learnerIds,
      })

      if (!rpcError && rpcData) {
        return rpcData
      }

      // 2. Client-side fallback if RPC not yet deployed
      console.warn('RPC issue_to_class unavailable, using client fallback:', rpcError?.message)

      // Fetch available copies
      const { data: copies, error: cErr } = await (supabase as any)
        .from('copies')
        .select('id, barcode, condition')
        .eq('title_id', titleId)
        .eq('status', 'available')
        .limit(learnerIds.length)

      if (cErr) throw new Error(cErr.message)
      if (!copies || copies.length < learnerIds.length) {
        throw new Error(
          `Insufficient available copies: need ${learnerIds.length}, but only ${copies?.length || 0} available.`
        )
      }

      let issuedCount = 0
      for (let i = 0; i < learnerIds.length; i++) {
        const copy = copies[i]
        const learnerId = learnerIds[i]

        const { error: insErr } = await (supabase as any).from('issues').insert({
          copy_id: copy.id,
          borrower_id: learnerId,
          issued_at: new Date().toISOString(),
          due_at: dueAt,
          issued_by: issuedBy,
          condition_at_issue: copy.condition || 'good',
          status: 'open',
          renewal_count: 0,
        })

        if (!insErr) {
          await (supabase as any)
            .from('copies')
            .update({ status: 'issued' })
            .eq('id', copy.id)
          issuedCount++
        }
      }

      return {
        success: true,
        issued_count: issuedCount,
        skipped_count: learnerIds.length - issuedCount,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['copies'] })
      queryClient.invalidateQueries({ queryKey: ['titles'] })
      queryClient.invalidateQueries({ queryKey: ['class-learners'] })
      queryClient.invalidateQueries({ queryKey: ['available-copies-count'] })
    },
  })
}

export function usePromoteClass() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      sourceClassId,
      destClassId,
      userId,
    }: {
      sourceClassId: string
      destClassId: string
      userId: string
    }) => {
      // 1. Try RPC
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc('promote_class', {
        p_source_class_id: sourceClassId,
        p_dest_class_id: destClassId,
        p_user_id: userId,
      })

      if (!rpcError && rpcData) {
        return rpcData
      }

      // 2. Fallback
      const { data, error } = await (supabase as any)
        .from('borrowers')
        .update({ class_id: destClassId })
        .eq('class_id', sourceClassId)
        .select()

      if (error) throw new Error(error.message)

      // Audit log entry
      await (supabase as any).from('audit_log').insert({
        user_id: userId,
        action: 'promote_class',
        entity: 'classes',
        entity_id: sourceClassId,
        before: { source_class_id: sourceClassId },
        after: { dest_class_id: destClassId, count: data?.length || 0 },
      })

      return {
        success: true,
        promoted_count: data?.length || 0,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowers'] })
      queryClient.invalidateQueries({ queryKey: ['class-learners'] })
    },
  })
}
