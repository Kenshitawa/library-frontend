import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  BookOpen,
  QrCode,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Barcode,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DataTable, type Column } from '@/components/ui/DataTable'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import {
  useTitle,
  useLocations,
  useAddCopy,
  useUpdateCopyStatus,
  useUpdateTitle,
} from '@/hooks/useTitles'
import type { Copy, CopyStatus, CopyCondition } from '@/types'
import { formatCurrency } from '@/lib/utils'

export const TitleDetailPage: React.FC = () => {
  const { titleId } = useParams<{ titleId: string }>()
  const navigate = useNavigate()
  const { data: title, isLoading, error } = useTitle(titleId)
  const { data: locations } = useLocations()
  const addCopy = useAddCopy()
  const updateCopyStatus = useUpdateCopyStatus()
  const updateTitle = useUpdateTitle()

  const [addCopyOpen, setAddCopyOpen] = useState(false)
  const [scanSessionMode, setScanSessionMode] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [copyLocationId, setCopyLocationId] = useState('')
  const [copyPrice, setCopyPrice] = useState(25000) // cents = R250.00
  const [copyCondition, setCopyCondition] = useState<CopyCondition>('good')
  const [addError, setAddError] = useState<string | null>(null)

  const handleAddCopySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)

    if (!barcodeInput.trim()) {
      setAddError('Barcode cannot be empty.')
      return
    }

    if (!titleId) return

    try {
      await addCopy.mutateAsync({
        title_id: titleId,
        barcode: barcodeInput.trim(),
        location_id: copyLocationId || undefined,
        price: Number(copyPrice) || 0,
        condition: copyCondition,
        status: 'available',
      })

      setBarcodeInput('')
      setSessionCount((prev) => prev + 1)

      if (!scanSessionMode) {
        setAddCopyOpen(false)
      }
    } catch (err: any) {
      setAddError(err?.message || 'Failed to add copy.')
    }
  }

  const handleWithdraw = async (copy: Copy) => {
    if (copy.status === 'issued') {
      alert('Cannot withdraw a copy while it is currently issued to a borrower.')
      return
    }
    if (window.confirm(`Withdraw copy with barcode ${copy.barcode}? History will be preserved.`)) {
      if (!titleId) return
      await updateCopyStatus.mutateAsync({
        id: copy.id,
        titleId,
        status: 'withdrawn',
      })
    }
  }

  const copyColumns: Column<Copy>[] = [
    {
      key: 'barcode',
      header: 'Barcode',
      sortable: true,
      accessor: (row) => (
        <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
          <Barcode className="h-3.5 w-3.5 text-slate-400" />
          <span>{row.barcode}</span>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location / Shelf',
      accessor: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {row.location?.name || 'Main Library'}
        </span>
      ),
    },
    {
      key: 'condition',
      header: 'Condition',
      accessor: (row) => {
        const variantMap: Record<CopyCondition, 'success' | 'warning' | 'danger'> = {
          good: 'success',
          fair: 'warning',
          poor: 'warning',
          damaged: 'danger',
        }
        return (
          <Badge variant={variantMap[row.condition] || 'gray'} size="sm">
            {row.condition}
          </Badge>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (row) => {
        const statusMap: Record<CopyStatus, 'success' | 'info' | 'warning' | 'danger' | 'gray'> = {
          available: 'success',
          issued: 'info',
          reserved: 'warning',
          in_processing: 'gray',
          lost: 'danger',
          damaged: 'danger',
          withdrawn: 'gray',
        }
        return (
          <Badge variant={statusMap[row.status] || 'gray'} size="sm">
            {row.status.replace('_', ' ')}
          </Badge>
        )
      },
    },
    {
      key: 'price',
      header: 'Replacement Price',
      accessor: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {formatCurrency(row.price || 0)}
        </span>
      ),
    },
  ]

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading title details...</div>
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-red-200 bg-white p-8 text-center dark:border-red-900 dark:bg-slate-900">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-600" />
        <h3 className="text-lg font-bold">Book details could not be loaded</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">{error.message}</p>
        <Link to="/catalog"><Button variant="outline">Back to Catalog</Button></Link>
      </div>
    )
  }

  if (!title) {
    return (
      <div className="p-8 text-center space-y-4">
        <h3 className="text-lg font-bold">Title not found</h3>
        <Link to="/catalog">
          <Button variant="outline">Back to Catalog</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back to Catalog */}
      <div>
        <Link
          to="/catalog"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Catalog
        </Link>
      </div>

      {/* Main Title Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Book Cover */}
            <div className="flex h-48 w-36 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800 overflow-hidden shadow-md">
              {title.cover_url ? (
                <img src={title.cover_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <BookOpen className="h-12 w-12" />
              )}
            </div>

            {/* Metadata */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {title.title}
                  </h1>
                  {title.subtitle && (
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {title.subtitle}
                    </p>
                  )}
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    by <strong>{title.author || 'Unknown'}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="info">{title.type}</Badge>
                  {title.grade_level && (
                    <Badge variant="gray">{title.grade_level}</Badge>
                  )}
                </div>
              </div>

              {title.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
                  {title.description}
                </p>
              )}

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400">ISBN-13:</span>
                  <div className="font-mono font-medium text-slate-800 dark:text-slate-200">
                    {title.isbn13 || '—'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Subject:</span>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    {title.subject?.name || 'General'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Publisher:</span>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    {title.publisher || '—'} ({title.year || '—'})
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Copies:</span>
                  <div className="font-semibold text-primary">
                    {title.available_copies_count ?? 0} available of {title.total_copies_count ?? 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Copies Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Physical Copies & Barcodes
            </h3>
            <p className="text-xs text-slate-500">
              Manage inventory, scan new copies, or withdraw damaged/lost items
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setSessionCount(0)
              setAddCopyOpen(true)
            }}
          >
            Add Copy
          </Button>
        </div>

        <DataTable
          data={title.copies || []}
          columns={copyColumns}
          emptyTitle="No copies recorded"
          emptyMessage="Add the first physical copy of this textbook by scanning its barcode."
          rowActions={(row) => [
            {
              label: 'Withdraw Copy',
              icon: <Trash2 className="h-4 w-4" />,
              danger: true,
              disabled: row.status === 'withdrawn',
              onClick: () => handleWithdraw(row),
            },
          ]}
        />
      </div>

      {/* Add Copy Dialog with Scan Session Mode */}
      <Dialog
        open={addCopyOpen}
        onClose={() => setAddCopyOpen(false)}
        maxWidth="md"
      >
        <DialogHeader>
          <DialogTitle>Add Physical Copy</DialogTitle>
          <DialogDescription>
            Scan or type the unique barcode on the textbook's spine or cover label.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddCopySubmit}>
          <DialogBody className="space-y-4">
            {addError && (
              <div className="rounded-md bg-danger-50 p-3 text-xs text-danger font-medium">
                {addError}
              </div>
            )}

            {/* Scan session toggle */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Continuous Scan Session Mode
                </span>
                <span className="text-[11px] text-slate-400">
                  Dialog stays open after scan so you can scan multiple books quickly
                </span>
              </div>
              <input
                type="checkbox"
                checked={scanSessionMode}
                onChange={(e) => setScanSessionMode(e.target.checked)}
                className="h-4 w-4 rounded text-primary focus:ring-primary"
              />
            </div>

            {sessionCount > 0 && (
              <div className="rounded-md bg-success-50 dark:bg-emerald-950/50 p-2.5 text-xs text-success-700 dark:text-emerald-300 font-medium">
                ✓ Added {sessionCount} {sessionCount === 1 ? 'copy' : 'copies'} this session! Ready for next barcode.
              </div>
            )}

            <Input
              label="Barcode Number"
              required
              autoFocus
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan or enter barcode..."
              leftAddon={<Barcode className="h-4 w-4" />}
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Location"
                options={[
                  { value: '', label: 'Main Library' },
                  ...(locations || []).map((loc) => ({ value: loc.id, label: loc.name })),
                ]}
                value={copyLocationId}
                onChange={(e) => setCopyLocationId(e.target.value)}
              />

              <Select
                label="Condition"
                options={[
                  { value: 'good', label: 'Good' },
                  { value: 'fair', label: 'Fair' },
                  { value: 'poor', label: 'Poor' },
                  { value: 'damaged', label: 'Damaged' },
                ]}
                value={copyCondition}
                onChange={(e) => setCopyCondition(e.target.value as CopyCondition)}
              />
            </div>

            <Input
              label="Replacement Price (in Cents)"
              type="number"
              value={copyPrice}
              onChange={(e) => setCopyPrice(Number(e.target.value))}
              description={`Display value: ${formatCurrency(copyPrice)}`}
            />
          </DialogBody>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setAddCopyOpen(false)}
            >
              {scanSessionMode ? 'Done' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={addCopy.isPending}
            >
              {scanSessionMode ? 'Scan & Add Next' : 'Add Copy'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
