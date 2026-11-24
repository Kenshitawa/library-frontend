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
  const { data: title, isLoading } = useTitle(titleId)
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
        <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-heading">
          <Barcode className="h-3.5 w-3.5 text-muted" />
          <span>{row.barcode}</span>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location / Shelf',
      accessor: (row) => (
        <span className="text-xs text-muted">
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
        <span className="text-xs text-muted">
          {formatCurrency(row.price || 0)}
        </span>
      ),
    },
  ]

  if (isLoading) {
    return <div className="p-8 text-center text-muted">Loading title details...</div>
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

  const copyPrices = (title.copies || []).flatMap((copy) =>
    copy.deleted_at === null && typeof copy.price === 'number' && Number.isFinite(copy.price)
      ? [copy.price]
      : []
  )
  const uniqueCopyPrices = Array.from(new Set(copyPrices)).sort((a, b) => a - b)
  const replacementPrice = uniqueCopyPrices.length === 0
    ? 'Not set'
    : uniqueCopyPrices.length === 1
      ? formatCurrency(uniqueCopyPrices[0])
      : `Varies (${formatCurrency(uniqueCopyPrices[0])} – ${formatCurrency(uniqueCopyPrices[uniqueCopyPrices.length - 1])})`

  return (
    <div className="space-y-6">
      {/* Back to Catalog */}
      <div>
        <Link
          to="/catalog"
          className="inline-flex items-center text-xs font-medium text-faint hover:text-faint dark:text-muted dark:hover:text-heading"
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
            <div className="flex h-48 w-36 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-faint overflow-hidden shadow-md">
              {title.cover_url ? (
                <img src={title.cover_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <BookOpen className="h-12 w-12" />
              )}
            </div>

            {/* Metadata */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold text-heading">
                    {title.title}
                  </h1>
                  {title.subtitle && (
                    <p className="text-sm font-medium text-muted">
                      {title.subtitle}
                    </p>
                  )}
                  <p className="text-sm text-muted">
                    by <strong>{title.author || 'Unknown'}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="success">{replacementPrice}</Badge>
                  <Badge variant="info">{title.type}</Badge>
                  {title.grade_level && (
                    <Badge variant="gray">{title.grade_level}</Badge>
                  )}
                </div>
              </div>

              {title.description && (
                <p className="text-xs text-muted max-w-3xl leading-relaxed">
                  {title.description}
                </p>
              )}

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-3 border-t border-line text-xs">
                <div>
                  <span className="text-muted">ISBN-13:</span>
                  <div className="font-mono font-medium text-body">
                    {title.isbn13 || '—'}
                  </div>
                </div>
                <div>
                  <span className="text-muted">Subject:</span>
                  <div className="font-medium text-body">
                    {title.subject?.name || 'General'}
                  </div>
                </div>
                <div>
                  <span className="text-muted">Publisher:</span>
                  <div className="font-medium text-body">
                    {title.publisher || '—'} ({title.year || '—'})
                  </div>
                </div>
                <div>
                  <span className="text-muted">Copies:</span>
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
            <h3 className="text-lg font-bold text-heading">
              Physical Copies & Barcodes
            </h3>
            <p className="text-xs text-faint">
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
            <div className="flex items-center justify-between bg-surface-1 p-3 rounded-lg border border-line">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-body">
                  Continuous Scan Session Mode
                </span>
                <span className="text-[11px] text-muted">
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
              <div className="rounded-md bg-success-50 dark:bg-emerald-950/50 p-2.5 text-xs text-success-700 dark:text-positive font-medium">
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
