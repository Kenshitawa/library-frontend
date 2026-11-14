import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Charge, Payment, CopyCondition } from '@/types'

export function useCharges(filters?: {
  status?: string
  type?: string
  borrowerId?: string
}) {
  return useQuery({
    queryKey: ['charges', filters],
    queryFn: async (): Promise<Charge[]> => {
      let query = (supabase as any)
        .from('charges')
        .select(`
          *,
          borrower:borrowers(*, class:classes(*)),
          issue:issues(
            *,
            copy:copies(
              *,
              title:titles(*)
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type)
      }
      if (filters?.borrowerId) {
        query = query.eq('borrower_id', filters.borrowerId)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data || []) as Charge[]
    },
  })
}

export function useChargeSummary() {
  return useQuery({
    queryKey: ['charge-summary'],
    queryFn: async () => {
      const { data: charges, error } = await (supabase as any)
        .from('charges')
        .select('amount, paid_amount, status, type')
        .is('deleted_at', null)

      if (error) throw new Error(error.message)

      let totalCharged = 0
      let totalPaid = 0
      let totalOutstanding = 0
      let totalWaived = 0
      let lostBooksCount = 0
      let damagedBooksCount = 0

      for (const c of charges || []) {
        totalCharged += c.amount || 0
        totalPaid += c.paid_amount || 0

        if (c.status === 'waived') {
          totalWaived += c.amount || 0
        } else if (c.status === 'open' || c.status === 'partial') {
          totalOutstanding += (c.amount || 0) - (c.paid_amount || 0)
        }

        if (c.type === 'lost') lostBooksCount++
        if (c.type === 'damaged') damagedBooksCount++
      }

      return {
        totalCharged,
        totalPaid,
        totalOutstanding,
        totalWaived,
        lostBooksCount,
        damagedBooksCount,
      }
    },
  })
}

export function useCreatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      chargeId,
      borrowerId,
      amount,
      receivedBy,
      notes,
    }: {
      chargeId: string
      borrowerId: string
      amount: number
      receivedBy: string
      notes?: string
    }) => {
      // 1. Fetch current charge
      const { data: charge, error: cErr } = await (supabase as any)
        .from('charges')
        .select('*')
        .eq('id', chargeId)
        .single()

      if (cErr || !charge) throw new Error('Charge not found')

      const newPaidAmount = (charge.paid_amount || 0) + amount
      const newStatus = newPaidAmount >= charge.amount ? 'paid' : 'partial'
      const receiptNo = `REC-${Date.now().toString().slice(-6)}`

      // 2. Create payment record
      const { data: payment, error: pErr } = await (supabase as any)
        .from('payments')
        .insert({
          charge_id: chargeId,
          borrower_id: borrowerId,
          amount,
          received_by: receivedBy,
          receipt_no: receiptNo,
          notes: notes || null,
        })
        .select()
        .single()

      if (pErr) throw new Error(pErr.message)

      // 3. Update charge paid_amount and status
      const { error: uErr } = await (supabase as any)
        .from('charges')
        .update({
          paid_amount: newPaidAmount,
          status: newStatus,
        })
        .eq('id', chargeId)

      if (uErr) throw new Error(uErr.message)

      // 4. Try invoking generate-receipt edge function
      try {
        await (supabase as any).functions.invoke('generate-receipt', {
          body: { payment_id: payment.id },
        })
      } catch (e) {
        console.warn('generate-receipt edge function invocation skipped:', e)
      }

      return payment as Payment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] })
      queryClient.invalidateQueries({ queryKey: ['charge-summary'] })
      queryClient.invalidateQueries({ queryKey: ['borrowers'] })
    },
  })
}

export function useWaiveCharge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      chargeId,
      waivedBy,
      reason,
    }: {
      chargeId: string
      waivedBy: string
      reason: string
    }) => {
      if (!reason || reason.trim().length === 0) {
        throw new Error('A waiver reason is required')
      }

      const { data, error } = await (supabase as any)
        .from('charges')
        .update({
          status: 'waived',
          waived_by: waivedBy,
          waive_reason: reason.trim(),
        })
        .eq('id', chargeId)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] })
      queryClient.invalidateQueries({ queryKey: ['charge-summary'] })
      queryClient.invalidateQueries({ queryKey: ['borrowers'] })
    },
  })
}

export function useCreateCharge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      borrowerId,
      issueId,
      type,
      amount,
      reason,
    }: {
      borrowerId: string
      issueId?: string
      type: 'lost' | 'damaged' | 'overdue' | 'manual'
      amount: number
      reason: string
    }) => {
      const { data, error } = await (supabase as any)
        .from('charges')
        .insert({
          borrower_id: borrowerId,
          issue_id: issueId || null,
          type,
          amount,
          paid_amount: 0,
          status: 'open',
          reason: reason.trim(),
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] })
      queryClient.invalidateQueries({ queryKey: ['charge-summary'] })
      queryClient.invalidateQueries({ queryKey: ['borrowers'] })
    },
  })
}

export function useAcceptReplacementCopy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      chargeId,
      titleId,
      barcode,
      condition = 'good',
      locationId,
      userId,
    }: {
      chargeId: string
      titleId: string
      barcode: string
      condition?: CopyCondition
      locationId?: string
      userId: string
    }) => {
      // 1. Create replacement copy
      const { data: newCopy, error: cErr } = await (supabase as any)
        .from('copies')
        .insert({
          title_id: titleId,
          barcode: barcode.trim(),
          status: 'available',
          condition,
          location_id: locationId || null,
        })
        .select()
        .single()

      if (cErr) throw new Error(cErr.message)

      // 2. Fetch charge and related issue
      const { data: charge } = await (supabase as any)
        .from('charges')
        .select('*, issue:issues(*)')
        .eq('id', chargeId)
        .single()

      // 3. Mark charge as waived/settled with reason
      await (supabase as any)
        .from('charges')
        .update({
          status: 'waived',
          waived_by: userId,
          waive_reason: `Settled via replacement copy (Barcode: ${barcode})`,
        })
        .eq('id', chargeId)

      // 4. If linked to an issue, mark issue returned
      if (charge?.issue_id) {
        await (supabase as any)
          .from('issues')
          .update({
            status: 'returned',
            returned_at: new Date().toISOString(),
            returned_to: userId,
            return_note: `Settled with replacement copy ${barcode}`,
          })
          .eq('id', charge.issue_id)
      }

      // 5. Audit log
      await (supabase as any).from('audit_log').insert({
        user_id: userId,
        action: 'accept_replacement_copy',
        entity: 'charges',
        entity_id: chargeId,
        after: { barcode, title_id: titleId, copy_id: newCopy.id },
      })

      return newCopy
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] })
      queryClient.invalidateQueries({ queryKey: ['charge-summary'] })
      queryClient.invalidateQueries({ queryKey: ['copies'] })
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['borrowers'] })
    },
  })
}
