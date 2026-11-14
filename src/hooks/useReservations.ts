import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Reservation } from '@/types'

export function useReservations(statusFilter?: string, titleId?: string) {
  return useQuery({
    queryKey: ['reservations', statusFilter, titleId],
    queryFn: async (): Promise<Reservation[]> => {
      let query = (supabase as any)
        .from('reservations')
        .select(`
          *,
          borrower:borrowers(*, class:classes(*)),
          title:titles(*),
          ready_copy:copies(*)
        `)
        .order('placed_at', { ascending: true })

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (titleId) {
        query = query.eq('title_id', titleId)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data || []) as Reservation[]
    },
  })
}

export function useCreateReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      titleId,
      borrowerId,
    }: {
      titleId: string
      borrowerId: string
    }) => {
      // 1. Calculate next queue position for this title
      const { count } = await (supabase as any)
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('title_id', titleId)
        .in('status', ['waiting', 'ready'])

      const nextPos = (count || 0) + 1

      // 2. Check if copy is already available right now
      const { data: availableCopy } = await (supabase as any)
        .from('copies')
        .select('id')
        .eq('title_id', titleId)
        .eq('status', 'available')
        .limit(1)
        .maybeSingle()

      let status = 'waiting'
      let readyCopyId: string | null = null
      let pickupDeadline: string | null = null

      if (availableCopy) {
        status = 'ready'
        readyCopyId = availableCopy.id
        const deadline = new Date()
        deadline.setDate(deadline.getDate() + 3)
        pickupDeadline = deadline.toISOString()
      }

      // 3. Insert reservation
      const { data, error } = await (supabase as any)
        .from('reservations')
        .insert({
          title_id: titleId,
          borrower_id: borrowerId,
          status,
          ready_copy_id: readyCopyId,
          pickup_deadline: pickupDeadline,
          queue_position: nextPos,
        })
        .select(`
          *,
          borrower:borrowers(*),
          title:titles(*)
        `)
        .single()

      if (error) throw new Error(error.message)

      // If marked ready, update copy status to reserved
      if (readyCopyId) {
        await (supabase as any)
          .from('copies')
          .update({ status: 'reserved' })
          .eq('id', readyCopyId)
      }

      return data as Reservation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['copies'] })
      queryClient.invalidateQueries({ queryKey: ['titles'] })
    },
  })
}

export function useCancelReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reservationId: string) => {
      // Find reservation
      const { data: res } = await (supabase as any)
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .single()

      if (!res) throw new Error('Reservation not found')

      const { data, error } = await (supabase as any)
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservationId)
        .select()
        .single()

      if (error) throw new Error(error.message)

      // If it was ready and holding a copy, check if next in line or release copy
      if (res.status === 'ready' && res.ready_copy_id) {
        const { error: rpcErr } = await (supabase as any).rpc('handle_return_reservations', {
          p_copy_id: res.ready_copy_id,
        })

        if (rpcErr) {
          // Fallback: release copy to available
          await (supabase as any)
            .from('copies')
            .update({ status: 'available' })
            .eq('id', res.ready_copy_id)
        }
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['copies'] })
    },
  })
}

export function useFulfillReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reservationId: string) => {
      const { data, error } = await (supabase as any)
        .from('reservations')
        .update({ status: 'fulfilled' })
        .eq('id', reservationId)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
    },
  })
}
