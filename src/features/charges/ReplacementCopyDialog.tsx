import React, { useState } from 'react'
import { BookPlus, Barcode, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAcceptReplacementCopy } from '@/hooks/useCharges'
import { useAuth } from '@/hooks/useAuth'
import type { Charge, CopyCondition } from '@/types'
import { toast } from 'sonner'

interface ReplacementCopyDialogProps {
  charge: Charge | null
  open: boolean
  onClose: () => void
}

export const ReplacementCopyDialog: React.FC<ReplacementCopyDialogProps> = ({
  charge,
  open,
  onClose,
}) => {
  const { user } = useAuth()
  const acceptReplacementMutation = useAcceptReplacementCopy()
  const [barcode, setBarcode] = useState<string>('')
  const [condition, setCondition] = useState<CopyCondition>('good')

  const titleId = charge?.issue?.copy?.title_id || (charge?.issue?.copy?.title as any)?.id

  const handleAccept = async () => {
    if (!charge || !titleId) {
      toast.error('Title information missing for this charge')
      return
    }
    if (!barcode.trim()) {
      toast.error('Please scan or enter barcode for the replacement copy')
      return
    }

    try {
      await acceptReplacementMutation.mutateAsync({
        chargeId: charge.id,
        titleId,
        barcode: barcode.trim(),
        condition,
        userId: user?.id || '',
      })

      toast.success(`Replacement copy #${barcode} accepted. Charge closed.`)
      onClose()
    } catch (err: any) {
      toast.error('Failed to accept replacement: ' + err.message)
    }
  }

  if (!charge) return null

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <BookPlus className="h-5 w-5 text-primary" />
          <DialogTitle>Accept Replacement Copy</DialogTitle>
        </div>
        <DialogDescription>
          Learner or parent has provided a replacement book for the lost item. This registers the new copy into inventory and discharges the fine.
        </DialogDescription>
      </DialogHeader>

      <DialogContent className="space-y-4">
        <div className="rounded-lg border border-line bg-surface-1/50 p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-faint">Book Title:</span>
            <span className="font-semibold text-body">
              {charge.issue?.copy?.title?.title || 'Unknown Title'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-faint">Borrower:</span>
            <span>{charge.borrower?.name}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-muted mb-1">
            New Copy Barcode
          </label>
          <div className="relative">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Scan or enter new barcode..."
              className="pl-9 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-muted mb-1">
            Book Condition
          </label>
          <Select
            value={condition}
            onChange={(e) => setCondition(e.target.value as CopyCondition)}
            options={[
              { value: 'good', label: 'Good (Brand New / Clean)' },
              { value: 'fair', label: 'Fair (Minor wear, intact)' },
            ]}
          />
        </div>
      </DialogContent>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleAccept}
          loading={acceptReplacementMutation.isPending}
          disabled={!barcode.trim()}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" /> Add Copy & Settle Charge
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
