import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { LibraryProfile } from '@/types'

export function useLibraryProfile() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['library_profile'],
    queryFn: async (): Promise<LibraryProfile> => {
      const { data, error } = await supabase
        .from('library_profile')
        .select('*')
        .limit(1)
        .single()

      if (error) {
        throw new Error(error.message)
      }
      return data as LibraryProfile
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (updated: Partial<LibraryProfile>) => {
      const { data: profile } = await (supabase as any).from('library_profile').select('id').limit(1).single()
      if (!profile?.id) throw new Error('Library profile not found')

      const { data, error } = await (supabase as any)
        .from('library_profile')
        .update(updated)
        .eq('id', profile.id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as LibraryProfile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library_profile'] })
    },
  })

  return {
    profile: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  }
}
