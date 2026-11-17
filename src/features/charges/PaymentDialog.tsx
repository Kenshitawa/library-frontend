import React, { useState } from 'react'
import { DollarSign, Receipt, CreditCard } from 'lucide-react'
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
import { useCreatePayment } from '@/hooks/useCharges'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/lib/utils'
import type { Charge } from '@/types'
import { toast } from 'sonner'

interface PaymentDialogProps {
  charge: Charge | null
  open: boolean
  onClose: () => void
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({ charge, open, onClose }) => {
  const { user } = useAuth()
  const createPaymentMutation = useCreatePayment()

  const outstandingCents = charge ? (charge.amount || 0) - (charge.paid_amount || 0) : 0
  const [paymentAmountStr, setPaymentAmountStr] = useState<string>(
    outstandingCents > 0 ? (outstandingCents / 100).toFixed(2) : '0.00'
  )
  const [notes, setNotes] = useState<string>('')

  React.useEffect(() => {
    if (charge) {
      const remaining = (charge.amount || 0) - (charge.paid_amount || 0)
      setPaymentAmountStr((remaining / 100).toFixed(2))
      setNotes('')
    }
  }, [charge])

  const handlePay = async () => {
    if (!charge) return
    const amountVal = parseFloat(paymentAmountStr)
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    const amountCents = Math.round(amountVal * 100)
    if (amountCents > outstandingCents) {
      toast.error(`Payment cannot exceed outstanding balance of ${formatCurrency(outstandingCents)}`)
      return
    }

    try {
      const payment = await createPaymentMutation.mutateAsync({
        chargeId: charge.id,
        borrowerId: charge.borrower_id,
        amount: amountCents,
        receivedBy: user?.id || '',
        notes: notes.trim(),
      })

      toast.success(
        `Payment of ${formatCurrency(amountCents)} recorded. Receipt #${payment.receipt_no || ''}`
      )
      onClose()
    } catch (err: any) {
      toast.error('Payment failed: ' + err.message)
    }
  }

  if (!charge) return null

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <DialogTitle>Record Fine / Fee Payment</DialogTitle>
        </div>
        <DialogDescription>
          Record a full or partial cash or electronic payment for {charge.borrower?.name}.
        </DialogDescription>
      </DialogHeader>

      <DialogContent className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-1/50 p-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-faint">Borrower:</span>
            <span className="font-semibold text-body">
              {charge.borrower?.name} ({charge.borrower?.borrower_no || 'Staff'})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-faint">Charge Description:</span>
            <span className="text-body">{charge.reason || charge.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-faint">Total Charge Amount:</span>
            <span className="font-mono">{formatCurrency(charge.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-faint">Already Paid:</span>
            <span className="font-mono text-success">{formatCurrency(charge.paid_amount || 0)}</span>
          </div>
          <div className="flex justify-between border-t border-line pt-2 font-bold text-sm">
            <span className="text-body">Remaining Balance:</span>
            <span className="font-mono text-danger">{formatCurrency(outstandingCents)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-muted mb-1">
            Payment Amount (Rands)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-semibold text-sm">
              R
            </span>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={(outstandingCents / 100).toFixed(2)}
              value={paymentAmountStr}
              onChange={(e) => setPaymentAmountStr(e.target.value)}
              className="pl-8 text-base font-semibold"
            />
          </div>
          <p className="text-[11px] text-muted mt-1">
            Supports partial payments. Outstanding balance will update automatically.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-muted mb-1">
            Notes / Reference
          </label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Cash handed to librarian / EFT Ref #1234"
          />
        </div>
      </DialogContent>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handlePay}
          loading={createPaymentMutation.isPending}
        >
          <Receipt className="mr-2 h-4 w-4" /> Issue Receipt & Complete Payment
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
