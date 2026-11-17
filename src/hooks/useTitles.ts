import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Title, Copy, Subject, Location, CopyStatus, CopyCondition } from '@/types'

export interface TitleFilters {
  search?: string
  subjectId?: string
  bookType?: 'textbook' | 'library' | 'reference' | 'all'
  gradeLevel?: string
  language?: string
  availability?: 'all' | 'available'
}

export function useTitles(filters?: TitleFilters) {
  return useQuery({
    queryKey: ['titles', filters],
    queryFn: async (): Promise<Title[]> => {
      let query = (supabase as any)
        .from('titles')
        .select(`
          *,
          subject:subjects(*),
          copies(*),
          title_authors(author:authors(name))
        `)
        .is('deleted_at', null)
        .order('title', { ascending: true })

      if (filters?.subjectId) {
        query = query.eq('subject_id', filters.subjectId)
      }
      if (filters?.bookType && filters.bookType !== 'all') {
        query = query.eq('type', filters.bookType)
      }
      if (filters?.gradeLevel) {
        query = query.eq('grade_level', filters.gradeLevel)
      }
      if (filters?.language) {
        query = query.eq('language', filters.language)
      }
      if (filters?.search) {
        const s = filters.search.trim()
        let authorTitleIds: string[] = []
        const { data: matchingAuthors, error: authorError } = await (supabase as any)
          .from('authors')
          .select('id')
          .ilike('name', `%${s}%`)
          .is('deleted_at', null)
          .limit(100)

        if (authorError) throw new Error(authorError.message)

        if (matchingAuthors?.length) {
          const { data: authorLinks, error: linksError } = await (supabase as any)
            .from('title_authors')
            .select('title_id')
            .in('author_id', matchingAuthors.map((author: { id: string }) => author.id))
            .limit(1000)

          if (linksError) throw new Error(linksError.message)
          authorTitleIds = Array.from(
            new Set<string>((authorLinks || []).map((link: { title_id: string }) => link.title_id))
          )
        }

        const searchFilters = [
          `title.ilike.%${s}%`,
          `subtitle.ilike.%${s}%`,
          `isbn10.ilike.%${s}%`,
          `isbn13.ilike.%${s}%`,
        ]
        if (authorTitleIds.length) {
          searchFilters.push(`id.in.(${authorTitleIds.join(',')})`)
        }
        query = query.or(searchFilters.join(','))
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)

      // Calculate availability counts
      const enriched = (data || []).map((t: any) => {
        const copies: Copy[] = t.copies || []
        const availableCount = copies.filter((c) => c.status === 'available').length
        const authors = (t.title_authors || [])
          .map((link: any) => link.author?.name)
          .filter((name: string | null | undefined): name is string => !!name)
        return {
          ...t,
          author: authors.join(', ') || null,
          available_copies_count: availableCount,
          total_copies_count: copies.length,
        }
      })

      if (filters?.availability === 'available') {
        return enriched.filter((t: any) => (t.available_copies_count || 0) > 0)
      }

      return enriched
    },
  })
}

export function useTitle(id: string | undefined) {
  return useQuery({
    queryKey: ['title', id],
    enabled: !!id,
    queryFn: async (): Promise<Title | null> => {
      if (!id) return null

      const { data, error } = await (supabase as any)
        .from('titles')
        .select(`
          *,
          subject:subjects(*),
          title_authors(author:authors(name)),
          copies(
            *,
            location:locations(*)
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (error) throw new Error(error.message)

      const copies: Copy[] = data.copies || []
      const availableCount = copies.filter((c) => c.status === 'available').length
      const authors = (data.title_authors || [])
        .map((link: any) => link.author?.name)
        .filter((name: string | null | undefined): name is string => !!name)

      return {
        ...data,
        author: authors.join(', ') || null,
        available_copies_count: availableCount,
        total_copies_count: copies.length,
      } as Title
    },
  })
}

export function useSubjects() {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await (supabase as any)
        .from('subjects')
        .select('*')
        .is('deleted_at', null)
        .order('name')

      if (error) throw new Error(error.message)
      return (data || []) as Subject[]
    },
  })
}

export function useCreateSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string): Promise<Subject> => {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Enter a subject name.')

      // Reuse an existing subject instead of creating duplicates.
      const { data: existing, error: lookupError } = await (supabase as any)
        .from('subjects')
        .select('*')
        .ilike('name', trimmed)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle()

      if (lookupError) throw new Error(lookupError.message)
      if (existing) return existing as Subject

      const { data, error } = await (supabase as any)
        .from('subjects')
        .insert({ name: trimmed })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as Subject
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })
}

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async (): Promise<Location[]> => {
      const { data, error } = await (supabase as any)
        .from('locations')
        .select('*')
        .is('deleted_at', null)
        .order('name')

      if (error) throw new Error(error.message)
      return (data || []) as Location[]
    },
  })
}

export function useCreateTitle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (titleData: Partial<Title>) => {
      const authorNames = (titleData.author || '')
        .split(/[;,]/)
        .map((name) => name.trim())
        .filter(Boolean)
      const { author: _author, ...titleFields } = titleData
      const { data, error } = await (supabase as any)
        .from('titles')
        .insert(titleFields)
        .select()
        .single()

      if (error) throw new Error(error.message)

      const createdAuthorIds: string[] = []
      try {
        for (const name of authorNames) {
          const { data: existingAuthor, error: authorLookupError } = await (supabase as any)
            .from('authors')
            .select('id')
            .eq('name', name)
            .is('deleted_at', null)
            .limit(1)
            .maybeSingle()

          if (authorLookupError) throw new Error(authorLookupError.message)

          let authorId = existingAuthor?.id
          if (!authorId) {
            const { data: author, error: authorInsertError } = await (supabase as any)
              .from('authors')
              .insert({ name })
              .select('id')
              .single()

            if (authorInsertError) throw new Error(authorInsertError.message)
            authorId = author.id
            createdAuthorIds.push(authorId)
          }

          const { error: linkError } = await (supabase as any)
            .from('title_authors')
            .insert({ title_id: data.id, author_id: authorId })

          if (linkError) throw new Error(linkError.message)
        }
      } catch (authorError) {
        const deletedAt = new Date().toISOString()
        const { error: titleCleanupError } = await (supabase as any)
          .from('titles')
          .update({ deleted_at: deletedAt })
          .eq('id', data.id)

        if (createdAuthorIds.length > 0) {
          const { error: authorCleanupError } = await (supabase as any)
            .from('authors')
            .update({ deleted_at: deletedAt })
            .in('id', createdAuthorIds)

          if (authorCleanupError) {
            throw new Error(`Could not save title author details or clean up new authors: ${authorCleanupError.message}`)
          }
        }

        if (titleCleanupError) {
          throw new Error(`Could not save title author details or clean up the new title: ${titleCleanupError.message}`)
        }

        throw authorError
      }

      return { ...data, author: authorNames.join(', ') || null } as Title
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titles'] })
    },
  })
}

export function useUpdateTitle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Title> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('titles')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as Title
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['titles'] })
      queryClient.invalidateQueries({ queryKey: ['title', variables.id] })
    },
  })
}

export function useAddCopy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (copyData: {
      title_id: string
      barcode: string
      location_id?: string
      call_number?: string
      price?: number
      condition?: CopyCondition
      status?: CopyStatus
    }) => {
      const { data, error } = await (supabase as any)
        .from('copies')
        .insert({
          ...copyData,
          condition: copyData.condition || 'good',
          status: copyData.status || 'available',
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error(`Barcode "${copyData.barcode}" already exists in the system.`)
        }
        throw new Error(error.message)
      }
      return data as Copy
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['title', variables.title_id] })
      queryClient.invalidateQueries({ queryKey: ['titles'] })
    },
  })
}

export function useUpdateCopyStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      titleId,
      status,
      condition,
    }: {
      id: string
      titleId: string
      status?: CopyStatus
      condition?: CopyCondition
    }) => {
      const updates: any = {}
      if (status) updates.status = status
      if (condition) updates.condition = condition

      const { data, error } = await (supabase as any)
        .from('copies')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as Copy
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['title', variables.titleId] })
      queryClient.invalidateQueries({ queryKey: ['titles'] })
    },
  })
}
