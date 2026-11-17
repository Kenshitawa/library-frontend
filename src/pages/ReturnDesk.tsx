import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Barcode,
  Search,
  CheckCircle,
  AlertCircle,
  BookOpen,
  User,
  Clock,
  Loader2,
  Download,
  Printer,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { useReturnCopy } from '@/hooks/useIssues'
import { supabase } from '@/lib/supabase'
import type { Issue, Copy, CopyCondition, Title, Borrower, ClassGroup } from '@/types'
import { formatDate, daysUntilDue } from '@/lib/utils'
import { useLibraryProfile } from '@/hooks/useLibraryProfile'
import { downloadCirculationReceipt, printCirculationReceipt } from '@/lib/circulationReceipt'

function playSound(type: 'success' | 'error') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'success') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.15)
    } else {
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, ctx.currentTime)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.35)
    }
  } catch (err) {}
}

function normalize(value: string | null | undefined): string {
  return (value || '').toLowerCase().trim()
}

function authorNames(loan: OpenLoan): string {
  const authors = (loan.copy?.title as any)?.title_authors
  if (!Array.isArray(authors)) return ''
  return authors
    .map((link: any) => link?.author?.name)
    .filter((name: string | null | undefined): name is string => !!name)
    .join(', ')
}

type OpenLoan = Issue & {
  copy?: (Copy & { title?: (Title & { title_authors?: any[] }) | null }) | null
  borrower?: (Borrower & { class?: ClassGroup | null }) | null
}

interface ReturnedSessionItem {
  issue: Issue
  returnedAt: string
  conditionAtReturn: CopyCondition
  wasOverdue: boolean
  daysLate: number
}

export const ReturnDesk: React.FC = () => {
  const { user, profile } = useAuth()
  const { profile: libraryProfile } = useLibraryProfile()
  const returnCopy = useReturnCopy()
  const scanInputRef = useRef<HTMLInputElement>(null)

  const [scanQuery, setScanQuery] = useState('')
  const [showMatches, setShowMatches] = useState(false)
  const [activeMatch, setActiveMatch] = useState(-1)
  const [currentIssue, setCurrentIssue] = useState<OpenLoan | null>(null)
  const [returnCondition, setReturnCondition] = useState<CopyCondition>('good')
  const [damageNote, setDamageNote] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [sessionReturns, setSessionReturns] = useState<ReturnedSessionItem[]>([])
  const [deskMessage, setDeskMessage] = useState<{ type: 'error'; text: string } | null>(null)

  const { data: openLoans = [], isLoading: loadingLoans } = useQuery({
    queryKey: ['issues', 'return-desk-open'],
    queryFn: async (): Promise<OpenLoan[]> => {
      const pageSize = 1000
      const loans: OpenLoan[] = []

      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await (supabase as any)
          .from('issues')
          .select(`
            *,
            borrower:borrowers(*, class:classes(*)),
            copy:copies(*, title:titles(*, title_authors(author:authors(name))))
          `)
          .eq('status', 'open')
          .order('due_at', { ascending: true })
          .order('id', { ascending: true })
          .range(offset, offset + pageSize - 1)

        if (error) throw new Error(error.message)
        const page = (data || []) as OpenLoan[]
        loans.push(...page)
        if (page.length < pageSize) break
      }

      return loans
    },
    staleTime: 15_000,
  })

  useEffect(() => {
    scanInputRef.current?.focus()
  }, [])

  const matches = useMemo(() => {
    const query = normalize(scanQuery)
    if (query.length < 2) return []

    const tokens = query.split(/\s+/).filter(Boolean)

    return openLoans
      .map((loan) => {
        const title = normalize(loan.copy?.title?.title)
        const subtitle = normalize(loan.copy?.title?.subtitle)
        const publisher = normalize(loan.copy?.title?.publisher)
        const barcode = normalize(loan.copy?.barcode)
        const borrower = normalize(loan.borrower?.name)
        const borrowerNo = normalize(loan.borrower?.borrower_no)
        const className = normalize(loan.borrower?.class?.name)
        const authors = normalize(authorNames(loan))
        const haystack = [title, subtitle, publisher, barcode, borrower, borrowerNo, className, authors].join(' ')

        if (!tokens.every((token) => haystack.includes(token))) return null

        let score = 0
        if (barcode === query) score += 120
        if (barcode.startsWith(query)) score += 60
        if (title.startsWith(query)) score += 50
        if (borrower.startsWith(query)) score += 45
        if (borrowerNo.startsWith(query)) score += 40
        if (authors.includes(query)) score += 20
        if (title.includes(query)) score += 15

        return { loan, score }
      })
      .filter((entry): entry is { loan: OpenLoan; score: number } => entry !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((entry) => entry.loan)
  }, [openLoans, scanQuery])

  const learnerOpenCount = currentIssue
    ? openLoans.filter((loan) => loan.borrower?.id === currentIssue.borrower?.id).length
    : 0

  const resetSearch = () => {
    setScanQuery('')
    setShowMatches(false)
    setActiveMatch(-1)
  }

  const selectLoan = (loan: OpenLoan) => {
    setCurrentIssue(loan)
    setReturnCondition((loan.condition_at_issue as CopyCondition) || 'good')
    setDamageNote('')
    setDeskMessage(null)
    resetSearch()
    playSound('success')
    toast.success(`Ready to return: ${loan.copy?.title?.title || 'Book'}`, {
      description: `${loan.borrower?.name || 'Learner'} • barcode ${loan.copy?.barcode || '—'}`,
      duration: 3000,
    })
    window.setTimeout(() => scanInputRef.current?.focus(), 0)
  }

  const findLoanForBarcode = (barcode: string): OpenLoan | undefined =>
    openLoans.find((loan) => normalize(loan.copy?.barcode) === normalize(barcode))

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = scanQuery.trim()
    if (!query) return
    setDeskMessage(null)
    setShowMatches(false)

    if (currentIssue) {
      setDeskMessage({
        type: 'error',
        text: 'Finish checking in the current item before scanning the next one.',
      })
      return
    }

    // Enter on a highlighted/typed search result picks the best loan match.
    if (activeMatch >= 0 && matches[activeMatch]) {
      selectLoan(matches[activeMatch])
      return
    }

    setIsLookingUp(true)
    try {
      const knownLoan = findLoanForBarcode(query)
      if (knownLoan) {
        selectLoan(knownLoan)
        return
      }

      // Exact barcode may be a copy that is not currently on loan.
      const { data: copyData } = await (supabase as any)
        .from('copies')
        .select('*, title:titles(*)')
        .eq('barcode', query)
        .maybeSingle()

      if (copyData) {
        playSound('error')
        setDeskMessage({
          type: 'error',
          text: `Copy "${(copyData as any).title?.title}" (barcode ${query}) is not currently marked as issued.`,
        })
        setScanQuery('')
        return
      }

      if (matches.length > 0) {
        selectLoan(matches[0])
        return
      }

      playSound('error')
      setDeskMessage({
        type: 'error',
        text: `No open loan matched "${query}". Try a learner name, book title, author or barcode.`,
      })
      setScanQuery('')
    } catch (err: any) {
      playSound('error')
      setDeskMessage({ type: 'error', text: err?.message || 'Error processing return scan.' })
    } finally {
      setIsLookingUp(false)
      scanInputRef.current?.focus()
    }
  }

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setShowMatches(true)
      setActiveMatch((prev) => Math.min(prev + 1, matches.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveMatch((prev) => Math.max(prev - 1, 0))
      return
    }
    if (e.key === 'Escape') {
      setShowMatches(false)
      setActiveMatch(-1)
      return
    }
    if (e.key === 'Enter' && showMatches && activeMatch >= 0 && matches[activeMatch]) {
      e.preventDefault()
      selectLoan(matches[activeMatch])
    }
  }

  const handleConfirmReturn = async () => {
    if (!currentIssue) return
    setIsProcessing(true)
    setDeskMessage(null)

    try {
      const days = daysUntilDue(currentIssue.due_at)
      const isLate = days < 0
      const daysLate = isLate ? Math.abs(days) : 0

      await returnCopy.mutateAsync({
        issueId: currentIssue.id,
        copyId: currentIssue.copy_id,
        returnedTo: user?.id || 'desk',
        conditionAtReturn: returnCondition,
        returnNote: damageNote.trim() || undefined,
      })

      playSound('success')
      toast.success(`Checked in "${currentIssue.copy?.title?.title}"`, {
        description: `Returned by ${currentIssue.borrower?.name || 'learner'}${isLate ? ` • ${daysLate} day(s) late` : ' • on time'}`,
        duration: 4000,
      })

      setSessionReturns((prev) => [
        {
          issue: currentIssue,
          returnedAt: new Date().toISOString(),
          conditionAtReturn: returnCondition,
          wasOverdue: isLate,
          daysLate,
        },
        ...prev,
      ])

      setCurrentIssue(null)
      setDamageNote('')
    } catch (err: any) {
      playSound('error')
      setDeskMessage({ type: 'error', text: err?.message || 'Failed to complete check-in.' })
    } finally {
      setIsProcessing(false)
      scanInputRef.current?.focus()
    }
  }

  const handleReceipt = (item: ReturnedSessionItem, action: 'download' | 'print') => {
    const receipt = {
      kind: 'return' as const,
      receiptNumber: item.issue.id,
      libraryName: libraryProfile?.name || 'School Library',
      libraryAddress: libraryProfile?.address,
      libraryPhone: libraryProfile?.phone,
      borrowerName: item.issue.borrower?.name || 'Unknown borrower',
      borrowerNumber: item.issue.borrower?.borrower_no || '',
      className: item.issue.borrower?.class?.name,
      title: item.issue.copy?.title?.title || 'Unknown title',
      barcode: item.issue.copy?.barcode || '',
      issuedAt: item.issue.issued_at,
      dueAt: item.issue.due_at,
      returnedAt: item.returnedAt,
      condition: item.conditionAtReturn,
      daysLate: item.daysLate,
      processedBy: profile?.name || user?.email,
    }

    try {
      if (action === 'download') downloadCirculationReceipt(receipt)
      else printCirculationReceipt(receipt)
    } catch (err) {
      setDeskMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not create the return receipt.',
      })
    }
  }

  const days = currentIssue ? daysUntilDue(currentIssue.due_at) : 0
  const isLate = days < 0
  const matchOpen = showMatches && scanQuery.trim().length >= 2

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-heading sm:text-2xl">Return Desk</h2>
          <p className="text-xs text-faint">
            Scan a barcode or search by learner, book title or author to check items in.
          </p>
        </div>

        <div className="text-xs font-semibold text-faint">
          Session Check-ins: <span className="text-primary font-bold">{sessionReturns.length}</span>
        </div>
      </div>

      {/* Barcode / search bar */}
      <Card className="border-2 border-primary/40 shadow-md">
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={handleScanSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={scanInputRef}
                type="text"
                value={scanQuery}
                onChange={(e) => {
                  setScanQuery(e.target.value)
                  setShowMatches(true)
                  setActiveMatch(-1)
                }}
                onFocus={() => {
                  if (scanQuery.trim().length >= 2) setShowMatches(true)
                }}
                onBlur={() => window.setTimeout(() => setShowMatches(false), 120)}
                onKeyDown={handleScanKeyDown}
                placeholder="Scan barcode or search learner / book / author..."
                className="w-full text-base sm:text-lg font-mono rounded-lg border-2 border-primary/30 bg-surface-1 px-4 py-3 pl-12 pr-10 text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                autoComplete="off"
                role="combobox"
                aria-expanded={matchOpen}
                aria-autocomplete="list"
              />
              <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-primary pointer-events-none" />
              <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted pointer-events-none" />

              {matchOpen && (
                <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-line bg-panel text-left shadow-[0_22px_60px_-30px_rgba(0,0,0,0.8)]">
                  {loadingLoans || isLookingUp ? (
                    <div className="flex items-center gap-2 p-3 text-xs text-muted">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Searching open loans…
                    </div>
                  ) : matches.length === 0 ? (
                    <div className="p-3 text-xs text-muted">
                      No open loan matches. Press Enter to scan the exact barcode.
                    </div>
                  ) : (
                    <ul className="max-h-80 overflow-y-auto p-1">
                      {matches.map((loan, index) => {
                        const author = authorNames(loan)
                        const overdue = new Date(loan.due_at).getTime() < Date.now()
                        return (
                          <li key={loan.id}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => selectLoan(loan)}
                              className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                                activeMatch === index ? 'bg-surface-2' : 'hover:bg-surface-2'
                              }`}
                            >
                              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface-1 text-primary">
                                <BookOpen className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-heading">
                                  {loan.copy?.title?.title || 'Unknown title'}
                                </span>
                                <span className="block truncate text-[11px] text-muted">
                                  {[author || 'Unknown author', `Barcode ${loan.copy?.barcode || '—'}`]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </span>
                                <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-semibold text-body">
                                  <User className="h-3 w-3 text-faint" />
                                  {loan.borrower?.name || 'Unknown learner'}
                                  {loan.borrower?.class?.name ? (
                                    <span className="font-normal text-faint">
                                      · {loan.borrower.class.name}
                                    </span>
                                  ) : null}
                                </span>
                              </span>
                              <span
                                className={`mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wide ${
                                  overdue ? 'text-danger' : 'text-faint'
                                }`}
                              >
                                {overdue ? 'Overdue' : `Due ${formatDate(loan.due_at)}`}
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
            <Button type="submit" variant="primary" className="px-6 text-base" loading={isLookingUp}>
              Check In
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

      {/* Selected loan verification */}
      {currentIssue && (
        <Card className="border-2 border-primary animate-in fade-in zoom-in-95">
          <CardHeader className="bg-primary-50/50 dark:bg-primary-950/30 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle>Verify Return Item</CardTitle>
              </div>

              {isLate ? (
                <Badge variant="danger" size="md">
                  {Math.abs(days)} days overdue
                </Badge>
              ) : (
                <Badge variant="success" size="md">
                  On time
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Item + learner info */}
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
                    Book
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-heading">
                    {currentIssue.copy?.title?.title}
                  </h3>
                  <p className="text-xs text-faint">
                    Author: <strong>{authorNames(currentIssue) || currentIssue.copy?.title?.author || 'Unknown'}</strong>
                  </p>
                </div>

                <div className="rounded-xl border border-line bg-surface-1 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-sm font-bold text-primary-800 dark:bg-primary-950 dark:text-primary-300">
                      {currentIssue.borrower?.name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
                        Learner
                      </p>
                      <p className="truncate text-sm font-bold text-heading">
                        {currentIssue.borrower?.name || 'Unknown learner'}
                      </p>
                      <p className="text-[11px] text-muted">
                        {[currentIssue.borrower?.borrower_no, currentIssue.borrower?.class?.name]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 border-t border-line pt-2 text-[11px] text-muted">
                    {learnerOpenCount} open loan{learnerOpenCount === 1 ? '' : 's'} on this learner's account
                  </p>
                </div>

                <div className="space-y-1 text-xs text-muted">
                  <div>
                    Barcode: <span className="font-mono font-semibold text-heading">{currentIssue.copy?.barcode}</span>
                  </div>
                  <div>Issued on: {formatDate(currentIssue.issued_at)}</div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-faint" />
                    Due date: {formatDate(currentIssue.due_at)}
                  </div>
                </div>
              </div>

              {/* Condition & damage evaluation */}
              <div className="space-y-3 bg-surface-1 p-4 rounded-lg">
                <Select
                  label="Condition on Return"
                  options={[
                    { value: 'good', label: 'Good (No damage)' },
                    { value: 'fair', label: 'Fair (Normal wear)' },
                    { value: 'poor', label: 'Poor (Excessive wear)' },
                    { value: 'damaged', label: 'Damaged (Requires repair/charge)' },
                  ]}
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value as CopyCondition)}
                />

                {(returnCondition === 'damaged' || returnCondition === 'poor') && (
                  <Input
                    label="Damage Assessment Note"
                    value={damageNote}
                    onChange={(e) => setDamageNote(e.target.value)}
                    placeholder="e.g. Torn back cover, water damaged pages"
                  />
                )}

                <div className="pt-2">
                  <Button
                    variant="primary"
                    className="w-full"
                    loading={isProcessing}
                    onClick={handleConfirmReturn}
                  >
                    Confirm Return
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Running session returns */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <CardTitle>Returned in this Session ({sessionReturns.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sessionReturns.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              No items returned yet in this session.
            </div>
          ) : (
            <div className="divide-y divide-line">
              {sessionReturns.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 hover:bg-surface-2 text-xs transition-colors"
                >
                  <div className="flex flex-col min-w-0 pr-3">
                    <span className="font-semibold text-heading truncate">
                      {item.issue.copy?.title?.title}
                    </span>
                    <span className="text-faint">
                      from {item.issue.borrower?.name} (#{item.issue.copy?.barcode})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="gray" size="sm">
                      {item.conditionAtReturn}
                    </Badge>
                    {item.wasOverdue ? (
                      <Badge variant="danger" size="sm">
                        {item.daysLate}d late
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm">
                        On time
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      aria-label={`Print return receipt for ${item.issue.copy?.title?.title || item.issue.copy?.barcode}`}
                      onClick={() => handleReceipt(item, 'print')}
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      aria-label={`Download return receipt for ${item.issue.copy?.title?.title || item.issue.copy?.barcode}`}
                      onClick={() => handleReceipt(item, 'download')}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
