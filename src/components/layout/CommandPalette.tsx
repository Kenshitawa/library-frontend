import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, BookOpen, Users, LayoutDashboard, ArrowRightCircle, ArrowLeftCircle, Clock, Settings } from 'lucide-react'
import { Dialog, DialogBody } from '@/components/ui/Dialog'
import { supabase } from '@/lib/supabase'

export interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{
    titles: Array<{ id: string; title: string; author: string }>
    borrowers: Array<{ id: string; name: string; borrower_no: string }>
  }>({ titles: [], borrowers: [] })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults({ titles: [], borrowers: [] })
      return
    }
  }, [open])

  useEffect(() => {
    if (!query.trim()) {
      setResults({ titles: [], borrowers: [] })
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      const q = query.trim()
      try {
        const [titlesRes, authorsRes, borrowersByNameRes, borrowersByNumberRes] = await Promise.all([
          (supabase as any)
            .from('titles')
            .select('id, title, title_authors(author:authors(name))')
            .ilike('title', `%${q}%`)
            .is('deleted_at', null)
            .limit(5),
          (supabase as any)
            .from('authors')
            .select('id')
            .ilike('name', `%${q}%`)
            .is('deleted_at', null)
            .limit(100),
          (supabase as any)
            .from('borrowers')
            .select('id, name, borrower_no')
            .ilike('name', `%${q}%`)
            .is('deleted_at', null)
            .limit(5),
          (supabase as any)
            .from('borrowers')
            .select('id, name, borrower_no')
            .ilike('borrower_no', `%${q}%`)
            .is('deleted_at', null)
            .limit(5),
        ])

        for (const result of [titlesRes, authorsRes, borrowersByNameRes, borrowersByNumberRes]) {
          if (result.error) throw new Error(result.error.message)
        }

        const authorTitleIds: string[] = []
        if (authorsRes.data?.length) {
          const { data: links, error: linksError } = await (supabase as any)
            .from('title_authors')
            .select('title_id, author_id')
            .in('author_id', authorsRes.data.map((author: { id: string }) => author.id))
            .limit(100)

          if (linksError) throw new Error(linksError.message)
          authorTitleIds.push(
            ...(links || []).map((link: { title_id: string }) => link.title_id)
          )
        }

        const authorTitles = authorTitleIds.length
          ? await (supabase as any)
              .from('titles')
              .select('id, title, title_authors(author:authors(name))')
              .in('id', [...new Set(authorTitleIds)])
              .is('deleted_at', null)
              .limit(5)
          : { data: [], error: null }

        if (authorTitles.error) throw new Error(authorTitles.error.message)

        const titleResults = new Map<string, { id: string; title: string; author: string }>()
        for (const title of [...(titlesRes.data || []), ...(authorTitles.data || [])] as any[]) {
          const authorNames = (title.title_authors || [])
            .map((link: any) => link.author?.name)
            .filter((name: string | null | undefined): name is string => !!name)
          titleResults.set(title.id, {
            id: title.id,
            title: title.title,
            author: authorNames.join(', '),
          })
        }

        const borrowerResults = new Map(
          [...(borrowersByNameRes.data || []), ...(borrowersByNumberRes.data || [])]
            .map((borrower) => [borrower.id, borrower])
        )

        setResults({
          titles: [...titleResults.values()],
          borrowers: [...borrowerResults.values()],
        })
      } catch (err) {
        console.error('Command palette search error:', err)
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  const quickLinks = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Catalog', to: '/catalog', icon: BookOpen },
    { label: 'Borrowers', to: '/borrowers', icon: Users },
    { label: 'Issue Desk', to: '/issue', icon: ArrowRightCircle },
    { label: 'Return Desk', to: '/return', icon: ArrowLeftCircle },
    { label: 'Returns', to: '/returns', icon: Clock },
    { label: 'Settings', to: '/settings', icon: Settings },
  ]

  const handleSelect = (to: string) => {
    navigate(to)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" className="p-0 overflow-hidden">
      <DialogBody className="p-0">
        {/* Search Input */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-4 py-3">
          <Search className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search catalog, borrowers, or pages... (Esc to close)"
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            autoFocus
          />
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* Quick links if no query */}
          {!query.trim() && (
            <div>
              <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Navigation
              </span>
              <div className="mt-1 space-y-0.5">
                {quickLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <button
                      key={link.to}
                      type="button"
                      onClick={() => handleSelect(link.to)}
                      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Icon className="h-4 w-4 text-slate-400" />
                      <span>{link.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Search results */}
          {query.trim() && (
            <div className="space-y-4">
              {loading && (
                <div className="p-4 text-center text-xs text-slate-400">Searching...</div>
              )}

              {!loading && results.titles.length === 0 && results.borrowers.length === 0 && (
                <div className="p-6 text-center text-sm text-slate-400">
                  No matching titles or borrowers found.
                </div>
              )}

              {/* Titles */}
              {results.titles.length > 0 && (
                <div>
                  <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Titles
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {results.titles.map((title) => (
                      <button
                        key={title.id}
                        type="button"
                        onClick={() => handleSelect(`/catalog/${title.id}`)}
                        className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <BookOpen className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {title.title}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0 ml-2">
                          {title.author}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Borrowers */}
              {results.borrowers.length > 0 && (
                <div>
                  <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Borrowers
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {results.borrowers.map((borrower) => (
                      <button
                        key={borrower.id}
                        type="button"
                        onClick={() => handleSelect(`/borrowers/${borrower.id}`)}
                        className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Users className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {borrower.name}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0 ml-2">
                          #{borrower.borrower_no}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogBody>
    </Dialog>
  )
}
