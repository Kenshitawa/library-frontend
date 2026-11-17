import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Clock, RefreshCw, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { supabase } from '@/lib/supabase'
import type { Issue } from '@/types'
import { daysUntilDue, formatDate } from '@/lib/utils'

type ReturnFilter = 'overdue' | 'due-soon' | 'upcoming' | 'all'

const getDueLabel = (days: number) => {
  if (days < 0) {
    const daysLate = Math.abs(days)
    return `Overdue by ${daysLate} day${daysLate === 1 ? '' : 's'}`
  }
  if (days === 0) return 'Due today'
  return `Due in ${days} day${days === 1 ? '' : 's'}`
}

const getDueVariant = (days: number): 'danger' | 'warning' | 'info' => {
  if (days < 0) return 'danger'
  if (days <= 7) return 'warning'
  return 'info'
}

export const ReturnsPage: React.FC = () => {
  const [filter, setFilter] = useState<ReturnFilter>('due-soon')
  const [search, setSearch] = useState('')
  const {
    data: issues = [],
    isLoading,
    isFetching,
    error,
    dataUpdatedAt,
    refetch,
  } = useQuery({
    queryKey: ['returns', 'open-issues'],
    queryFn: async (): Promise<Issue[]> => {
      const { data, error } = await (supabase as any)
        .from('issues')
        .select(`
          *,
          borrower:borrowers(*, class:classes(*)),
          copy:copies(*, title:titles(*))
        `)
        .eq('status', 'open')
        .is('deleted_at', null)
        .order('due_at', { ascending: true })
        .limit(1000)

      if (error) throw new Error(error.message)
      return (data || []) as Issue[]
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  })

  const counts = useMemo(() => {
    return issues.reduce(
      (result, issue) => {
        const days = daysUntilDue(issue.due_at)
        if (days < 0) result.overdue += 1
        else if (days <= 7) result.dueSoon += 1
        else result.upcoming += 1
        return result
      },
      { overdue: 0, dueSoon: 0, upcoming: 0 }
    )
  }, [issues])

  const visibleIssues = useMemo(() => {
    const query = search.trim().toLowerCase()
    return issues.filter((issue) => {
      const days = daysUntilDue(issue.due_at)
      const matchesFilter =
        filter === 'all' ||
        (filter === 'overdue' && days < 0) ||
        (filter === 'due-soon' && days >= 0 && days <= 7) ||
        (filter === 'upcoming' && days > 7)
      if (!matchesFilter) return false
      if (!query) return true

      const searchableText = [
        issue.borrower?.name,
        issue.borrower?.borrower_no,
        issue.borrower?.class?.name,
        issue.copy?.title?.title,
        issue.copy?.barcode,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchableText.includes(query)
    })
  }, [filter, issues, search])

  const filters: Array<{ value: ReturnFilter; label: string; count: number }> = [
    { value: 'due-soon', label: 'Due next 7 days', count: counts.dueSoon },
    { value: 'overdue', label: 'Overdue', count: counts.overdue },
    { value: 'upcoming', label: 'Later', count: counts.upcoming },
    { value: 'all', label: 'All open loans', count: issues.length },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-heading sm:text-2xl">
            Returns
          </h2>
          <p className="text-sm text-muted">
            See who has books due, what is overdue and when each return is expected.
          </p>
        </div>
        <Button
          variant="outline"
          leftIcon={<RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />}
          loading={isFetching}
          onClick={() => refetch()}
        >
          Refresh list
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-faint">Due next 7 days</p>
              <p className="mt-1 text-xl font-semibold text-heading">
                {counts.dueSoon}
              </p>
            </div>
            <Clock className="h-5 w-5 text-warning" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-faint">Overdue</p>
              <p className="mt-1 text-xl font-semibold text-danger">{counts.overdue}</p>
            </div>
            <AlertCircle className="h-5 w-5 text-danger" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-faint">Due later</p>
              <p className="mt-1 text-xl font-semibold text-heading">
                {counts.upcoming}
              </p>
            </div>
            <Clock className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger dark:border-danger-900 dark:bg-red-950/40"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Return information could not be refreshed: {error.message}</span>
        </div>
      )}

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Books to follow up</CardTitle>
              <p className="mt-1 text-xs text-faint">
                Updates every minute, including while this page is in the background.
                {dataUpdatedAt > 0 && (
                  <> Last checked {new Date(dataUpdatedAt).toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi' })}.</>
                )}
              </p>
            </div>
            <Input
              className="sm:max-w-xs"
              placeholder="Search borrower, class, title or barcode..."
              leftAddon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Tabs value={filter} onValueChange={(value) => setFilter(value as ReturnFilter)}>
            <TabsList className="w-full justify-start overflow-x-auto">
              {filters.map((item) => (
                <TabsTrigger key={item.value} value={item.value} badge={item.count}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-5 text-sm text-faint">Loading open returns…</p>
          ) : visibleIssues.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-body">
                {search ? 'No returns match your search.' : 'No books in this return list.'}
              </p>
              <p className="mt-1 text-xs text-faint">
                Try another filter or clear the search.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {visibleIssues.map((issue) => {
                const days = daysUntilDue(issue.due_at)
                return (
                  <Link
                    key={issue.id}
                    to={`/borrowers/${issue.borrower_id}`}
                    className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-heading">
                        {issue.borrower?.name || 'Unknown borrower'}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-faint">
                        {issue.borrower?.class?.name || issue.borrower?.borrower_no || 'No class'}
                        {' · '}
                        {issue.copy?.title?.title || 'Unknown title'}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        Barcode {issue.copy?.barcode || 'not recorded'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                      <span className="text-xs text-faint">{formatDate(issue.due_at)}</span>
                      <Badge variant={getDueVariant(days)} size="sm">
                        {getDueLabel(days)}
                      </Badge>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
          {issues.length === 1000 && (
            <p className="border-t border-line px-4 py-3 text-xs text-faint">
              Showing the first 1,000 open loans. Use search to narrow the list.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
