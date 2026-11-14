import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Borrower, BorrowerType, ClassGroup, Issue, Charge } from '@/types'

export interface BorrowerFilters {
  search?: string
  borrowerTypeId?: string
  classId?: string
  status?: 'active' | 'inactive' | 'all'
}

export function useBorrowers(filters?: BorrowerFilters) {
  return useQuery({
    queryKey: ['borrowers', filters],
    queryFn: async (): Promise<Borrower[]> => {
      let query = (supabase as any)
        .from('borrowers')
        .select(`
          *,
          borrower_type:borrower_types(*),
          class:classes(*)
        `)
        .order('name', { ascending: true })

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters?.borrowerTypeId) {
        query = query.eq('borrower_type_id', filters.borrowerTypeId)
      }
      if (filters?.classId) {
        query = query.eq('class_id', filters.classId)
      }
      if (filters?.search) {
        const s = filters.search.trim()
        query = query.or(`name.ilike.%${s}%,borrower_no.ilike.%${s}%,email.ilike.%${s}%`)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data || []) as Borrower[]
    },
  })
}

export function useBorrower(id: string | undefined) {
  return useQuery({
    queryKey: ['borrower', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null

      const { data: borrower, error: bError } = await (supabase as any)
        .from('borrowers')
        .select(`
          *,
          borrower_type:borrower_types(*),
          class:classes(*)
        `)
        .eq('id', id)
        .single()

      if (bError) throw new Error(bError.message)

      // Fetch open issues
      const { data: issues } = await (supabase as any)
        .from('issues')
        .select(`
          *,
          copy:copies(
            *,
            title:titles(*)
          )
        `)
        .eq('borrower_id', id)
        .order('issued_at', { ascending: false })

      // Fetch charges
      const { data: charges } = await (supabase as any)
        .from('charges')
        .select('*')
        .eq('borrower_id', id)
        .order('created_at', { ascending: false })

      return {
        borrower: borrower as Borrower,
        issues: (issues || []) as Issue[],
        charges: (charges || []) as Charge[],
        openIssuesCount: (issues || []).filter((i: any) => i.status === 'open').length,
        outstandingBalance: (charges || [])
          .filter((c: any) => c.status === 'open' || c.status === 'partial')
          .reduce((sum: number, c: any) => sum + (c.amount - (c.paid_amount || 0)), 0),
      }
    },
  })
}

export function useBorrowerTypes() {
  return useQuery({
    queryKey: ['borrower_types'],
    queryFn: async (): Promise<BorrowerType[]> => {
      const { data, error } = await (supabase as any)
        .from('borrower_types')
        .select('*')
        .is('deleted_at', null)
        .order('name')

      if (error) throw new Error(error.message)
      return (data || []) as BorrowerType[]
    },
  })
}

export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: async (): Promise<ClassGroup[]> => {
      const { data, error } = await (supabase as any)
        .from('classes')
        .select('*')
        .is('deleted_at', null)
        .order('name')

      if (error) throw new Error(error.message)
      return (data || []) as ClassGroup[]
    },
  })
}

export function useCreateBorrower() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (borrower: Partial<Borrower>) => {
      const { data, error } = await (supabase as any)
        .from('borrowers')
        .insert(borrower)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as Borrower
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowers'] })
    },
  })
}

export function useUpdateBorrower() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Borrower> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('borrowers')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as Borrower
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['borrowers'] })
      queryClient.invalidateQueries({ queryKey: ['borrower', variables.id] })
    },
  })
}
