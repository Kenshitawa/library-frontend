import React, { startTransition, useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Barcode,
  Search,
  User,
  BookOpen,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ArrowRightCircle,
  Trash2,
  Calendar,
  Download,
  Printer,
  History,
  Loader2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/hooks/useAuth'
import { useCreateIssue } from '@/hooks/useIssues'
import { supabase } from '@/lib/supabase'
import type { Borrower, Copy, Title, BorrowerType } from '@/types'
import { evaluateIssueBlocks } from '@/lib/issueBlocks'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useLibraryProfile } from '@/hooks/useLibraryProfile'
import { downloadCirculationReceipt, printCirculationReceipt } from '@/lib/circulationReceipt'
import type { Issue } from '@/types'

// Web Audio API feedback
function playSound(type: 'success' | 'error') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'success') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // High A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.15)
    } else {
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, ctx.currentTime) // Low A3 buzz
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.35)
    }
  } catch (err) {
    // AudioContext blocked or unsupported
  }
}

function authorNames(title: any): string {
  return (title?.title_authors || [])
    .map((link: any) => link?.author?.name)
    .filter((name: string | null | undefined): name is string => !!name)
    .join(', ')
}

interface ScannedBookSessionItem {
  copy: Copy & { title?: Title | null }
  dueAt: string
  blocked: boolean
  blockReason?: string
  override?: boolean
  issued?: boolean
  issue?: Issue
}

interface RecentIssue {
  id: string
  issued_at: string
  due_at: string
  status: string
  borrower: { name: string; borrower_no: string; class?: { name: string } | null } | null
  copy: { barcode: string; title?: { title: string } | null } | null
}

type DeskSuggestion =
  | { key: string; kind: 'borrower'; label: string; detail: string; borrower: any }
  | {
      key: string
      kind: 'title'
      label: string
      detail: string
      available: number
      disabled: boolean
      title: any
    }
  | { key: string; kind: 'copy'; label: string; detail: string; copy: any }

function recentIssueBadge(status: string, dueAt: string) {
  if (status === 'returned') return { label: 'Returned', variant: 'success' as const }
  if (status === 'lost') return { label: 'Lost', variant: 'danger' as const }
  if (new Date(dueAt).getTime() < Date.now()) return { label: 'Overdue', variant: 'danger' as const }
  return { label: 'On loan', variant: 'info' as const }
}

interface IssueScanInputProps {
  inputRef: React.RefObject<HTMLInputElement>
  resetKey: number
  onQueryChange: (value: string) => void
  onFocus: () => void
  onBlur: () => void
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  expanded: boolean
}

// Keep the scanner's controlled keystrokes local so typing stays responsive
// while the larger desk view and its suggestions update at transition priority.
const IssueScanInput = React.memo(function IssueScanInput({
  inputRef,
  resetKey,
  onQueryChange,
  onFocus,
  onBlur,
  onKeyDown,
  expanded,
}: IssueScanInputProps) {
  const [value, setValue] = useState('')

  useEffect(() => setValue(''), [resetKey])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(event) => {
        const nextValue = event.target.value
        setValue(nextValue)
        onQueryChange(nextValue)
      }}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      placeholder="Scan barcode or type learner / book / author..."
      className="w-full text-base sm:text-lg font-mono rounded-lg border-2 border-primary/30 bg-surface-1 px-4 py-3 pl-12 text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
      autoComplete="off"
      role="combobox"
      aria-expanded={expanded}
      aria-autocomplete="list"
    />
  )
})

export const IssueDesk: React.FC = () => {
  const { user, profile } = useAuth()
  const { profile: libraryProfile } = useLibraryProfile()
  const createIssue = useCreateIssue()
  const queryClient = useQueryClient()
  const scanInputRef = useRef<HTMLInputElement>(null)
  const searchTimerRef = useRef<number | null>(null)
  const sessionResetTimerRef = useRef<number | null>(null)

  const [scanQuery, setScanQuery] = useState('')
  const scanQueryRef = useRef('')
  const [scanResetKey, setScanResetKey] = useState(0)
  const [suggestions, setSuggestions] = useState<DeskSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [isSearching, setIsSearching] = useState(false)
  const [selectedBorrower, setSelectedBorrower] = useState<{
    borrower: Borrower
    borrowerType: BorrowerType
    openIssuesCount: number
    hasOverdue: boolean
    outstandingCharges: number
  } | null>(null)

  const [sessionBooks, setSessionBooks] = useState<ScannedBookSessionItem[]>([])
  const [deskMessage, setDeskMessage] = useState<{ type: 'error'; text: string } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [defaultLoanDays, setDefaultLoanDays] = useState(14)

  const updateScanQuery = (value: string) => {
    scanQueryRef.current = value
    startTransition(() => setScanQuery(value))
  }

  const clearScanQuery = () => {
    scanQueryRef.current = ''
    setScanQuery('')
    setScanResetKey((key) => key + 1)
  }

  const { data: recentIssues = [] } = useQuery({
    queryKey: ['recent-issues'],
    queryFn: async (): Promise<RecentIssue[]> => {
      const { data, error } = await (supabase as any)
        .from('issues')
        .select(`
          id, issued_at, due_at, status,
          borrower:borrowers(name, borrower_no, class:classes(name)),
          copy:copies(barcode, title:titles(title))
        `)
        .order('issued_at', { ascending: false })
        .limit(8)

      if (error) throw new Error(error.message)
      return (data || []) as RecentIssue[]
    },
  })

  // Keep scan input focused
  useEffect(() => {
    scanInputRef.current?.focus()
  }, [])

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current)
      if (sessionResetTimerRef.current) window.clearTimeout(sessionResetTimerRef.current)
    }
  }, [])

  // Type-ahead: learners, titles/authors/publishers and exact copies.
  useEffect(() => {
    const rawQuery = scanQuery.trim()
    if (rawQuery.length < 2) {
      setSuggestions([])
      setIsSearching(false)
      return
    }

    const query = rawQuery.replace(/[,%()]/g, ' ').trim()
    if (!query) return

    let alive = true
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current)

    searchTimerRef.current = window.setTimeout(async () => {
      setIsSearching(true)
      try {
        const pattern = `%${query}%`
        const [borrowersRes, copiesRes, authorsRes] = await Promise.all([
          (supabase as any)
            .from('borrowers')
            .select('*, class:classes(name), borrower_type:borrower_types(*)')
            .is('deleted_at', null)
            .or(`name.ilike.${pattern},borrower_no.ilike.${pattern}`)
            .limit(4),
          (supabase as any)
            .from('copies')
            .select('*, title:titles(*, title_authors(author:authors(name)))')
            .is('deleted_at', null)
            .ilike('barcode', pattern)
            .limit(3),
          (supabase as any)
            .from('authors')
            .select('id')
            .is('deleted_at', null)
            .ilike('name', pattern)
            .limit(20),
        ])

        let authorTitleIds: string[] = []
        if (authorsRes.data?.length) {
          const { data: links } = await (supabase as any)
            .from('title_authors')
            .select('title_id')
            .in('author_id', authorsRes.data.map((author: { id: string }) => author.id))
            .limit(200)
          authorTitleIds = Array.from(
            new Set<string>((links || []).map((link: { title_id: string }) => link.title_id))
          )
        }

        const titleFilters = [
          `title.ilike.${pattern}`,
          `subtitle.ilike.${pattern}`,
          `publisher.ilike.${pattern}`,
          `isbn13.ilike.${pattern}`,
          `isbn10.ilike.${pattern}`,
        ]
        if (authorTitleIds.length) {
          titleFilters.push(`id.in.(${authorTitleIds.join(',')})`)
        }

        const { data: titlesData } = await (supabase as any)
          .from('titles')
          .select('*, copies(*), title_authors(author:authors(name))')
          .is('deleted_at', null)
          .or(titleFilters.join(','))
          .order('title')
          .limit(5)

        if (!alive) return

        const borrowerSuggestions: DeskSuggestion[] = (borrowersRes.data || []).map((borrower: any) => ({
          key: `borrower-${borrower.id}`,
          kind: 'borrower',
          label: borrower.name,
          detail: [borrower.borrower_no, borrower.class?.name].filter(Boolean).join(' · '),
          borrower,
        }))

        const copySuggestions: DeskSuggestion[] = (copiesRes.data || []).map((copy: any) => ({
          key: `copy-${copy.id}`,
          kind: 'copy',
          label: copy.title?.title || 'Unknown title',
          detail: `Barcode ${copy.barcode}${
            authorNames(copy.title) ? ` · ${authorNames(copy.title)}` : ''
          }`,
          copy,
        }))

        const titleSuggestions: DeskSuggestion[] = (titlesData || []).map((title: any) => {
          const available = (title.copies || []).filter((copy: any) => copy.status === 'available').length
          const author = authorNames(title)
          return {
            key: `title-${title.id}`,
            kind: 'title',
            label: title.title,
            detail: [author || 'Unknown author', title.publisher].filter(Boolean).join(' · '),
            available,
            disabled: available === 0,
            title,
          }
        })

        setSuggestions(
          [...borrowerSuggestions, ...copySuggestions, ...titleSuggestions].slice(0, 10)
        )
      } catch (err) {
        if (alive) setSuggestions([])
      } finally {
        if (alive) setIsSearching(false)
      }
    }, 180)

    return () => {
      alive = false
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current)
    }
  }, [scanQuery])

  // Auto calculate due date
  const calculateDueDate = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString()
  }

  const cancelSessionReset = () => {
    if (sessionResetTimerRef.current) {
      window.clearTimeout(sessionResetTimerRef.current)
      sessionResetTimerRef.current = null
    }
  }

  const scheduleSessionReset = (delay = 9000) => {
    cancelSessionReset()
    sessionResetTimerRef.current = window.setTimeout(() => {
      setSelectedBorrower(null)
      setSessionBooks([])
      setDeskMessage(null)
      clearScanQuery()
      scanInputRef.current?.focus()
    }, delay)
  }

  const closeSuggestions = () => {
    setShowSuggestions(false)
    setActiveSuggestion(-1)
  }

  const selectBorrowerFromRecord = async (borrower: any) => {
    cancelSessionReset()
    setDeskMessage(null)
    clearScanQuery()
    closeSuggestions()

    try {
      const [issuesRes, chargesRes] = await Promise.all([
        (supabase as any)
          .from('issues')
          .select('*')
          .eq('borrower_id', borrower.id)
          .eq('status', 'open'),
        (supabase as any)
          .from('charges')
          .select('*')
          .eq('borrower_id', borrower.id)
          .in('status', ['open', 'partial', 'pending']),
      ])

      const openIssues = (issuesRes.data || []) as any[]
      const hasOverdue = openIssues.some((issue) => new Date(issue.due_at) < new Date())
      const totalCharges = (chargesRes.data || []).reduce(
        (sum: number, charge: any) => sum + (charge.amount - (charge.paid_amount || 0)),
        0
      )

      const borrowerType: BorrowerType = borrower.borrower_type || {
        max_items: 3,
        charge_threshold: 0,
        return_days: 14,
        name: 'Learner',
      }

      setSelectedBorrower({
        borrower: borrower as Borrower,
        borrowerType,
        openIssuesCount: openIssues.length,
        hasOverdue,
        outstandingCharges: totalCharges,
      })
      if (borrowerType.return_days) setDefaultLoanDays(borrowerType.return_days)
      playSound('success')
      toast.success(`Borrower ready: ${borrower.name}`, { duration: 2500 })
      scanInputRef.current?.focus()
    } catch (err: any) {
      setDeskMessage({
        type: 'error',
        text: err?.message || 'Could not load this borrower.',
      })
    }
  }

  const addCopyToSession = (copyData: any) => {
    cancelSessionReset()
    setDeskMessage(null)

    if (!copyData) return
    if (sessionBooks.some((item) => item.copy.id === copyData.id)) {
      playSound('error')
      setDeskMessage({
        type: 'error',
        text: `Book "${copyData.title?.title || copyData.barcode}" is already in this session.`,
      })
      clearScanQuery()
      closeSuggestions()
      return
    }

    let blocked = false
    let blockReason = ''

    if (selectedBorrower) {
      const check = evaluateIssueBlocks({
        borrower: selectedBorrower.borrower,
        borrowerType: selectedBorrower.borrowerType,
        copy: copyData,
        openIssuesCount:
          selectedBorrower.openIssuesCount +
          sessionBooks.filter((item) => !item.blocked || item.override).length,
        hasOverdue: selectedBorrower.hasOverdue,
        outstandingCharges: selectedBorrower.outstandingCharges,
      })
      blocked = check.blocked
      blockReason = check.reason
    } else {
      blocked = true
      blockReason = 'Scan or select a borrower first.'
    }

    playSound(blocked ? 'error' : 'success')
    setSessionBooks((prev) => [
      ...prev,
      {
        copy: copyData,
        dueAt: calculateDueDate(defaultLoanDays),
        blocked,
        blockReason,
      },
    ])
    setScanQuery('')
    closeSuggestions()
    scanInputRef.current?.focus()
  }

  const chooseSuggestion = async (suggestion: DeskSuggestion) => {
    if (suggestion.kind === 'borrower') {
      await selectBorrowerFromRecord(suggestion.borrower)
      return
    }

    if (suggestion.kind === 'copy') {
      addCopyToSession(suggestion.copy)
      return
    }

    if (suggestion.kind === 'title') {
      if (suggestion.disabled) {
        playSound('error')
        setDeskMessage({
          type: 'error',
          text: `No copies of "${suggestion.label}" are currently on the shelf.`,
        })
        return
      }
      const availableCopy = (suggestion.title.copies || []).find(
        (copy: any) => copy.status === 'available'
      )
      if (!availableCopy) {
        playSound('error')
        setDeskMessage({
          type: 'error',
          text: `No copies of "${suggestion.label}" are currently on the shelf.`,
        })
        return
      }
      addCopyToSession({ ...availableCopy, title: suggestion.title })
    }
  }

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = scanQueryRef.current.trim()
    if (!query) return
    cancelSessionReset()
    setDeskMessage(null)
    closeSuggestions()

    try {
      // 1. If no borrower selected, check if the query belongs to a borrower
      if (!selectedBorrower) {
        const { data: borrower } = await (supabase as any)
          .from('borrowers')
          .select(`
            *,
            borrower_type:borrower_types(*),
            class:classes(*)
          `)
          .is('deleted_at', null)
          .or(`borrower_no.eq.${query},name.ilike.%${query}%`)
          .limit(1)
          .maybeSingle()

        if (borrower) {
          await selectBorrowerFromRecord(borrower)
          return
        }
      }

      // 2. Otherwise scan the exact book barcode
      const { data: copyData } = await (supabase as any)
        .from('copies')
        .select(`
          *,
          title:titles(*, title_authors(author:authors(name)))
        `)
        .eq('barcode', query)
        .maybeSingle()

      if (copyData) {
        addCopyToSession(copyData)
        return
      }

      // 3. Fall back to the first title match so typing a book name works.
      const firstMatch = suggestions.find((suggestion) => !('disabled' in suggestion && suggestion.disabled))
      if (firstMatch) {
        await chooseSuggestion(firstMatch)
        return
      }

      playSound('error')
      setDeskMessage({
        type: 'error',
        text: `No learner, barcode or title matched "${query}".`,
      })
      clearScanQuery()
    } catch (err: any) {
      playSound('error')
      setDeskMessage({ type: 'error', text: err?.message || 'Error processing scan.' })
    } finally {
      scanInputRef.current?.focus()
    }
  }

  // Confirm issuing all valid items
  const handleConfirmIssueSession = async () => {
    if (!selectedBorrower) return
    setIsProcessing(true)
    cancelSessionReset()

    const itemsToIssue = sessionBooks.filter((b) => (!b.blocked || b.override) && !b.issued)
    if (itemsToIssue.length === 0) {
      setDeskMessage({ type: 'error', text: 'No eligible items to issue.' })
      setIsProcessing(false)
      return
    }

    let issuedCount = 0
    try {
      for (const item of itemsToIssue) {
        const issue = await createIssue.mutateAsync({
          copyId: item.copy.id,
          borrowerId: selectedBorrower.borrower.id,
          dueAt: item.dueAt,
          issuedBy: user?.id || 'desk',
          overrideReason: item.override ? 'Librarian desk override' : undefined,
        })
        issuedCount += 1
        setSessionBooks((prev) =>
          prev.map((book) =>
            book.copy.id === item.copy.id ? { ...book, issued: true, issue } : book
          )
        )
      }

      setSelectedBorrower((prev) =>
        prev
          ? {
              ...prev,
              openIssuesCount: prev.openIssuesCount + itemsToIssue.length,
            }
          : prev
      )

      playSound('success')
      toast.success(
        `Issued ${itemsToIssue.length} ${itemsToIssue.length === 1 ? 'book' : 'books'} to ${
          selectedBorrower.borrower.name
        }.`,
        {
          duration: 6000,
          description: 'This session will clear automatically in a few seconds.',
        }
      )
      queryClient.invalidateQueries({ queryKey: ['recent-issues'] })
      // Let the notification leave first, then reset the desk for the next learner.
      scheduleSessionReset(9000)
    } catch (err: any) {
      playSound('error')
      const partialMessage =
        issuedCount > 0
          ? ` ${issuedCount} book(s) were issued successfully; check the marked items before retrying.`
          : ''
      setDeskMessage({
        type: 'error',
        text: `${err?.message || 'Failed to complete issue.'}${partialMessage}`,
      })
    } finally {
      setIsProcessing(false)
      scanInputRef.current?.focus()
    }
  }

  const handleReceipt = (item: ScannedBookSessionItem, action: 'download' | 'print') => {
    if (!item.issue || !selectedBorrower) return
    const receipt = {
      kind: 'issue' as const,
      receiptNumber: item.issue.id,
      libraryName: libraryProfile?.name || 'School Library',
      libraryAddress: libraryProfile?.address,
      libraryPhone: libraryProfile?.phone,
      borrowerName: selectedBorrower.borrower.name,
      borrowerNumber: selectedBorrower.borrower.borrower_no,
      className: selectedBorrower.borrower.class?.name,
      title: item.copy.title?.title || 'Unknown title',
      barcode: item.copy.barcode,
      issuedAt: item.issue.issued_at,
      dueAt: item.issue.due_at,
      processedBy: profile?.name || user?.email,
    }

    try {
      if (action === 'download') downloadCirculationReceipt(receipt)
      else printCirculationReceipt(receipt)
    } catch (err) {
      setDeskMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not create the issue receipt.',
      })
    }
  }

  const handleClearSession = () => {
    cancelSessionReset()
    setSelectedBorrower(null)
    setSessionBooks([])
    setDeskMessage(null)
    clearScanQuery()
    closeSuggestions()
    scanInputRef.current?.focus()
  }

  const handleRemoveBook = (index: number) => {
    setSessionBooks((prev) => prev.filter((_, i) => i !== index))
    scanInputRef.current?.focus()
  }

  const handleToggleOverride = (index: number) => {
    setSessionBooks((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, override: !item.override } : item))
    )
  }

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setShowSuggestions(true)
      setActiveSuggestion((prev) => Math.min(prev + 1, suggestions.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveSuggestion((prev) => Math.max(prev - 1, 0))
      return
    }
    if (e.key === 'Escape') {
      closeSuggestions()
      return
    }
    if (
      e.key === 'Enter' &&
      showSuggestions &&
      activeSuggestion >= 0 &&
      suggestions[activeSuggestion]
    ) {
      e.preventDefault()
      void chooseSuggestion(suggestions[activeSuggestion])
    }
  }

  const suggestionOpen = showSuggestions && scanQuery.trim().length >= 2

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-heading sm:text-2xl">Issue Desk</h2>
          <p className="text-xs text-faint">
            Scan a learner card or barcode, or type a learner, title, author or publisher.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearSession}
            disabled={!selectedBorrower && sessionBooks.length === 0}
          >
            Clear / New Session
          </Button>
        </div>
      </div>

      {/* Barcode Scanner Bar */}
      <Card className="border-2 border-primary/40 shadow-md">
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={handleScanSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <IssueScanInput
                inputRef={scanInputRef}
                resetKey={scanResetKey}
                onQueryChange={(value) => {
                  updateScanQuery(value)
                  startTransition(() => {
                    setShowSuggestions(true)
                    setActiveSuggestion(-1)
                  })
                }}
                onFocus={() => {
                  if (scanQueryRef.current.trim().length >= 2) setShowSuggestions(true)
                }}
                onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
                onKeyDown={handleScanKeyDown}
                expanded={suggestionOpen}
              />
              <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-primary pointer-events-none" />
              <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted pointer-events-none" />

              {suggestionOpen && (
                <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-line bg-panel text-left shadow-[0_22px_60px_-30px_rgba(0,0,0,0.8)]">
                  {isSearching ? (
                    <div className="flex items-center gap-2 p-3 text-xs text-muted">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Searching learners, titles and authors…
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="p-3 text-xs text-muted">
                      No matches. Press Enter to scan the exact barcode.
                    </div>
                  ) : (
                    <ul className="max-h-80 overflow-y-auto p-1">
                      {suggestions.map((suggestion, index) => {
                        const disabled =
                          'disabled' in suggestion ? suggestion.disabled : false
                        const Icon =
                          suggestion.kind === 'borrower'
                            ? User
                            : suggestion.kind === 'copy'
                            ? Barcode
                            : BookOpen
                        return (
                          <li key={suggestion.key}>
                            <button
                              type="button"
                              disabled={disabled}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => void chooseSuggestion(suggestion)}
                              className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                                activeSuggestion === index ? 'bg-surface-2' : 'hover:bg-surface-2'
                              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                            >
                              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-surface-1 text-muted">
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-heading">
                                  {suggestion.label}
                                </span>
                                <span className="block truncate text-[11px] text-muted">
                                  {suggestion.detail || '—'}
                                </span>
                              </span>
                              <span className="mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-faint">
                                {suggestion.kind === 'borrower'
                                  ? 'Learner'
                                  : suggestion.kind === 'copy'
                                  ? 'Copy'
                                  : suggestion.available > 0
                                  ? `${suggestion.available} on shelf`
                                  : 'None on shelf'}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <Button type="submit" variant="primary" className="px-6 text-base">
              Scan
            </Button>
          </form>

          {deskMessage && (
            <div
              className="mt-3 flex items-center gap-2 rounded-md p-3 text-xs font-semibold bg-danger-50 text-danger dark:bg-red-950/60 dark:text-red-300"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{deskMessage.text}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Split Layout: Borrower Card (Left) & Session Items (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Borrower Card */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Borrower</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {selectedBorrower ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-800 dark:bg-primary-950 dark:text-primary-300 text-lg font-bold">
                      {selectedBorrower.borrower.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-heading text-base">
                        {selectedBorrower.borrower.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-faint">
                        <span className="font-mono">{selectedBorrower.borrower.borrower_no}</span>
                        <span>•</span>
                        <Badge variant="info" size="sm">
                          {selectedBorrower.borrowerType.name}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Status indicators */}
                  <div className="space-y-2 pt-2 border-t border-line text-xs">
                    <div className="flex justify-between py-1">
                      <span className="text-faint">Open Loans:</span>
                      <span className="font-semibold text-heading">
                        {selectedBorrower.openIssuesCount} / {selectedBorrower.borrowerType.max_items} max
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-faint">Overdue Status:</span>
                      {selectedBorrower.hasOverdue ? (
                        <Badge variant="danger" size="sm">
                          Has Overdue Items
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          None Overdue
                        </Badge>
                      )}
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-faint">Outstanding Charges:</span>
                      <span
                        className={`font-semibold ${
                          selectedBorrower.outstandingCharges > 0
                            ? 'text-danger'
                            : 'text-heading'
                        }`}
                      >
                        {formatCurrency(selectedBorrower.outstandingCharges)}
                      </span>
                    </div>
                  </div>

                  {/* Loan Duration Selector */}
                  <div className="pt-2 border-t border-line">
                    <label className="text-xs font-medium text-body">Loan Duration</label>
                    <Select
                      options={[
                        { value: '14', label: '14 Days (Standard Library)' },
                        { value: '30', label: '30 Days (1 Month)' },
                        { value: '90', label: 'Term Long (90 Days)' },
                        { value: '300', label: 'Whole School Year (300 Days)' },
                      ]}
                      value={String(defaultLoanDays)}
                      onChange={(e) => setDefaultLoanDays(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Scan a learner's card or type their name to begin.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Items in this Session */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="flex flex-col min-h-[380px]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle>Books in Session ({sessionBooks.length})</CardTitle>
              </div>

              {sessionBooks.length > 0 && selectedBorrower && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<ArrowRightCircle className="h-4 w-4" />}
                  loading={isProcessing}
                  onClick={handleConfirmIssueSession}
                >
                  Issue All Eligible
                </Button>
              )}
            </CardHeader>

            <CardContent className="flex-1 p-0">
              {sessionBooks.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted">
                  No books scanned yet in this session.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-y border-line bg-surface-1 text-[10px] uppercase tracking-[0.12em] text-faint">
                        <th className="px-4 py-2.5 font-semibold">Book</th>
                        <th className="px-4 py-2.5 font-semibold">Barcode</th>
                        <th className="px-4 py-2.5 font-semibold">Due</th>
                        <th className="px-4 py-2.5 font-semibold">Status</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {sessionBooks.map((item, idx) => (
                        <tr
                          key={item.copy.id || idx}
                          className={
                            item.issued
                              ? 'bg-success/5'
                              : item.blocked && !item.override
                              ? 'bg-danger/5'
                              : 'hover:bg-surface-2'
                          }
                        >
                          <td className="max-w-[220px] px-4 py-3">
                            <p className="truncate font-semibold text-heading">
                              {item.copy.title?.title || 'Unknown Title'}
                            </p>
                            {item.blocked && !item.issued && (
                              <p className="mt-1 flex items-start gap-1 text-[11px] font-medium text-danger">
                                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                                <span>{item.blockReason}</span>
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-muted">{item.copy.barcode}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted">
                            {formatDate(item.dueAt)}
                          </td>
                          <td className="px-4 py-3">
                            {item.issued ? (
                              <Badge variant="success" size="sm">
                                Issued
                              </Badge>
                            ) : item.blocked ? (
                              <Badge variant={item.override ? 'warning' : 'danger'} size="sm">
                                {item.override ? 'Override' : 'Blocked'}
                              </Badge>
                            ) : (
                              <Badge variant="info" size="sm">
                                Ready
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.issued && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    aria-label={`Print receipt for ${item.copy.title?.title || item.copy.barcode}`}
                                    onClick={() => handleReceipt(item, 'print')}
                                  >
                                    <Printer className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    aria-label={`Download receipt for ${item.copy.title?.title || item.copy.barcode}`}
                                    onClick={() => handleReceipt(item, 'download')}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              {item.blocked && !item.issued && (
                                <Button
                                  variant={item.override ? 'success' : 'outline'}
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => handleToggleOverride(idx)}
                                >
                                  {item.override ? 'Overridden ✓' : 'Override'}
                                </Button>
                              )}
                              {!item.issued && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted hover:text-danger"
                                  aria-label={`Remove ${item.copy.title?.title || item.copy.barcode} from session`}
                                  onClick={() => handleRemoveBook(idx)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recently borrowed — its own table so the desk keeps a clear audit trail */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle>Recently Borrowed</CardTitle>
          </div>
          <Badge variant="outline" size="sm">
            Latest {recentIssues.length}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {recentIssues.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              No borrowing activity yet. Issued books will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-y border-line bg-surface-1 text-[10px] uppercase tracking-[0.12em] text-faint">
                    <th className="px-4 py-2.5 font-semibold">Learner</th>
                    <th className="px-4 py-2.5 font-semibold">Book</th>
                    <th className="px-4 py-2.5 font-semibold">Barcode</th>
                    <th className="px-4 py-2.5 font-semibold">Issued</th>
                    <th className="px-4 py-2.5 font-semibold">Due</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recentIssues.map((issue) => {
                    const badge = recentIssueBadge(issue.status, issue.due_at)
                    return (
                      <tr key={issue.id} className="hover:bg-surface-2">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-heading">
                            {issue.borrower?.name || 'Unknown learner'}
                          </p>
                          <p className="text-[11px] text-faint">
                            {[issue.borrower?.borrower_no, issue.borrower?.class?.name]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </td>
                        <td className="px-4 py-2.5 text-body">
                          {issue.copy?.title?.title || '—'}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-muted">
                          {issue.copy?.barcode || '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                          {formatDate(issue.issued_at)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                          {formatDate(issue.due_at)}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant={badge.variant} size="sm">
                            {badge.label}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
