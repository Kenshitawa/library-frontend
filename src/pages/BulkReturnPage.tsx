import React, { useState, useRef, useEffect } from 'react'
import {
  ArrowLeftCircle,
  Barcode,
  CheckCircle2,
  Users,
  BookOpen,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { useClasses } from '@/hooks/useBorrowers'
import { useReturnCopy } from '@/hooks/useIssues'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface ClassIssueRecord {
  issueId: string
  borrowerId: string
  borrowerName: string
  admissionNumber: string
  copyId: string
  barcode: string
  title: string
  returned: boolean
}

export const BulkReturnPage: React.FC = () => {
  const { user } = useAuth()
  const { data: classes = [] } = useClasses()
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [classIssues, setClassIssues] = useState<ClassIssueRecord[]>([])
  const [loadingIssues, setLoadingIssues] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [recentReturns, setRecentReturns] = useState<
    { barcode: string; title: string; borrowerName: string; time: string }[]
  >([])

  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const returnMutation = useReturnCopy()

  // Fetch open issues for this class
  useEffect(() => {
    if (!selectedClassId) {
      setClassIssues([])
      return
    }

    const loadClassIssues = async () => {
      setLoadingIssues(true)
      try {
        const { data, error } = await (supabase as any)
          .from('issues')
          .select(`
            id,
            copy_id,
            borrower_id,
            status,
            borrower:borrowers!inner(
              id,
              name,
              borrower_no,
              class_id
            ),
            copy:copies!inner(
              id,
              barcode,
              title:titles(title)
            )
          `)
          .eq('borrowers.class_id', selectedClassId)
          .eq('status', 'open')

        if (error) throw error

        const mapped: ClassIssueRecord[] = (data || []).map((row: any) => ({
          issueId: row.id,
          borrowerId: row.borrower.id,
          borrowerName: row.borrower.name,
          admissionNumber: row.borrower.borrower_no || '',
          copyId: row.copy.id,
          barcode: row.copy.barcode,
          title: row.copy.title?.title || 'Unknown Title',
          returned: false,
        }))

        setClassIssues(mapped)
      } catch (err: any) {
        toast.error('Failed to load class issues: ' + err.message)
      } finally {
        setLoadingIssues(false)
      }
    }

    loadClassIssues()
  }, [selectedClassId])

  // Focus barcode input
  useEffect(() => {
    barcodeInputRef.current?.focus()
  }, [selectedClassId])

  const handleScanBarcode = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = barcodeInput.trim()
    if (!code) return
    setBarcodeInput('')

    // Find in classIssues
    const matchIndex = classIssues.findIndex(
      (item) => item.barcode.toLowerCase() === code.toLowerCase() && !item.returned
    )

    if (matchIndex === -1) {
      // Not an open issue for this class or already returned
      // Check if it's already returned in this session
      const alreadyReturned = classIssues.some(
        (item) => item.barcode.toLowerCase() === code.toLowerCase() && item.returned
      )
      if (alreadyReturned) {
        toast.info(`Barcode ${code} has already been returned in this session.`)
      } else {
        toast.error(`Barcode ${code} not found among open issues for this class.`)
      }
      return
    }

    const item = classIssues[matchIndex]

    try {
      await returnMutation.mutateAsync({
        issueId: item.issueId,
        copyId: item.copyId,
        returnedTo: user?.id || '',
        conditionAtReturn: 'good',
        returnNote: 'Class bulk return',
      })

      // Update state
      setClassIssues((prev) =>
        prev.map((ci, idx) => (idx === matchIndex ? { ...ci, returned: true } : ci))
      )

      setRecentReturns((prev) => [
        {
          barcode: item.barcode,
          title: item.title,
          borrowerName: item.borrowerName,
          time: new Date().toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi' }),
        },
        ...prev,
      ])

      toast.success(`Returned "${item.title}" for ${item.borrowerName}`)
    } catch (err: any) {
      toast.error('Failed to process return: ' + err.message)
    } finally {
      barcodeInputRef.current?.focus()
    }
  }

  const unreturnedCount = classIssues.filter((i) => !i.returned).length
  const returnedCount = classIssues.filter((i) => i.returned).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-heading sm:text-2xl">
            Class Bulk Returns Desk
          </h2>
          <p className="text-xs text-faint">
            Select a class, scan returned textbooks, and see live tracking of which learners still hold books
          </p>
        </div>
      </div>

      {/* Class Selection & Scanner Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="p-4 sm:p-6 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
              Select Class
            </label>
            <Select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              options={[
                { value: '', label: '-- Select a Class --' },
                ...classes.map((c) => ({
                  value: c.id,
                  label: `${c.grade_level || ''} ${c.name} (${c.year || ''})`.trim(),
                })),
              ]}
            />

            {selectedClassId && (
              <div className="pt-2 text-xs space-y-1 text-faint">
                <div className="flex justify-between">
                  <span>Total books to collect:</span>
                  <span className="font-semibold">{classIssues.length}</span>
                </div>
                <div className="flex justify-between text-success">
                  <span>Collected this session:</span>
                  <span className="font-semibold">{returnedCount}</span>
                </div>
                <div className="flex justify-between text-amber-600">
                  <span>Still outstanding:</span>
                  <span className="font-semibold">{unreturnedCount}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="p-4 sm:p-6 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
              Scan Book Barcode
            </label>
            <form onSubmit={handleScanBarcode} className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                <Input
                  ref={barcodeInputRef}
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan or enter book barcode (e.g. BC-00123)..."
                  className="pl-10 text-lg font-mono"
                  disabled={!selectedClassId}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={!selectedClassId || !barcodeInput.trim()}
                loading={returnMutation.isPending}
              >
                Return Book
              </Button>
            </form>
            <p className="text-xs text-faint">
              Scanner automatically focuses for continuous scanning. Books will be returned and copy status set to available.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Roster View */}
      {selectedClassId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-line pb-3">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Outstanding Learners ({unreturnedCount})
                  </CardTitle>
                  <CardDescription>
                    Learners who still hold unreturned books for this class
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingIssues ? (
                  <div className="p-6 text-center text-faint text-sm">
                    Loading class records...
                  </div>
                ) : classIssues.filter((i) => !i.returned).length === 0 ? (
                  <div className="p-8">
                    <EmptyState
                      icon={<CheckCircle2 className="h-8 w-8 text-success" />}
                      title="All books returned!"
                      description="All learners in this class have returned their issued textbooks."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-line bg-surface-1">
                          <th className="p-3 font-semibold text-body">
                            Learner
                          </th>
                          <th className="p-3 font-semibold text-body">
                            Admission #
                          </th>
                          <th className="p-3 font-semibold text-body">
                            Book Title
                          </th>
                          <th className="p-3 font-semibold text-body">
                            Barcode
                          </th>
                          <th className="p-3 font-semibold text-body text-right">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {classIssues
                          .filter((i) => !i.returned)
                          .map((item) => (
                            <tr
                              key={item.issueId}
                              className="hover:bg-surface-2"
                            >
                              <td className="p-3 font-medium text-heading">
                                {item.borrowerName}
                              </td>
                              <td className="p-3 font-mono text-xs text-faint">
                                {item.admissionNumber || '—'}
                              </td>
                              <td className="p-3 text-body">
                                {item.title}
                              </td>
                              <td className="p-3 font-mono text-xs text-primary font-semibold">
                                {item.barcode}
                              </td>
                              <td className="p-3 text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={async () => {
                                    try {
                                      await returnMutation.mutateAsync({
                                        issueId: item.issueId,
                                        copyId: item.copyId,
                                        returnedTo: user?.id || '',
                                        conditionAtReturn: 'good',
                                        returnNote: 'Class bulk return',
                                      })
                                      setClassIssues((prev) =>
                                        prev.map((ci) =>
                                          ci.issueId === item.issueId ? { ...ci, returned: true } : ci
                                        )
                                      )
                                      setRecentReturns((prev) => [
                                        {
                                          barcode: item.barcode,
                                          title: item.title,
                                          borrowerName: item.borrowerName,
                                          time: new Date().toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi' }),
                                        },
                                        ...prev,
                                      ])
                                      toast.success(`Returned "${item.title}"`)
                                    } catch (err: any) {
                                      toast.error(err.message)
                                    }
                                  }}
                                >
                                  Return
                                </Button>
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

          {/* Recent Returns Feed */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="border-b border-line pb-3">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <span>Collected ({returnedCount})</span>
                  <RotateCcw className="h-4 w-4 text-muted" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {recentReturns.length === 0 ? (
                  <p className="text-xs text-muted py-6 text-center">
                    No books scanned yet in this session.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentReturns.map((r, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-line bg-surface-1 p-2.5 text-xs flex items-start gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        <div className="flex-1 overflow-hidden">
                          <p className="font-semibold text-heading truncate">
                            {r.title}
                          </p>
                          <p className="text-faint">{r.borrowerName}</p>
                          <div className="flex justify-between mt-1 text-[11px] text-muted">
                            <span className="font-mono">{r.barcode}</span>
                            <span>{r.time}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12">
            <EmptyState
              icon={<ArrowLeftCircle className="h-10 w-10 text-primary" />}
              title="Select a class to begin bulk return"
              description="Choose a class from the dropdown above to load the list of books to be collected from learners."
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
