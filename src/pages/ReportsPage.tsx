import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, BarChart3, Download, Printer } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useBorrowerTypes, useClasses } from '@/hooks/useBorrowers'
import { useSubjects } from '@/hooks/useTitles'
import { useLibraryProfile } from '@/hooks/useLibraryProfile'
import { supabase } from '@/lib/supabase'
import { formatDate, formatDateTime } from '@/lib/utils'
import { toCsv } from '@/lib/reports'
import { printReportPdf } from '@/lib/reportPdf'

type ReportType = 'circulation' | 'outstanding' | 'condition' | 'collection' | 'inventory'

interface IssueReportRecord {
  id: string
  issued_at: string
  due_at: string
  returned_at: string | null
  condition_at_return: string | null
  status: string
  borrower: {
    id: string
    name: string
    borrower_no: string
    class_id: string | null
    borrower_type_id: string | null
    class: { name: string } | null
    borrower_type: { name: string } | null
  }
  copy: {
    barcode: string
    title: {
      title: string
      subject_id: string | null
      subject: { name: string } | null
    }
  }
}

interface CopyReportRecord {
  id: string
  barcode: string
  status: string
  condition: string
  title: {
    title: string
    subject_id: string | null
    subject: { name: string } | null
  }
}

interface InventoryReportRecord {
  barcode: string
  title: string
  authors: string
  isbn10: string | null
  isbn13: string | null
  subject: string | null
  grade_level: string | null
  book_type: string
  copy_status: string
  condition: string
  location: string | null
  call_number: string | null
  acquired_on: string | null
  price: number | null
}

interface InventoryCopyQueryRecord {
  barcode: string
  condition: string
  status: string
  call_number: string | null
  acquired_on: string | null
  price: number | null
  location: { name: string } | null
  title: {
    title: string
    isbn10: string | null
    isbn13: string | null
    grade_level: string | null
    type: string
    subject: { name: string } | null
    title_authors: Array<{ author: { name: string } | null }> | null
  }
}

interface ReportTable {
  headers: string[]
  rows: Array<{ key: string; cells: Array<string | number> }>
  metrics: Array<{ label: string; value: number }>
}

const PAGE_SIZE = 1000

const REPORT_TITLES: Record<ReportType, string> = {
  circulation: 'Circulation by Title and Class',
  outstanding: 'Outstanding Returns',
  condition: 'Lost and Damaged Items',
  collection: 'Collection Inventory',
  inventory: 'Full Copy-by-Copy Inventory',
}

function localDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function displayDate(value: string): string {
  if (!value) return '—'
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : formatDate(date)
}

async function fetchAllPages<T>(createQuery: () => any): Promise<T[]> {
  const records: T[] = []

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await createQuery().range(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)

    const page = (data || []) as T[]
    records.push(...page)
    if (page.length < PAGE_SIZE) return records
  }
}

function buildReportTable(
  reportType: ReportType,
  records: IssueReportRecord[] | CopyReportRecord[] | InventoryReportRecord[]
): ReportTable {
  if (reportType === 'inventory') {
    const inventory = records as InventoryReportRecord[]
    const rows = inventory
      .sort((a, b) => a.title.localeCompare(b.title) || a.barcode.localeCompare(b.barcode))
      .map((copy) => ({
        key: copy.barcode,
        cells: [
          copy.barcode,
          copy.title,
          copy.authors,
          copy.isbn13 || copy.isbn10 || '',
          copy.subject || 'Unassigned',
          copy.grade_level || '',
          copy.book_type,
          copy.copy_status,
          copy.condition,
          copy.location || '',
          copy.call_number || '',
          copy.acquired_on || '',
          copy.price ?? '',
        ],
      }))

    return {
      headers: ['Barcode', 'Title', 'Author(s)', 'ISBN', 'Subject', 'Grade', 'Type', 'Status', 'Condition', 'Location', 'Call number', 'Acquired', 'Price (cents)'],
      rows,
      metrics: [
        { label: 'Inventory copies', value: inventory.length },
        { label: 'Available', value: inventory.filter((copy) => copy.copy_status === 'available').length },
        { label: 'Issued', value: inventory.filter((copy) => copy.copy_status === 'issued').length },
      ],
    }
  }

  if (reportType === 'collection') {
    const copies = records as CopyReportRecord[]
    const grouped = new Map<string, {
      title: string
      subject: string
      total: number
      available: number
      issued: number
      lost: number
      damaged: number
    }>()

    for (const copy of copies) {
      const subject = copy.title.subject?.name || 'Unassigned'
      const key = `${copy.title.title}\u0000${subject}`
      const summary = grouped.get(key) || {
        title: copy.title.title,
        subject,
        total: 0,
        available: 0,
        issued: 0,
        lost: 0,
        damaged: 0,
      }

      summary.total += 1
      if (copy.status === 'available') summary.available += 1
      if (copy.status === 'issued') summary.issued += 1
      if (copy.status === 'lost') summary.lost += 1
      if (copy.status === 'damaged' || copy.condition === 'damaged') summary.damaged += 1
      grouped.set(key, summary)
    }

    const rows = Array.from(grouped.values())
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((item) => ({
        key: `${item.title}-${item.subject}`,
        cells: [item.title, item.subject, item.total, item.available, item.issued, item.lost, item.damaged],
      }))

    return {
      headers: ['Title', 'Subject', 'Copies', 'Available', 'Issued', 'Lost', 'Damaged'],
      rows,
      metrics: [
        { label: 'Titles', value: rows.length },
        { label: 'Total copies', value: copies.length },
        { label: 'Available copies', value: copies.filter((copy) => copy.status === 'available').length },
      ],
    }
  }

  const issues = records as IssueReportRecord[]

  if (reportType === 'circulation') {
    const grouped = new Map<string, {
      title: string
      subject: string
      className: string
      issued: number
      returned: number
      outstanding: number
    }>()

    for (const issue of issues) {
      const title = issue.copy.title.title
      const subject = issue.copy.title.subject?.name || 'Unassigned'
      const className = issue.borrower.class?.name || 'No class'
      const key = `${title}\u0000${subject}\u0000${className}`
      const summary = grouped.get(key) || {
        title,
        subject,
        className,
        issued: 0,
        returned: 0,
        outstanding: 0,
      }

      summary.issued += 1
      if (issue.status === 'returned') summary.returned += 1
      if (issue.status === 'open') summary.outstanding += 1
      grouped.set(key, summary)
    }

    const rows = Array.from(grouped.values())
      .sort((a, b) => b.issued - a.issued || a.title.localeCompare(b.title))
      .map((item) => ({
        key: `${item.title}-${item.subject}-${item.className}`,
        cells: [item.title, item.subject, item.className, item.issued, item.returned, item.outstanding],
      }))

    return {
      headers: ['Title', 'Subject', 'Class', 'Issues', 'Returns', 'Still out'],
      rows,
      metrics: [
        { label: 'Titles circulated', value: new Set(issues.map((issue) => issue.copy.title.title)).size },
        { label: 'Issues', value: issues.length },
        { label: 'Still out', value: issues.filter((issue) => issue.status === 'open').length },
      ],
    }
  }

  if (reportType === 'outstanding') {
    const rows = issues
      .sort((a, b) => a.due_at.localeCompare(b.due_at))
      .map((issue) => ({
        key: issue.id,
        cells: [
          issue.borrower.name,
          issue.borrower.borrower_no,
          issue.borrower.class?.name || '—',
          issue.copy.title.title,
          issue.copy.barcode,
          formatDate(issue.due_at),
          new Date(issue.due_at).getTime() < Date.now() ? 'Overdue' : 'On time',
        ],
      }))

    return {
      headers: ['Borrower', 'Borrower no.', 'Class', 'Title', 'Barcode', 'Due date', 'Status'],
      rows,
      metrics: [
        { label: 'Outstanding items', value: issues.length },
        { label: 'Overdue', value: issues.filter((issue) => new Date(issue.due_at).getTime() < Date.now()).length },
        { label: 'Borrowers', value: new Set(issues.map((issue) => issue.borrower.id)).size },
      ],
    }
  }

  const conditionIssues = issues
    .sort((a, b) => b.issued_at.localeCompare(a.issued_at))
    .map((issue) => ({
      key: issue.id,
      cells: [
        formatDate(issue.issued_at),
        issue.borrower.name,
        issue.borrower.class?.name || '—',
        issue.copy.title.title,
        issue.copy.barcode,
        issue.status === 'lost' ? 'Lost' : issue.condition_at_return || '—',
        issue.status === 'lost' ? 'Lost' : 'Returned',
      ],
    }))

  return {
    headers: ['Issued', 'Borrower', 'Class', 'Title', 'Barcode', 'Condition', 'Outcome'],
    rows: conditionIssues,
    metrics: [
      { label: 'Lost or damaged', value: issues.length },
      { label: 'Lost', value: issues.filter((issue) => issue.status === 'lost').length },
      { label: 'Damaged returns', value: issues.filter((issue) => issue.condition_at_return === 'damaged').length },
    ],
  }
}

export const ReportsPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const snapshotId = searchParams.get('snapshotId')
  const autoDownloadSnapshotId = useRef<string | null>(null)
  const today = new Date()
  const monthAgo = new Date(today)
  monthAgo.setDate(monthAgo.getDate() - 30)

  const [reportType, setReportType] = useState<ReportType>(() =>
    searchParams.get('report') === 'inventory' ? 'inventory' : 'circulation'
  )
  const [fromDate, setFromDate] = useState(localDateValue(monthAgo))
  const [toDate, setToDate] = useState(localDateValue(today))
  const [classId, setClassId] = useState('')
  const [borrowerTypeId, setBorrowerTypeId] = useState('')
  const [subjectId, setSubjectId] = useState('')

  useEffect(() => {
    if (searchParams.get('report') === 'inventory') setReportType('inventory')
  }, [searchParams])

  const { data: classes = [] } = useClasses()
  const { data: borrowerTypes = [] } = useBorrowerTypes()
  const { data: subjects = [] } = useSubjects()
  const { profile: libraryProfile } = useLibraryProfile()

  const dateError = !['collection', 'inventory'].includes(reportType) && fromDate && toDate && fromDate > toDate
    ? 'The start date must be on or before the end date.'
    : ''

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['library-report', reportType, fromDate, toDate, classId, borrowerTypeId, subjectId, snapshotId],
    enabled: !dateError,
    queryFn: async (): Promise<IssueReportRecord[] | CopyReportRecord[] | InventoryReportRecord[]> => {
      if (reportType === 'inventory') {
        if (snapshotId) {
          const { data: report, error } = await (supabase as any)
            .from('inventory_reports')
            .select('id, generated_at, row_count, snapshot')
            .eq('id', snapshotId)
            .single()
          if (error) throw new Error(error.message)
          const snapshot = report?.snapshot as { rows?: InventoryReportRecord[] } | null
          if (!snapshot || !Array.isArray(snapshot.rows)) {
            throw new Error('The saved inventory snapshot does not contain a valid copy list.')
          }
          return snapshot.rows
        }

        const copies = await fetchAllPages<InventoryCopyQueryRecord>(() =>
          (supabase as any)
            .from('copies')
            .select(`
              barcode, condition, status, call_number, acquired_on, price,
              location:locations(name),
              title:titles!inner(
                title, isbn10, isbn13, grade_level, type,
                subject:subjects(name),
                title_authors(author:authors(name))
              )
            `)
            .is('deleted_at', null)
            .is('title.deleted_at', null)
            .order('barcode')
        )

        return copies.map((copy) => ({
          barcode: copy.barcode,
          title: copy.title.title,
          authors: (copy.title.title_authors || [])
            .map((link) => link.author?.name)
            .filter((name): name is string => !!name)
            .join(', '),
          isbn10: copy.title.isbn10,
          isbn13: copy.title.isbn13,
          subject: copy.title.subject?.name || null,
          grade_level: copy.title.grade_level,
          book_type: copy.title.type,
          copy_status: copy.status,
          condition: copy.condition,
          location: copy.location?.name || null,
          call_number: copy.call_number,
          acquired_on: copy.acquired_on,
          price: copy.price,
        }))
      }

      if (reportType === 'collection') {
        return fetchAllPages<CopyReportRecord>(() => {
          let query = (supabase as any)
            .from('copies')
            .select('id, barcode, status, condition, title:titles!inner(title, subject_id, subject:subjects(name))')
            .is('deleted_at', null)
            .is('title.deleted_at', null)
            .order('barcode')

          if (subjectId) query = query.eq('title.subject_id', subjectId)
          return query
        })
      }

      return fetchAllPages<IssueReportRecord>(() => {
        let query = (supabase as any)
          .from('issues')
          .select(`
            id, issued_at, due_at, returned_at, condition_at_return, status,
            borrower:borrowers!inner(
              id, name, borrower_no, class_id, borrower_type_id,
              class:classes(name),
              borrower_type:borrower_types(name)
            ),
            copy:copies!inner(
              barcode,
              title:titles!inner(title, subject_id, subject:subjects(name))
            )
          `)
          .is('deleted_at', null)
          .is('borrower.deleted_at', null)
          .is('copy.deleted_at', null)
          .is('copy.title.deleted_at', null)

        if (reportType === 'outstanding') {
          query = query.eq('status', 'open')
          if (fromDate) query = query.gte('due_at', new Date(`${fromDate}T00:00:00`).toISOString())
          if (toDate) query = query.lte('due_at', new Date(`${toDate}T23:59:59.999`).toISOString())
        } else {
          if (fromDate) query = query.gte('issued_at', new Date(`${fromDate}T00:00:00`).toISOString())
          if (toDate) query = query.lte('issued_at', new Date(`${toDate}T23:59:59.999`).toISOString())
        }

        if (classId) query = query.eq('borrower.class_id', classId)
        if (borrowerTypeId) query = query.eq('borrower.borrower_type_id', borrowerTypeId)
        if (subjectId) query = query.eq('copy.title.subject_id', subjectId)
        if (reportType === 'condition') {
          query = query.or('status.eq.lost,condition_at_return.in.(poor,damaged)')
        }

        return query.order('issued_at', { ascending: false })
      })
    },
  })

  const table = useMemo(
    () => buildReportTable(reportType, data || []),
    [reportType, data]
  )

  const activeFilters = useMemo(() => {
    const filters: string[] = []

    if (reportType !== 'collection' && reportType !== 'inventory') {
      const label = reportType === 'outstanding' ? 'Due' : 'Issued'
      filters.push(`${label} ${displayDate(fromDate)} to ${displayDate(toDate)}`)
      filters.push(`Class: ${classes.find((item) => item.id === classId)?.name || 'All classes'}`)
      filters.push(
        `Borrower type: ${
          borrowerTypes.find((item) => item.id === borrowerTypeId)?.name || 'All borrower types'
        }`
      )
    }

    if (reportType !== 'inventory') {
      filters.push(`Subject: ${subjects.find((item) => item.id === subjectId)?.name || 'All subjects'}`)
    }

    if (snapshotId && reportType === 'inventory') filters.push('Saved monthly snapshot')

    return filters
  }, [
    reportType,
    fromDate,
    toDate,
    classId,
    borrowerTypeId,
    subjectId,
    classes,
    borrowerTypes,
    subjects,
    snapshotId,
  ])

  const generatedAt = useMemo(
    () => new Date(),
    [reportType, fromDate, toDate, classId, borrowerTypeId, subjectId, data]
  )

  const handleExport = useCallback(() => {
    try {
      const csv = toCsv(table.headers, table.rows.map((row) => row.cells))
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `library-${reportType}-${localDateValue(new Date())}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      toast.success('CSV export ready', {
        description: `${REPORT_TITLES[reportType]} • ${table.rows.length.toLocaleString()} rows`,
        duration: 4000,
      })
    } catch (err: any) {
      toast.error('Could not export the report', {
        description: err?.message || 'The CSV file could not be generated.',
        duration: 6000,
      })
    }
  }, [reportType, table])

  const handlePrint = useCallback(() => {
    try {
      printReportPdf({
        libraryName: libraryProfile?.name || 'School Library',
        libraryAddress: libraryProfile?.address,
        libraryPhone: libraryProfile?.phone,
        title: REPORT_TITLES[reportType],
        generatedAt: new Date(),
        filters: activeFilters,
        headers: table.headers,
        rows: table.rows.map((row) => row.cells),
        metrics: table.metrics,
      })

      toast.success('Print-ready PDF opened', {
        description: 'Use the print dialog to print, or save it as a PDF.',
        duration: 4500,
      })
    } catch (err: any) {
      toast.error('Could not open the report PDF', {
        description:
          err?.message || 'Allow pop-ups for this site, then try the Print button again.',
        duration: 6000,
      })
    }
  }, [activeFilters, libraryProfile, reportType, table])

  useEffect(() => {
    if (
      !snapshotId ||
      searchParams.get('download') !== '1' ||
      reportType !== 'inventory' ||
      isLoading ||
      error ||
      autoDownloadSnapshotId.current === snapshotId
    ) return
    handleExport()
    autoDownloadSnapshotId.current = snapshotId
  }, [snapshotId, searchParams, reportType, isLoading, error, handleExport])

  const reportOptions = [
    { value: 'circulation', label: 'Circulation by title and class' },
    { value: 'outstanding', label: 'Outstanding returns' },
    { value: 'condition', label: 'Lost and damaged items' },
    { value: 'collection', label: 'Collection inventory' },
    { value: 'inventory', label: 'Full copy-by-copy inventory' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-heading sm:text-2xl">
          Library Reports & Distribution
        </h2>
        <p className="text-sm text-muted">
          Review circulation and inventory, then download a full copy-by-copy report or print the results.
        </p>
      </div>

      <Card className="report-controls">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Report"
            value={reportType}
            onChange={(event) => setReportType(event.target.value as ReportType)}
            options={reportOptions}
          />
          <Input
            label={reportType === 'outstanding' ? 'Due from' : 'From date'}
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            disabled={reportType === 'collection' || reportType === 'inventory'}
          />
          <Input
            label={reportType === 'outstanding' ? 'Due through' : 'To date'}
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            disabled={reportType === 'collection' || reportType === 'inventory'}
          />
          <Select
            label="Class"
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
            disabled={reportType === 'collection' || reportType === 'inventory'}
            options={[
              { value: '', label: 'All classes' },
              ...classes.map((classGroup) => ({ value: classGroup.id, label: classGroup.name })),
            ]}
          />
          <Select
            label="Borrower type"
            value={borrowerTypeId}
            onChange={(event) => setBorrowerTypeId(event.target.value)}
            disabled={reportType === 'collection' || reportType === 'inventory'}
            options={[
              { value: '', label: 'All borrower types' },
              ...borrowerTypes.map((type) => ({ value: type.id, label: type.name })),
            ]}
          />
          <Select
            label="Subject"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            disabled={reportType === 'inventory'}
            options={[
              { value: '', label: 'All subjects' },
              ...subjects.map((subject) => ({ value: subject.id, label: subject.name })),
            ]}
          />
          {dateError && (
            <p className="text-sm text-danger sm:col-span-2 lg:col-span-3" role="alert">
              {dateError}
            </p>
          )}
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
            <Button variant="primary" onClick={() => refetch()} disabled={!!dateError || isLoading}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Refresh report
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={isLoading || (table.rows.length === 0 && reportType !== 'inventory')}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={isLoading || table.rows.length === 0}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Could not generate this report: {error.message}</span>
        </div>
      )}

      {snapshotId && reportType === 'inventory' && !error && !isLoading && (
        <div className="rounded-md border border-caution/30 bg-caution/10 p-3 text-sm text-caution">
          This saved monthly snapshot is ready. Its CSV download starts automatically when the page opens.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {table.metrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase text-faint">{metric.label}</p>
              <p className="mt-1 text-2xl font-bold text-heading">
                {isLoading ? '—' : metric.value.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {!error && (
            <div className="flex flex-col gap-1.5 border-b border-line px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-heading">{REPORT_TITLES[reportType]}</p>
                <p className="mt-0.5 text-xs text-faint">{activeFilters.join('  •  ')}</p>
              </div>
              <p className="text-xs text-muted">
                {isLoading ? 'Generating…' : `${table.rows.length.toLocaleString()} rows`}
                {!isLoading && ` · Generated ${formatDateTime(generatedAt.toISOString())}`}
              </p>
            </div>
          )}
          {isLoading ? (
            <div className="p-8 text-center text-sm text-faint">Generating report…</div>
          ) : !error && table.rows.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={<BarChart3 className="h-8 w-8 text-primary" />}
                title="No report data found"
                description="Try widening the date range or changing the selected filters."
              />
            </div>
          ) : !error ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-1">
                    {table.headers.map((header) => (
                      <th key={header} className="whitespace-nowrap p-3 text-xs font-semibold text-muted">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {table.rows.map((row) => (
                    <tr key={row.key} className="hover:bg-surface-2">
                      {row.cells.map((cell, index) => (
                        <td key={`${row.key}-${index}`} className="p-3 text-body">
                          {reportType === 'outstanding' && index === row.cells.length - 1 ? (
                            <Badge variant={cell === 'Overdue' ? 'danger' : 'success'}>{cell}</Badge>
                          ) : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
