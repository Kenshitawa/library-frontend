import React, { useState } from 'react'
import {
  Printer,
  Download,
  Users,
  Search,
  BookOpen,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { supabase } from '@/lib/supabase'
import { formatDate, daysUntilDue } from '@/lib/utils'
import { toast } from 'sonner'

interface ReturnDriveItem {
  classId: string
  className: string
  grade: string
  borrowers: {
    borrowerId: string
    borrowerName: string
    admissionNumber: string
    itemsCount: number
    overdueCount: number
    issues: {
      issueId: string
      title: string
      barcode: string
      dueAt: string
      isOverdue: boolean
    }[]
  }[]
}

export const ReturnDrivePage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')

  const { data: groupedClasses = [], isLoading } = useQuery({
    queryKey: ['return-drive-data'],
    queryFn: async (): Promise<ReturnDriveItem[]> => {
      const { data, error } = await (supabase as any)
        .from('issues')
        .select(`
          id,
          due_at,
          borrower:borrowers!inner(
            id,
            name,
            borrower_no,
            class_id,
            class:classes(id, name, grade_level)
          ),
          copy:copies!inner(
            id,
            barcode,
            title:titles(title)
          )
        `)
        .eq('status', 'open')
        .order('due_at', { ascending: true })

      if (error) throw new Error(error.message)

      const classMap = new Map<string, ReturnDriveItem>()
      const now = new Date()

      for (const row of data || []) {
        const c = row.borrower.class || { id: 'unassigned', name: 'Unassigned Class', grade: '' }
        const cId = c.id

        if (!classMap.has(cId)) {
          classMap.set(cId, {
            classId: cId,
            className: c.name || 'Unassigned',
            grade: c.grade_level || '',
            borrowers: [],
          })
        }

        const classGroup = classMap.get(cId)!
        let b = classGroup.borrowers.find((x) => x.borrowerId === row.borrower.id)
        if (!b) {
          b = {
            borrowerId: row.borrower.id,
            borrowerName: row.borrower.name,
            admissionNumber: row.borrower.borrower_no || '',
            itemsCount: 0,
            overdueCount: 0,
            issues: [],
          }
          classGroup.borrowers.push(b)
        }

        const isOverdue = new Date(row.due_at) < now
        b.itemsCount += 1
        if (isOverdue) b.overdueCount += 1

        b.issues.push({
          issueId: row.id,
          title: row.copy.title?.title || 'Unknown Title',
          barcode: row.copy.barcode,
          dueAt: row.due_at,
          isOverdue,
        })
      }

      return Array.from(classMap.values()).sort((a, b) =>
        a.className.localeCompare(b.className)
      )
    },
  })

  const handlePrint = () => {
    window.print()
  }

  const handleExportCsv = () => {
    const rows = [
      ['Class', 'Grade', 'Borrower Name', 'Admission Number', 'Book Title', 'Barcode', 'Due Date', 'Status'],
    ]

    groupedClasses.forEach((cg) => {
      cg.borrowers.forEach((b) => {
        b.issues.forEach((iss) => {
          rows.push([
            cg.className,
            cg.grade,
            b.borrowerName,
            b.admissionNumber,
            `"${iss.title.replace(/"/g, '""')}"`,
            iss.barcode,
            iss.dueAt ? iss.dueAt.slice(0, 10) : '',
            iss.isOverdue ? 'OVERDUE' : 'OPEN',
          ])
        })
      })
    })

    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `return-drive-report-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Return drive report downloaded as CSV')
  }

  const filteredClasses = groupedClasses
    .map((cg) => ({
      ...cg,
      borrowers: cg.borrowers.filter(
        (b) =>
          b.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cg.className.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((cg) => cg.borrowers.length > 0)

  const totalBorrowers = groupedClasses.reduce((acc, c) => acc + c.borrowers.length, 0)
  const totalBooks = groupedClasses.reduce(
    (acc, c) => acc + c.borrowers.reduce((bAcc, b) => bAcc + b.itemsCount, 0),
    0
  )

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body { background: white !important; color: black !important; font-size: 11pt !important; }
          .no-print { display: none !important; }
          aside, nav, header { display: none !important; }
          .print-block { page-break-inside: avoid; border: 1px solid #ccc; margin-bottom: 20px; }
          .print-header { display: block !important; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        }
        @media screen {
          .print-header { display: none; }
        }
      `}</style>

      {/* Screen Controls */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-heading sm:text-2xl">
            Return Drive Sheet
          </h2>
          <p className="text-xs text-faint">
            Comprehensive list of all open loans grouped by class for school-wide book collection drives
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="primary" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print Drive Sheets
          </Button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="no-print flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by learner, admission #, or class..."
            className="pl-9 text-sm"
          />
        </div>

        <div className="text-xs text-faint">
          <strong>{totalBorrowers}</strong> learners holding <strong>{totalBooks}</strong> items
        </div>
      </div>

      {/* Print Document Header */}
      <div className="print-header">
        <h1 className="text-2xl font-bold">School Library Textbook Return Drive</h1>
        <p className="text-sm">
          Generated: {new Date().toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi' })} | Total Learners: {totalBorrowers} | Total Items: {totalBooks}
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : filteredClasses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-faint">
            No open loans found matching your criteria.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredClasses.map((cg) => (
            <Card key={cg.classId} className="print-block overflow-hidden">
              <CardHeader className="bg-surface-1/50 border-b border-line py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base font-bold">
                      Class: {cg.className} {cg.grade ? `(Grade ${cg.grade})` : ''}
                    </CardTitle>
                  </div>
                  <Badge variant="outline">
                    {cg.borrowers.length} Learners |{' '}
                    {cg.borrowers.reduce((acc, b) => acc + b.itemsCount, 0)} Books
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-surface-1">
                      <th className="p-3 font-semibold text-muted">
                        Learner Name
                      </th>
                      <th className="p-3 font-semibold text-muted">
                        Adm #
                      </th>
                      <th className="p-3 font-semibold text-muted">
                        Items Outstanding
                      </th>
                      <th className="p-3 font-semibold text-muted text-center no-print">
                        Overdue
                      </th>
                      <th className="p-3 font-semibold text-muted">
                        Check-off / Signature
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {cg.borrowers.map((b) => (
                      <tr key={b.borrowerId} className="align-top hover:bg-surface-2/30">
                        <td className="p-3 font-medium text-heading">
                          {b.borrowerName}
                        </td>
                        <td className="p-3 font-mono text-faint">
                          {b.admissionNumber || '—'}
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            {b.issues.map((iss) => (
                              <div
                                key={iss.issueId}
                                className="flex items-center gap-2 text-[11px]"
                              >
                                <span className="font-semibold text-body">
                                  {iss.title}
                                </span>
                                <span className="font-mono text-muted">[{iss.barcode}]</span>
                                {iss.isOverdue && (
                                  <span className="text-danger font-medium">(Overdue)</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-center no-print">
                          {b.overdueCount > 0 ? (
                            <Badge variant="danger">{b.overdueCount} Overdue</Badge>
                          ) : (
                            <Badge variant="success">On track</Badge>
                          )}
                        </td>
                        <td className="p-3 border-l border-line w-48">
                          <div className="h-6 border-b border-dashed border-line-strong"></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
