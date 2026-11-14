import React, { useState } from 'react'
import {
  Users,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useClasses } from '@/hooks/useBorrowers'
import { useTitles } from '@/hooks/useTitles'
import { useClassLearners, useAvailableCopiesCount, useIssueToClass } from '@/hooks/useClassIssue'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export const ClassIssuePage: React.FC = () => {
  const { user } = useAuth()
  const { data: classes = [], isLoading: classesLoading } = useClasses()
  const { data: titlesData, isLoading: titlesLoading } = useTitles()
  const titles = titlesData || []

  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedTitleId, setSelectedTitleId] = useState<string>('')
  const [issueMode, setIssueMode] = useState<'single' | 'subject'>('single')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<Set<string>>(new Set())
  const [dueDays, setDueDays] = useState<number>(14)
  const [issueSummary, setIssueSummary] = useState<any>(null)

  const { data: learnersStatus = [], isLoading: learnersLoading } = useClassLearners(
    selectedClassId,
    issueMode === 'single' ? selectedTitleId : undefined
  )

  const { data: availableCopies = 0 } = useAvailableCopiesCount(
    issueMode === 'single' ? selectedTitleId : undefined
  )

  const issueMutation = useIssueToClass()

  // Initialize selected learners when learnersStatus loads
  React.useEffect(() => {
    if (learnersStatus.length > 0) {
      const eligible = new Set<string>()
      learnersStatus.forEach((ls) => {
        if (!ls.alreadyIssued && ls.borrower.status === 'active') {
          eligible.add(ls.borrower.id)
        }
      })
      setSelectedLearnerIds(eligible)
    } else {
      setSelectedLearnerIds(new Set())
    }
  }, [learnersStatus, selectedTitleId])

  const handleToggleLearner = (learnerId: string) => {
    const updated = new Set(selectedLearnerIds)
    if (updated.has(learnerId)) {
      updated.delete(learnerId)
    } else {
      updated.add(learnerId)
    }
    setSelectedLearnerIds(updated)
  }

  const handleSelectAllEligible = () => {
    const eligible = new Set<string>()
    learnersStatus.forEach((ls) => {
      if (!ls.alreadyIssued && ls.borrower.status === 'active') {
        eligible.add(ls.borrower.id)
      }
    })
    setSelectedLearnerIds(eligible)
  }

  const handleDeselectAll = () => {
    setSelectedLearnerIds(new Set())
  }

  const handleConfirmIssue = async () => {
    if (!selectedClassId) {
      toast.error('Please select a class')
      return
    }
    if (issueMode === 'single' && !selectedTitleId) {
      toast.error('Please select a textbook or library title')
      return
    }
    if (selectedLearnerIds.size === 0) {
      toast.error('No learners selected for issuing')
      return
    }
    if (availableCopies < selectedLearnerIds.size) {
      toast.error(
        `Not enough copies available (${availableCopies} available, ${selectedLearnerIds.size} selected)`
      )
      return
    }

    const dueAt = new Date()
    dueAt.setDate(dueAt.getDate() + dueDays)

    try {
      const result = await issueMutation.mutateAsync({
        classId: selectedClassId,
        titleId: selectedTitleId,
        issuedBy: user?.id || '',
        dueAt: dueAt.toISOString(),
        learnerIds: Array.from(selectedLearnerIds),
      })

      setIssueSummary(result)
      toast.success(
        `Issued ${result.issued_count || selectedLearnerIds.size} books to class successfully!`
      )
    } catch (err: any) {
      toast.error(err.message || 'Failed to issue books to class')
    }
  }

  const selectedClass = classes.find((c) => c.id === selectedClassId)
  const selectedTitle = titles.find((t) => t.id === selectedTitleId)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
            Class Bulk Issuing
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rapidly issue textbooks or class readers to all learners in a class in a single transaction
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={issueMode === 'single' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setIssueMode('single')}
          >
            <BookOpen className="mr-2 h-4 w-4" /> Single Title
          </Button>
          <Button
            variant={issueMode === 'subject' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setIssueMode('subject')}
          >
            <Layers className="mr-2 h-4 w-4" /> Subject Set Issue
          </Button>
        </div>
      </div>

      {/* Selection Control Card */}
      <Card>
        <CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Select Class
            </label>
            <Select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value)
                setIssueSummary(null)
              }}
              options={[
                { value: '', label: '-- Select a Class --' },
                ...classes.map((c) => ({
                  value: c.id,
                  label: `${c.grade_level || ''} ${c.name} (${c.year || ''})`.trim(),
                })),
              ]}
              disabled={classesLoading}
            />
          </div>

          {issueMode === 'single' ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Select Title
              </label>
              <Select
                value={selectedTitleId}
                onChange={(e) => {
                  setSelectedTitleId(e.target.value)
                  setIssueSummary(null)
                }}
                options={[
                  { value: '', label: '-- Select Title --' },
                  ...titles.map((t) => ({
                    value: t.id,
                    label: `${t.title} ${t.grade_level ? `[Grade ${t.grade_level}]` : ''} (${t.type})`,
                  })),
                ]}
                disabled={titlesLoading}
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Subject Filter
              </label>
              <Select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                options={[
                  { value: '', label: '-- All Subjects --' },
                  ...Array.from(new Set(titles.map((t) => t.subject?.name).filter(Boolean))).map(
                    (subName) => ({
                      value: subName as string,
                      label: subName as string,
                    })
                  ),
                ]}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Loan Period (Days)
            </label>
            <Select
              value={String(dueDays)}
              onChange={(e) => setDueDays(Number(e.target.value))}
              options={[
                { value: '7', label: '7 Days (1 Week)' },
                { value: '14', label: '14 Days (2 Weeks)' },
                { value: '30', label: '30 Days (1 Month)' },
                { value: '90', label: '90 Days (Term)' },
                { value: '180', label: '180 Days (Half Year)' },
                { value: '365', label: '365 Days (Full School Year)' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stock Availability Pill */}
      {selectedTitleId && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                {selectedTitle?.title}
              </h4>
              <p className="text-xs text-slate-500">
                Subject: {selectedTitle?.subject?.name || 'General'} | ISBN:{' '}
                {selectedTitle?.isbn13 || selectedTitle?.isbn10 || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-slate-500">Available Copies:</span>
              <div
                className={`text-lg font-bold ${
                  availableCopies >= selectedLearnerIds.size ? 'text-success' : 'text-danger'
                }`}
              >
                {availableCopies} in stock
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500">Selected Learners:</span>
              <div className="text-lg font-bold text-primary">{selectedLearnerIds.size}</div>
            </div>
          </div>
        </div>
      )}

      {/* Issue Summary Report Modal/Banner */}
      {issueSummary && (
        <div className="rounded-xl border border-success/30 bg-success-50 p-4 dark:bg-success-950/20">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-success shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-success-700 dark:text-success-400">
                Bulk Issuing Complete
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                Successfully issued to <strong>{issueSummary.issued_count}</strong> learners.{' '}
                {issueSummary.skipped_count > 0 && (
                  <span>
                    Skipped <strong>{issueSummary.skipped_count}</strong> learners (already issued or inactive).
                  </span>
                )}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setIssueSummary(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Learners Table Card */}
      {selectedClassId ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <CardTitle className="text-lg">
                Learners in {selectedClass?.name || 'Selected Class'}
              </CardTitle>
              <CardDescription>
                {learnersStatus.length} learners enrolled. Deselect any learners who should be skipped.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={handleSelectAllEligible}>
                Select All Eligible
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDeselectAll}>
                Deselect All
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {learnersLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : learnersStatus.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<Users className="h-8 w-8 text-slate-400" />}
                  title="No learners enrolled"
                  description="This class currently has no active learner profiles registered in the system."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                      <th className="p-3 w-12 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                          checked={
                            selectedLearnerIds.size > 0 &&
                            selectedLearnerIds.size ===
                              learnersStatus.filter(
                                (l) => !l.alreadyIssued && l.borrower.status === 'active'
                              ).length
                          }
                          onChange={(e) => {
                            if (e.target.checked) handleSelectAllEligible()
                            else handleDeselectAll()
                          }}
                        />
                      </th>
                      <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                        Learner Name
                      </th>
                      <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                        Admission #
                      </th>
                      <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                      <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                        Title Holding
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {learnersStatus.map(({ borrower, alreadyIssued, copyBarcode }) => {
                      const isSelected = selectedLearnerIds.has(borrower.id)
                      const isInactive = borrower.status === 'inactive'

                      return (
                        <tr
                          key={borrower.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                            alreadyIssued
                              ? 'bg-amber-50/30 dark:bg-amber-950/10'
                              : isInactive
                              ? 'opacity-60 bg-slate-50 dark:bg-slate-900'
                              : isSelected
                              ? 'bg-primary-50/30 dark:bg-primary-950/10'
                              : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary disabled:opacity-50"
                              disabled={alreadyIssued || isInactive}
                              checked={isSelected}
                              onChange={() => handleToggleLearner(borrower.id)}
                            />
                          </td>
                          <td className="p-3 font-medium text-slate-900 dark:text-slate-100">
                            {borrower.name}
                          </td>
                          <td className="p-3 font-mono text-xs text-slate-500">
                            {borrower.borrower_no || '—'}
                          </td>
                          <td className="p-3">
                            <Badge variant={borrower.status === 'active' ? 'success' : 'danger'}>
                              {borrower.status}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {alreadyIssued ? (
                              <Badge variant="warning" icon={<CheckCircle2 className="h-3 w-3" />}>
                                Already issued {copyBarcode ? `(#${copyBarcode})` : ''}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400">Available to issue</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>

          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 gap-4">
            <div className="text-xs text-slate-500">
              {selectedLearnerIds.size} learner(s) will receive 1 copy each. All issues recorded
              atomically.
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleConfirmIssue}
              loading={issueMutation.isPending}
              disabled={
                selectedLearnerIds.size === 0 ||
                availableCopies < selectedLearnerIds.size ||
                !selectedTitleId
              }
            >
              <Sparkles className="mr-2 h-4 w-4" /> Confirm Issue to {selectedLearnerIds.size}{' '}
              Learners
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12">
            <EmptyState
              icon={<Users className="h-10 w-10 text-primary" />}
              title="Select a class to begin"
              description="Choose a grade class above to inspect learners, verify available inventory, and issue textbooks in one click."
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
