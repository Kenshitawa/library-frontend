import React, { useState, useRef, useEffect } from 'react'
import {
  Barcode,
  ArrowLeftCircle,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  BookOpen,
  User,
  Clock,
  Sparkles,
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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Issue, Copy, CopyCondition } from '@/types'
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
  const queryClient = useQueryClient()
  const scanInputRef = useRef<HTMLInputElement>(null)
  const { data: recentReturns = [] } = useQuery({
    queryKey: ['recent-circulation', 'returned'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('issues')
        .select('id, returned_at, borrower:borrowers(id, name, borrower_no), copy:copies(title:titles(title))')
        .not('returned_at', 'is', null)
        .order('returned_at', { ascending: false })
        .limit(3)
      if (error) throw new Error(error.message)
      return data || []
    },
    staleTime: 30_000,
  })

  const [scanQuery, setScanQuery] = useState('')
  const [currentIssue, setCurrentIssue] = useState<Issue | null>(null)
  const [returnCondition, setReturnCondition] = useState<CopyCondition>('good')
  const [damageNote, setDamageNote] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [sessionReturns, setSessionReturns] = useState<ReturnedSessionItem[]>([])
  const [deskMessage, setDeskMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [matchingTitles, setMatchingTitles] = useState<Array<{ id: string; title: string }>>([])

  useEffect(() => {
    scanInputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (scanQuery.trim().length < 2) {
      setMatchingTitles([])
      return
    }
    const timer = window.setTimeout(async () => {
      const { data } = await (supabase as any)
        .from('titles')
        .select('id, title')
        .ilike('title', `%${scanQuery.trim()}%`)
        .limit(8)
      setMatchingTitles(data || [])
    }, 180)
    return () => window.clearTimeout(timer)
  }, [scanQuery])

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = scanQuery.trim()
    if (!query) return
    setDeskMessage(null)

    try {
      // 1. Look up copy by barcode
      let { data: copyData } = await (supabase as any)
        .from('copies')
        .select(`
          *,
          title:titles(*)
        `)
        .eq('barcode', query)
        .maybeSingle()

      // Staff may use a title when a barcode is damaged or unavailable.
      let matchedBookTitle = false
      if (!copyData) {
        const { data: titles } = await (supabase as any)
          .from('titles')
          .select('id')
          .ilike('title', `%${query}%`)
          .limit(10)
        matchedBookTitle = Boolean(titles?.length)
        const titleIds = (titles || []).map((title: any) => title.id)
        if (titleIds.length) {
          const { data: copies } = await (supabase as any)
            .from('copies')
            .select('id')
            .in('title_id', titleIds)
          const copyIds = (copies || []).map((copy: any) => copy.id)
          if (copyIds.length) {
            const { data: issueByTitle } = await (supabase as any)
              .from('issues')
              .select(`*, copy:copies(*, title:titles(*)), borrower:borrowers(*, class:classes(*))`)
              .in('copy_id', copyIds)
              .eq('status', 'open')
              .order('issued_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            if (issueByTitle) {
              setCurrentIssue(issueByTitle as Issue)
              setReturnCondition(((issueByTitle as any).condition_at_issue as CopyCondition) || 'good')
              setDamageNote('')
              playSound('success')
              setScanQuery('')
              return
            }
          }
        }
      }

      if (!copyData) {
        playSound('error')
        setDeskMessage({
          type: 'error',
          text: matchedBookTitle ? `No active loan found for "${query}".` : `Barcode or book title "${query}" not found in catalog.`,
        })
        setScanQuery('')
        return
      }

      // 2. Look up open issue for this copy
      const { data: issueData } = await (supabase as any)
        .from('issues')
        .select(`
          *,
          copy:copies(*, title:titles(*)),
          borrower:borrowers(*, class:classes(*))
        `)
        .eq('copy_id', (copyData as any).id)
        .eq('status', 'open')
        .maybeSingle()

      if (!issueData) {
        playSound('error')
        setDeskMessage({
          type: 'error',
          text: `Copy "${(copyData as any).title?.title}" (barcode ${query}) is not currently marked as issued.`,
        })
        setScanQuery('')
        return
      }

      // Found active loan!
      setCurrentIssue(issueData as Issue)
      setReturnCondition(((issueData as any).condition_at_issue as CopyCondition) || 'good')
      setDamageNote('')
      playSound('success')
      setScanQuery('')
    } catch (err: any) {
      playSound('error')
      setDeskMessage({ type: 'error', text: err?.message || 'Error processing return scan.' })
    } finally {
      scanInputRef.current?.focus()
    }
  }

  const handleConfirmReturn = async () => {
    if (!currentIssue) return
    setIsProcessing(true)

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

      // If damaged, record flag
      if (returnCondition === 'damaged' || returnCondition === 'poor') {
        // Damage recorded!
      }

      playSound('success')
      await queryClient.invalidateQueries({ queryKey: ['recent-circulation', 'returned'] })
      setDeskMessage({
        type: 'success',
        text: `Successfully checked in "${currentIssue.copy?.title?.title}" from ${currentIssue.borrower?.name}!`,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
            Return Desk
          </h2>
          <p className="text-xs text-slate-500">
            Scan returned textbook barcode, assess physical condition, and check in
          </p>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Session Check-ins: <span className="text-primary font-bold">{sessionReturns.length}</span>
        </div>
      </div>

      {/* Barcode Scanner Bar */}
      <Card className="border-2 border-primary/40 shadow-md">
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={handleScanSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                list="return-book-title-suggestions"
                ref={scanInputRef}
                type="text"
                value={scanQuery}
                onChange={(e) => setScanQuery(e.target.value)}
                placeholder="Scan barcode or type the book title…"
                className="w-full text-base sm:text-lg font-mono rounded-lg border-2 border-primary/30 bg-slate-50 dark:bg-slate-900 px-4 py-3 pl-12 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                autoComplete="off"
              />
              <datalist id="return-book-title-suggestions">
                {matchingTitles.map((title) => <option key={title.id} value={title.title} />)}
              </datalist>
              <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-primary pointer-events-none" />
            </div>
            <Button type="submit" variant="primary" className="px-6 text-base">
              Check In
            </Button>
          </form>

          {deskMessage && (
            <div
              className={`mt-3 flex items-center gap-2 rounded-md p-3 text-xs font-semibold ${
                deskMessage.type === 'success'
                  ? 'bg-success-50 text-success-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-danger-50 text-danger dark:bg-red-950/60 dark:text-red-300'
              }`}
            >
              {deskMessage.type === 'success' ? (
                <CheckCircle className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{deskMessage.text}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-success" /><CardTitle className="text-sm">Latest book returns</CardTitle></div>
          <span className="text-xs text-slate-500">Last 3</span>
        </CardHeader>
        <CardContent className="grid gap-2 p-3 sm:grid-cols-3">
          {recentReturns.length ? recentReturns.map((item: any) => (
            <div key={item.id} className="min-w-0 rounded-xl border border-slate-200/80 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-900/30">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{item.borrower?.name || 'Borrower'}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{item.copy?.title?.title || 'Book title'} · {item.borrower?.borrower_no || ''}</p>
            </div>
          )) : <p className="px-2 py-3 text-sm text-slate-500 sm:col-span-3">No books returned yet.</p>}
        </CardContent>
      </Card>

      {/* Main Panel: Current Scanned Item Inspection & Condition */}
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
              {/* Item Info */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {currentIssue.copy?.title?.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Author: <strong>{currentIssue.copy?.title?.author}</strong>
                </p>
                <div className="pt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div>Barcode: <span className="font-mono font-semibold">{currentIssue.copy?.barcode}</span></div>
                  <div>Issued to: <strong className="text-slate-900 dark:text-slate-100">{currentIssue.borrower?.name}</strong> (#{currentIssue.borrower?.borrower_no})</div>
                  <div>Issued on: {formatDate(currentIssue.issued_at)}</div>
                  <div>Due date: {formatDate(currentIssue.due_at)}</div>
                </div>
              </div>

              {/* Condition & Damage Evaluation */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg">
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

      {/* Running Session Returns List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <CardTitle>Returned in this Session ({sessionReturns.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sessionReturns.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No items returned yet in this session.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sessionReturns.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition-colors"
                >
                  <div className="flex flex-col min-w-0 pr-3">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {item.issue.copy?.title?.title}
                    </span>
                    <span className="text-slate-500">
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
