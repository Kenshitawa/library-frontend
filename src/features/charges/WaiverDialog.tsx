import React, { useState } from 'react'
import { ShieldCheck, AlertCircle } from 'lucide-react'
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
import { useWaiveCharge } from '@/hooks/useCharges'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/lib/utils'
import type { Charge } from '@/types'
import { toast } from 'sonner'

interface WaiverDialogProps {
  charge: Charge | null
  open: boolean
  onClose: () => void
}

export const WaiverDialog: React.FC<WaiverDialogProps> = ({ charge, open, onClose }) => {
  const { user } = useAuth()
  const waiveMutation = useWaiveCharge()
  const [reason, setReason] = useState<string>('')

  const handleWaive = async () => {
    if (!charge) return
    if (!reason.trim()) {
      toast.error('A justification reason is mandatory to waive library charges')
      return
    }

    try {
      await waiveMutation.mutateAsync({
        chargeId: charge.id,
        waivedBy: user?.id || '',
        reason: reason.trim(),
      })
      toast.success('Charge waived successfully')
      onClose()
    } catch (err: any) {
      toast.error('Failed to waive charge: ' + err.message)
    }
  }

  if (!charge) return null

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-warning" />
          <DialogTitle>Waive Outstanding Charge</DialogTitle>
        </div>
        <DialogDescription>
          Waiving clears the outstanding balance for {charge.borrower?.name}. An official audit log entry will record your staff credentials and waiver reason.
        </DialogDescription>
      </DialogHeader>

      <DialogContent className="space-y-4">
        <div className="rounded-lg border border-warning/30 bg-warning-50/50 dark:bg-warning-950/20 p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-faint">Amount to Waive:</span>
            <span className="font-bold text-danger font-mono">
              {formatCurrency(charge.amount - (charge.paid_amount || 0))}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-faint">Borrower:</span>
            <span className="font-semibold">{charge.borrower?.name}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-muted mb-1">
            Waiver Reason (Mandatory)
          </label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Principal authorized waiver / Book found undamaged in classroom"
          />
        </div>
      </DialogContent>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleWaive}
          loading={waiveMutation.isPending}
          disabled={!reason.trim()}
        >
          Confirm Charge Waiver
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
