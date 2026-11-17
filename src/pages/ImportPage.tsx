import React, { useState } from 'react'
import Papa from 'papaparse'
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Users,
  BookOpen,
  School,
  ArrowRight,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

type ImportTab = 'borrowers' | 'titles' | 'classes'

interface ParsedRow {
  index: number
  data: Record<string, any>
  valid: boolean
  errors: string[]
}

export const ImportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ImportTab>('borrowers')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [isCommitting, setIsCommitting] = useState<boolean>(false)
  const [commitSummary, setCommitSummary] = useState<any>(null)

  // Download Sample CSV Templates
  const handleDownloadTemplate = () => {
    let csv = ''
    let filename = ''

    if (activeTab === 'borrowers') {
      csv = 'name,borrower_no,email,guardian_phone,class_name,borrower_type\nJohn Doe,ADM-001,john@school.test,0821234567,Grade 8A,learner\nJane Smith,ADM-002,jane@school.test,0827654321,Grade 8A,learner\nMr. Teacher,,teacher@school.test,0831112233,,teacher'
      filename = 'borrowers-template.csv'
    } else if (activeTab === 'titles') {
      csv = 'title,author,isbn,publisher,year,subject,type,barcode,price\nEnglish in Context,P. Jones,9780123456789,Oxford Press,2021,English,textbook,BC-9901,150.00\nMathematics Gr8,S. Brown,9780987654321,Pearson,2022,Mathematics,textbook,BC-9902,220.00\nTo Kill a Mockingbird,Harper Lee,9780446310786,Grand Central,1960,English,library,BC-9903,120.00'
      filename = 'titles-copies-template.csv'
    } else {
      csv = 'name,grade,academic_year\nGrade 8A,8,2024\nGrade 8B,8,2024\nGrade 9A,9,2024'
      filename = 'classes-template.csv'
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // File Upload & Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setCommitSummary(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        validateRows(results.data as Record<string, any>[])
      },
      error: (err) => {
        toast.error('Failed to parse CSV file: ' + err.message)
      },
    })
  }

  // Row Validation
  const validateRows = (rawRows: Record<string, any>[]) => {
    const validated: ParsedRow[] = rawRows.map((row, idx) => {
      const errors: string[] = []

      if (activeTab === 'borrowers') {
        if (!row.name || !row.name.trim()) errors.push('Name is required')
        if (row.borrower_type === 'learner' && !row.borrower_no) {
          errors.push('Admission number required for learners')
        }
      } else if (activeTab === 'titles') {
        if (!row.title || !row.title.trim()) errors.push('Title is required')
        if (!row.barcode || !row.barcode.trim()) errors.push('Barcode is required')
      } else if (activeTab === 'classes') {
        if (!row.name || !row.name.trim()) errors.push('Class name is required')
      }

      return {
        index: idx + 1,
        data: row,
        valid: errors.length === 0,
        errors,
      }
    })

    setParsedRows(validated)
    const validCount = validated.filter((r) => r.valid).length
    toast.info(`Parsed ${validated.length} rows (${validCount} valid, ${validated.length - validCount} invalid)`)
  }

  // Commit valid rows
  const handleCommit = async () => {
    const validRows = parsedRows.filter((r) => r.valid)
    if (validRows.length === 0) {
      toast.error('No valid rows to import')
      return
    }

    setIsCommitting(true)
    let imported = 0
    let skipped = 0
    const duplicateErrors: string[] = []

    try {
      if (activeTab === 'borrowers') {
        // Fetch default borrower types & classes
        const { data: bTypes } = await (supabase as any).from('borrower_types').select('id, name')
        const { data: classes } = await (supabase as any).from('classes').select('id, name')

        const learnerTypeId = bTypes?.find((t: any) => t.name.toLowerCase() === 'learner')?.id || bTypes?.[0]?.id
        const teacherTypeId = bTypes?.find((t: any) => t.name.toLowerCase() === 'teacher')?.id || bTypes?.[0]?.id

        for (const r of validRows) {
          const row = r.data
          // Check for duplicate admission number
          if (row.borrower_no) {
            const { data: existing } = await (supabase as any)
              .from('borrowers')
              .select('id')
              .eq('borrower_no', row.borrower_no.trim())
              .maybeSingle()

            if (existing) {
              duplicateErrors.push(`Duplicate admission number "${row.borrower_no}" for ${row.name}`)
              skipped++
              continue
            }
          }

          const matchedClass = classes?.find(
            (c: any) => c.name.toLowerCase() === (row.class_name || '').toLowerCase()
          )
          const targetTypeId = (row.borrower_type || '').toLowerCase() === 'teacher' ? teacherTypeId : learnerTypeId

          const { error: insErr } = await (supabase as any).from('borrowers').insert({
            name: row.name.trim(),
            borrower_no: row.borrower_no ? row.borrower_no.trim() : null,
            email: row.email ? row.email.trim() : null,
            guardian_phone: row.guardian_phone ? row.guardian_phone.trim() : null,
            borrower_type_id: targetTypeId,
            class_id: matchedClass ? matchedClass.id : null,
            status: 'active',
          })

          if (insErr) {
            skipped++
          } else {
            imported++
          }
        }
      } else if (activeTab === 'titles') {
        // Fetch subjects
        const { data: subjects } = await (supabase as any).from('subjects').select('id, name')

        for (const r of validRows) {
          const row = r.data
          // Check duplicate barcode
          const { data: existingCopy } = await (supabase as any)
            .from('copies')
            .select('id')
            .eq('barcode', row.barcode.trim())
            .maybeSingle()

          if (existingCopy) {
            duplicateErrors.push(`Barcode "${row.barcode}" already exists in database`)
            skipped++
            continue
          }

          const matchedSub = subjects?.find(
            (s: any) => s.name.toLowerCase() === (row.subject || '').toLowerCase()
          )

          // Insert title
          const { data: titleData, error: tErr } = await (supabase as any)
            .from('titles')
            .insert({
              title: row.title.trim(),
              publisher: row.publisher ? row.publisher.trim() : null,
              year: row.year ? parseInt(row.year, 10) : null,
              subject_id: matchedSub ? matchedSub.id : null,
              type: ['textbook', 'reference', 'library'].includes(row.type?.toLowerCase())
                ? row.type.toLowerCase()
                : 'library',
              isbn13: row.isbn?.length === 13 ? row.isbn : null,
              isbn10: row.isbn?.length === 10 ? row.isbn : null,
            })
            .select()
            .single()

          if (tErr || !titleData) {
            skipped++
            continue
          }

          // Insert copy
          const priceCents = row.price ? Math.round(parseFloat(row.price) * 100) : 0
          const { error: cErr } = await (supabase as any).from('copies').insert({
            title_id: titleData.id,
            barcode: row.barcode.trim(),
            price: priceCents,
            status: 'available',
            condition: 'good',
          })

          if (cErr) {
            skipped++
          } else {
            imported++
          }
        }
      } else if (activeTab === 'classes') {
        for (const r of validRows) {
          const row = r.data
          const { error: insErr } = await (supabase as any).from('classes').insert({
            name: row.name.trim(),
            grade_level: row.grade ? row.grade.trim() : null,
            year: row.academic_year ? parseInt(row.academic_year, 10) : new Date().getFullYear(),
          })

          if (insErr) skipped++
          else imported++
        }
      }

      setCommitSummary({
        imported,
        skipped: skipped + (parsedRows.length - validRows.length),
        duplicateErrors,
      })
      toast.success(`Import complete! ${imported} records successfully imported.`)
      setParsedRows([])
      setFileName('')
    } catch (err: any) {
      toast.error('Import failed: ' + err.message)
    } finally {
      setIsCommitting(false)
    }
  }

  const validCount = parsedRows.filter((r) => r.valid).length
  const invalidCount = parsedRows.filter((r) => !r.valid).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-heading sm:text-2xl">
            CSV Data Import
          </h2>
          <p className="text-xs text-faint">
            Batch import school rosters, library titles, copies, and grade classes with automatic validation and error reporting
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
          <Download className="mr-2 h-4 w-4" /> Download Sample CSV Template
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(tab) => {
          setActiveTab(tab as ImportTab)
          setParsedRows([])
          setFileName('')
          setCommitSummary(null)
        }}
      >
        <TabsList>
          <TabsTrigger value="borrowers">Borrowers & Learners</TabsTrigger>
          <TabsTrigger value="titles">Titles & Copies</TabsTrigger>
          <TabsTrigger value="classes">Classes & Grades</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Upload Dropzone */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-line-strong rounded-xl p-8 hover:bg-surface-1 transition-colors">
            <Upload className="h-10 w-10 text-primary mb-3" />
            <p className="text-sm font-semibold text-body mb-1">
              Select or drop your CSV file here
            </p>
            <p className="text-xs text-muted mb-4">
              Supported format: .csv (UTF-8 encoded)
            </p>
            <label className="cursor-pointer">
              <Button variant="primary" size="sm">
                <span>Browse Computer</span>
              </Button>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {fileName && (
              <div className="mt-3 text-xs font-mono text-primary bg-primary-50 dark:bg-primary-950/20 px-3 py-1 rounded-full">
                Selected: {fileName}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Commit Summary Feedback */}
      {commitSummary && (
        <div className="rounded-xl border border-success/30 bg-success-50 p-4 dark:bg-success-950/20">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-success-800 dark:text-success-400">
                Import Process Completed
              </h4>
              <p className="text-xs text-body mt-1">
                <strong>{commitSummary.imported}</strong> records were successfully imported. <strong>{commitSummary.skipped}</strong> records were skipped.
              </p>
              {commitSummary.duplicateErrors?.length > 0 && (
                <div className="mt-2 text-xs space-y-1 text-danger font-mono">
                  {commitSummary.duplicateErrors.map((err: string, i: number) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Parsed Preview Table */}
      {parsedRows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-line pb-3">
            <div>
              <CardTitle className="text-base font-bold">Import Data Preview</CardTitle>
              <CardDescription>
                Review parsed records. Bad rows with missing required columns are highlighted and will be skipped.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="success">{validCount} Ready</Badge>
              {invalidCount > 0 && <Badge variant="danger">{invalidCount} Errors</Badge>}
              <Button
                variant="primary"
                size="sm"
                onClick={handleCommit}
                loading={isCommitting}
                disabled={validCount === 0}
              >
                Import {validCount} Valid Records
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line bg-surface-1">
                    <th className="p-3 font-semibold text-muted w-12 text-center">
                      #
                    </th>
                    <th className="p-3 font-semibold text-muted w-24">
                      Status
                    </th>
                    {Object.keys(parsedRows[0].data).map((key) => (
                      <th
                        key={key}
                        className="p-3 font-semibold text-muted uppercase tracking-wider"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {parsedRows.map((row) => (
                    <tr
                      key={row.index}
                      className={
                        row.valid
                          ? 'hover:bg-surface-2'
                          : 'bg-danger-50/40 dark:bg-danger-950/20'
                      }
                    >
                      <td className="p-3 text-center text-muted font-mono">
                        {row.index}
                      </td>
                      <td className="p-3">
                        {row.valid ? (
                          <Badge variant="success">Valid</Badge>
                        ) : (
                          <div className="space-y-0.5">
                            <Badge variant="danger">Invalid</Badge>
                            <p className="text-[10px] text-danger">{row.errors.join(', ')}</p>
                          </div>
                        )}
                      </td>
                      {Object.keys(row.data).map((key) => (
                        <td key={key} className="p-3 text-body font-mono text-[11px]">
                          {String(row.data[key] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
