import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  GraduationCap,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle,
  Clock,
  BookOpen,
  DollarSign,
  UserX,
  UserCheck,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { useBorrower, useUpdateBorrower } from '@/hooks/useBorrowers'
import type { Issue, Charge } from '@/types'
import { formatDate, formatCurrency, daysUntilDue } from '@/lib/utils'

export const BorrowerDetailPage: React.FC = () => {
  const { borrowerId } = useParams<{ borrowerId: string }>()
  const { data, isLoading, error } = useBorrower(borrowerId)
  const updateBorrower = useUpdateBorrower()
  const [tab, setTab] = useState('current')
  const [deactivateError, setDeactivateError] = useState<string | null>(null)

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading borrower details...</div>
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-red-200 bg-white p-8 text-center dark:border-red-900 dark:bg-slate-900">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-600" />
        <h3 className="text-lg font-bold">Borrower details could not be loaded</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">{error.message}</p>
        <Link to="/borrowers"><Button variant="outline">Back to Borrowers</Button></Link>
      </div>
    )
  }

  if (!data?.borrower) {
    return (
      <div className="p-8 text-center space-y-4">
        <h3 className="text-lg font-bold">Borrower not found</h3>
        <Link to="/borrowers">
          <Button variant="outline">Back to Borrowers</Button>
        </Link>
      </div>
    )
  }

  const { borrower, issues, charges, openIssuesCount, outstandingBalance } = data

  const openIssues = issues.filter((i) => i.status === 'open')
  const historyIssues = issues.filter((i) => i.status !== 'open')

  const handleToggleActive = async () => {
    setDeactivateError(null)

    if (borrower.status === 'active') {
      // Guard: Cannot deactivate borrower with open issues (FR-20, AC-8)
      if (openIssuesCount > 0) {
        setDeactivateError(
          `Cannot deactivate borrower: borrower currently holds ${openIssuesCount} unreturned book(s). All items must be returned or marked lost first.`
        )
        return
      }

      if (window.confirm('Are you sure you want to set this borrower to Inactive?')) {
        await updateBorrower.mutateAsync({
          id: borrower.id,
          status: 'inactive',
          left_on: new Date().toISOString().split('T')[0],
        })
      }
    } else {
      if (window.confirm('Reactivate this borrower?')) {
        await updateBorrower.mutateAsync({
          id: borrower.id,
          status: 'active',
          left_on: null,
        })
      }
    }
  }

  const issueColumns: Column<Issue>[] = [
    {
      key: 'title',
      header: 'Title & Author',
      accessor: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {row.copy?.title?.title || 'Unknown Title'}
          </span>
          <span className="text-xs text-slate-500">
            by {row.copy?.title?.author || 'Unknown'}
          </span>
        </div>
      ),
    },
    {
      key: 'barcode',
      header: 'Copy Barcode',
      accessor: (row) => (
        <span className="font-mono text-xs font-semibold">
          {row.copy?.barcode}
        </span>
      ),
    },
    {
      key: 'issued_at',
      header: 'Issued Date',
      accessor: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {formatDate(row.issued_at)}
        </span>
      ),
    },
    {
      key: 'due_at',
      header: 'Due Date',
      accessor: (row) => {
        const days = daysUntilDue(row.due_at)
        const isLate = days < 0
        return (
          <div className="flex flex-col">
            <span className="text-xs font-medium">{formatDate(row.due_at)}</span>
            {isLate ? (
              <Badge variant="danger" size="sm" className="mt-0.5">
                {Math.abs(days)}d overdue
              </Badge>
            ) : days <= 3 ? (
              <Badge variant="warning" size="sm" className="mt-0.5">
                Due in {days}d
              </Badge>
            ) : null}
          </div>
        )
      },
    },
    {
      key: 'condition',
      header: 'Condition at Issue',
      accessor: (row) => (
        <Badge variant="gray" size="sm">
          {row.condition_at_issue}
        </Badge>
      ),
    },
  ]

  const chargeColumns: Column<Charge>[] = [
    {
      key: 'created_at',
      header: 'Date',
      accessor: (row) => (
        <span className="text-xs text-slate-500">{formatDate(row.created_at)}</span>
      ),
    },
    {
      key: 'type',
      header: 'Charge Type',
      accessor: (row) => (
        <Badge variant={row.type === 'lost' ? 'danger' : 'warning'} size="sm">
          {row.type}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Total Amount',
      accessor: (row) => (
        <span className="font-medium text-xs">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      key: 'paid_amount',
      header: 'Paid Amount',
      accessor: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {formatCurrency(row.paid_amount || 0)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => (
        <Badge
          variant={
            row.status === 'paid'
              ? 'success'
              : row.status === 'waived'
              ? 'gray'
              : 'danger'
          }
          size="sm"
        >
          {row.status}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/borrowers"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Borrowers
        </Link>
      </div>

      {deactivateError && (
        <div className="flex items-center gap-2 rounded-lg bg-danger-50 p-4 text-xs font-medium text-danger border border-danger-200 dark:bg-red-950/60 dark:border-red-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{deactivateError}</span>
        </div>
      )}

      {/* Profile Summary Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-800 dark:bg-primary-950 dark:text-primary-300 font-bold text-2xl">
                {borrower.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
                    {borrower.name}
                  </h1>
                  <Badge variant={borrower.status === 'active' ? 'success' : 'danger'}>
                    {borrower.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>ID: <strong className="font-mono">{borrower.borrower_no}</strong></span>
                  <span>•</span>
                  <span>Type: <strong>{borrower.borrower_type?.name || 'Learner'}</strong></span>
                  {borrower.class && (
                    <>
                      <span>•</span>
                      <span>Class: <strong>{borrower.class.name}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant={borrower.status === 'active' ? 'outline' : 'success'}
              size="sm"
              leftIcon={borrower.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
              onClick={handleToggleActive}
            >
              {borrower.status === 'active' ? 'Deactivate Borrower' : 'Reactivate Borrower'}
            </Button>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t border-slate-100 text-xs dark:border-slate-800 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <span className="text-slate-400">Open Loans:</span>
              <div className="text-base font-bold text-primary mt-0.5">
                {openIssuesCount} book(s)
              </div>
            </div>
            <div>
              <span className="text-slate-400">Outstanding Charges:</span>
              <div className={`text-base font-bold mt-0.5 ${outstandingBalance > 0 ? 'text-danger' : 'text-slate-800 dark:text-slate-200'}`}>
                {formatCurrency(outstandingBalance)}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Date of Birth:</span>
              <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                {formatDate(borrower.date_of_birth)}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Parent / Guardian:</span>
              <div className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                {borrower.guardian_name || '—'}
              </div>
              {borrower.guardian_phone && (
                <div className="mt-0.5 text-slate-500">{borrower.guardian_phone}</div>
              )}
              {borrower.guardian_email && (
                <div className="mt-0.5 break-all text-slate-500">{borrower.guardian_email}</div>
              )}
            </div>
            <div>
              <span className="text-slate-400">Direct Contact:</span>
              <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                {borrower.phone || borrower.email || '—'}
              </div>
              {borrower.email && borrower.phone && (
                <div className="mt-0.5 break-all text-slate-500">{borrower.email}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="current" badge={openIssuesCount}>
            Current Open Issues
          </TabsTrigger>
          <TabsTrigger value="history" badge={historyIssues.length}>
            Loan History
          </TabsTrigger>
          <TabsTrigger value="charges" badge={charges.length}>
            Charges & Fines
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <DataTable
            data={openIssues}
            columns={issueColumns}
            emptyTitle="No open issues"
            emptyMessage="This borrower currently has no books checked out."
          />
        </TabsContent>

        <TabsContent value="history">
          <DataTable
            data={historyIssues}
            columns={issueColumns}
            emptyTitle="No past loan history"
            emptyMessage="Returned loans will appear here."
          />
        </TabsContent>

        <TabsContent value="charges">
          <DataTable
            data={charges}
            columns={chargeColumns}
            emptyTitle="No charges recorded"
            emptyMessage="This borrower has no outstanding or past damage/lost charges."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
