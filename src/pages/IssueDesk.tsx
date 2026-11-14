import React, { useState, useRef, useEffect } from 'react'
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

interface ScannedBookSessionItem {
  copy: Copy & { title?: Title | null }
  dueAt: string
  blocked: boolean
  blockReason?: string
  override?: boolean
  issued?: boolean
  issue?: Issue
}

export const IssueDesk: React.FC = () => {
  const { user, profile } = useAuth()
  const { profile: libraryProfile } = useLibraryProfile()
  const createIssue = useCreateIssue()
  const scanInputRef = useRef<HTMLInputElement>(null)

  const [scanQuery, setScanQuery] = useState('')
  const [selectedBorrower, setSelectedBorrower] = useState<{
    borrower: Borrower
    borrowerType: BorrowerType
    openIssuesCount: number
    hasOverdue: boolean
    outstandingCharges: number
  } | null>(null)

  const [sessionBooks, setSessionBooks] = useState<ScannedBookSessionItem[]>([])
  const [deskMessage, setDeskMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [defaultLoanDays, setDefaultLoanDays] = useState(14)

  // Keep scan input focused
  useEffect(() => {
    scanInputRef.current?.focus()
  }, [])

  // Auto calculate due date
  const calculateDueDate = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString()
  }

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = scanQuery.trim()
    if (!query) return
    setDeskMessage(null)

    try {
      // 1. If no borrower selected, check if barcode belongs to a borrower (learner card or admission number)
      if (!selectedBorrower) {
        const { data: borrower } = await (supabase as any)
          .from('borrowers')
          .select(`
            *,
            borrower_type:borrower_types(*),
            class:classes(*)
          `)
          .or(`borrower_no.eq.${query},name.ilike.%${query}%`)
          .limit(1)
          .maybeSingle()

        if (borrower) {
          // Fetch open issues count & charges
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
          const hasOverdue = openIssues.some((i) => new Date(i.due_at) < new Date())
          const totalCharges = (chargesRes.data || []).reduce(
            (sum: number, c: any) => sum + (c.amount - (c.paid_amount || 0)),
            0
          )

          const bType: BorrowerType = (borrower as any).borrower_type || {
            max_items: 3,
            charge_threshold: 0,
            return_days: 14,
            name: 'Learner',
          }

          setSelectedBorrower({
            borrower: borrower as Borrower,
            borrowerType: bType,
            openIssuesCount: openIssues.length,
            hasOverdue,
            outstandingCharges: totalCharges,
          })

          if (bType.return_days) setDefaultLoanDays(bType.return_days)
          playSound('success')
          setDeskMessage({ type: 'success', text: `Borrower selected: ${borrower.name}` })
          setScanQuery('')
          return
        }
      }

      // 2. Otherwise scan book barcode
      const { data: copyData } = await (supabase as any)
        .from('copies')
        .select(`
          *,
          title:titles(*)
        `)
        .eq('barcode', query)
        .maybeSingle()

      if (!copyData) {
        playSound('error')
        setDeskMessage({ type: 'error', text: `Barcode "${query}" not found in library inventory.` })
        setScanQuery('')
        return
      }

      // Check if already in current session
      if (sessionBooks.some((item) => item.copy.id === (copyData as any).id)) {
        playSound('error')
        setDeskMessage({ type: 'error', text: `Book "${(copyData as any).title?.title}" is already in this session.` })
        setScanQuery('')
        return
      }

      // Evaluate issue blocking conditions if borrower is chosen
      let blocked = false
      let blockReason = ''

      if (selectedBorrower) {
        const check = evaluateIssueBlocks({
          borrower: selectedBorrower.borrower,
          borrowerType: selectedBorrower.borrowerType,
          copy: copyData as any,
          openIssuesCount: selectedBorrower.openIssuesCount + sessionBooks.filter((s) => !s.blocked || s.override).length,
          hasOverdue: selectedBorrower.hasOverdue,
          outstandingCharges: selectedBorrower.outstandingCharges,
        })
        blocked = check.blocked
        blockReason = check.reason
      } else {
        blocked = true
        blockReason = 'Scan or select a borrower first.'
      }

      if (blocked) {
        playSound('error')
      } else {
        playSound('success')
      }

      setSessionBooks((prev) => [
        ...prev,
        {
          copy: copyData as any,
          dueAt: calculateDueDate(defaultLoanDays),
          blocked,
          blockReason,
        },
      ])

      setScanQuery('')
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

      playSound('success')
      setDeskMessage({
        type: 'success',
        text: `Successfully issued ${itemsToIssue.length} book(s) to ${selectedBorrower.borrower.name}!`,
      })

    } catch (err: any) {
      playSound('error')
      const partialMessage = issuedCount > 0
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
    setSelectedBorrower(null)
    setSessionBooks([])
    setDeskMessage(null)
    setScanQuery('')
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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
            Issue Desk
          </h2>
          <p className="text-xs text-slate-500">
            Scan learner ID card or admission number, then scan textbook barcodes
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
              <input
                ref={scanInputRef}
                type="text"
                value={scanQuery}
                onChange={(e) => setScanQuery(e.target.value)}
                placeholder="Scan or type Barcode / Admission # (Press Enter)..."
                className="w-full text-base sm:text-lg font-mono rounded-lg border-2 border-primary/30 bg-slate-50 dark:bg-slate-900 px-4 py-3 pl-12 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                autoComplete="off"
              />
              <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-primary pointer-events-none" />
            </div>
            <Button type="submit" variant="primary" className="px-6 text-base">
              Scan
            </Button>
          </form>

          {deskMessage && (
            <div
              className={`mt-3 flex items-center gap-2 rounded-md p-3 text-xs font-semibold ${
                deskMessage.type === 'success'
                  ? 'bg-success-50 text-success-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : deskMessage.type === 'error'
                  ? 'bg-danger-50 text-danger dark:bg-red-950/60 dark:text-red-300'
                  : 'bg-info-50 text-info dark:bg-blue-950/60 dark:text-blue-300'
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
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                        {selectedBorrower.borrower.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono">{selectedBorrower.borrower.borrower_no}</span>
                        <span>•</span>
                        <Badge variant="info" size="sm">
                          {selectedBorrower.borrowerType.name}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Status indicators */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Open Loans:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {selectedBorrower.openIssuesCount} / {selectedBorrower.borrowerType.max_items} max
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Overdue Status:</span>
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
                      <span className="text-slate-500">Outstanding Charges:</span>
                      <span
                        className={`font-semibold ${
                          selectedBorrower.outstandingCharges > 0
                            ? 'text-danger'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {formatCurrency(selectedBorrower.outstandingCharges)}
                      </span>
                    </div>
                  </div>

                  {/* Loan Duration Selector */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Loan Duration
                    </label>
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
                <div className="p-8 text-center text-xs text-slate-400">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Scan borrower's card or enter admission number to begin.
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
                <div className="p-12 text-center text-xs text-slate-400">
                  No books scanned yet in this session.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sessionBooks.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-4 transition-colors ${
                        item.issued
                          ? 'bg-success-50/40 dark:bg-emerald-950/20'
                          : item.blocked && !item.override
                          ? 'bg-danger-50/40 dark:bg-red-950/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-3">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {item.copy.title?.title || 'Unknown Title'}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span className="font-mono">#{item.copy.barcode}</span>
                          <span>•</span>
                          <span>Due: {formatDate(item.dueAt)}</span>
                        </div>

                        {item.blocked && !item.issued && (
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-danger font-medium">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>{item.blockReason}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.issued ? (
                          <>
                            <Badge variant="success" size="sm">Issued ✓</Badge>
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
                        ) : item.blocked ? (
                          <Button
                            variant={item.override ? 'success' : 'outline'}
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() => handleToggleOverride(idx)}
                          >
                            {item.override ? 'Overridden ✓' : 'Override Block'}
                          </Button>
                        ) : (
                          <Badge variant="info" size="sm">
                            Ready
                          </Badge>
                        )}

                        {!item.issued && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-danger"
                            onClick={() => handleRemoveBook(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
