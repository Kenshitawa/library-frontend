import React, { useState } from 'react'
import {
  DollarSign,
  Plus,
  AlertTriangle,
  Receipt,
  ShieldCheck,
  BookPlus,
  Filter,
  CheckCircle2,
  FileText,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from '@/components/ui/Dialog'
import { useCharges, useChargeSummary, useCreateCharge } from '@/hooks/useCharges'
import { useBorrowers } from '@/hooks/useBorrowers'
import { PaymentDialog } from '@/features/charges/PaymentDialog'
import { WaiverDialog } from '@/features/charges/WaiverDialog'
import { ReplacementCopyDialog } from '@/features/charges/ReplacementCopyDialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Charge } from '@/types'
import { toast } from 'sonner'

export const ChargesPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('open')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedChargeForPay, setSelectedChargeForPay] = useState<Charge | null>(null)
  const [selectedChargeForWaive, setSelectedChargeForWaive] = useState<Charge | null>(null)
  const [selectedChargeForReplace, setSelectedChargeForReplace] = useState<Charge | null>(null)
  const [isManualChargeOpen, setIsManualChargeOpen] = useState(false)

  // Manual charge form
  const [manualBorrowerId, setManualBorrowerId] = useState('')
  const [manualType, setManualType] = useState<'lost' | 'damaged' | 'overdue' | 'manual'>('manual')
  const [manualAmount, setManualAmount] = useState('50.00')
  const [manualReason, setManualReason] = useState('')

  const { data: charges = [], isLoading } = useCharges({
    status: statusFilter,
    type: typeFilter,
  })
  const { data: summary } = useChargeSummary()
  const { data: borrowersData } = useBorrowers({ status: 'active' })
  const borrowers = borrowersData || []
  const createChargeMutation = useCreateCharge()

  const handleCreateManualCharge = async () => {
    if (!manualBorrowerId || !manualReason.trim()) {
      toast.error('Please select a borrower and state the reason')
      return
    }
    const cents = Math.round(parseFloat(manualAmount) * 100)
    if (isNaN(cents) || cents <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    try {
      await createChargeMutation.mutateAsync({
        borrowerId: manualBorrowerId,
        type: manualType,
        amount: cents,
        reason: manualReason.trim(),
      })
      toast.success('Charge created successfully')
      setIsManualChargeOpen(false)
      setManualBorrowerId('')
      setManualReason('')
    } catch (err: any) {
      toast.error('Failed to create charge: ' + err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-heading sm:text-2xl">
            Replacement Charges & Fines
          </h2>
          <p className="text-xs text-faint">
            Track lost and damaged book fees, payments, waivers, and receipts
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsManualChargeOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Manual Charge
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-faint uppercase">Total Outstanding</p>
              <h3 className="text-2xl font-bold text-danger mt-1">
                {formatCurrency(summary?.totalOutstanding || 0)}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-danger-50 dark:bg-danger-950/20 text-danger flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-faint uppercase">Total Collected</p>
              <h3 className="text-2xl font-bold text-success mt-1">
                {formatCurrency(summary?.totalPaid || 0)}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-success-50 dark:bg-success-950/20 text-success flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-faint uppercase">Waived</p>
              <h3 className="text-2xl font-bold text-muted mt-1">
                {formatCurrency(summary?.totalWaived || 0)}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-surface-2 text-faint flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-faint uppercase">Lost / Damaged Items</p>
              <h3 className="text-2xl font-bold text-warning mt-1">
                {(summary?.lostBooksCount || 0) + (summary?.damagedBooksCount || 0)}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-warning-50 dark:bg-warning-950/20 text-warning flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase text-faint">Status:</span>
          {['open', 'partial', 'paid', 'waived', 'all'].map((st) => (
            <Button
              key={st}
              size="sm"
              variant={statusFilter === st ? 'primary' : 'outline'}
              className="text-xs capitalize"
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold uppercase text-faint">Type:</span>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs w-36"
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'lost', label: 'Lost Book' },
              { value: 'damaged', label: 'Damaged' },
              { value: 'overdue', label: 'Overdue Fine' },
              { value: 'manual', label: 'Manual' },
            ]}
          />
        </div>
      </div>

      {/* Charges Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted">Loading charges...</div>
          ) : charges.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={<DollarSign className="h-8 w-8 text-muted" />}
                title="No charges found"
                description="No fees or fines matching your filter criteria are currently open."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line bg-surface-1">
                    <th className="p-3 font-semibold text-muted">Date</th>
                    <th className="p-3 font-semibold text-muted">Borrower</th>
                    <th className="p-3 font-semibold text-muted">Type</th>
                    <th className="p-3 font-semibold text-muted">Reason / Item</th>
                    <th className="p-3 font-semibold text-muted font-mono text-right">
                      Amount
                    </th>
                    <th className="p-3 font-semibold text-muted font-mono text-right">
                      Paid
                    </th>
                    <th className="p-3 font-semibold text-muted font-mono text-right">
                      Outstanding
                    </th>
                    <th className="p-3 font-semibold text-muted">Status</th>
                    <th className="p-3 font-semibold text-muted text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {charges.map((charge) => {
                    const outstanding = (charge.amount || 0) - (charge.paid_amount || 0)
                    const isSettled = charge.status === 'paid' || charge.status === 'waived'

                    return (
                      <tr key={charge.id} className="hover:bg-surface-2">
                        <td className="p-3 text-faint whitespace-nowrap">
                          {formatDate(charge.created_at)}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-heading">
                            {charge.borrower?.name}
                          </div>
                          <div className="text-[11px] text-muted">
                            {charge.borrower?.class?.name || charge.borrower?.borrower_no || ''}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              charge.type === 'lost'
                                ? 'danger'
                                : charge.type === 'damaged'
                                ? 'warning'
                                : 'outline'
                            }
                            className="capitalize"
                          >
                            {charge.type}
                          </Badge>
                        </td>
                        <td className="p-3 text-body max-w-xs truncate">
                          {charge.reason ||
                            (charge.issue?.copy?.title?.title
                              ? `Lost/Damaged copy of "${charge.issue.copy.title.title}"`
                              : 'Fee')}
                        </td>
                        <td className="p-3 font-mono text-right">{formatCurrency(charge.amount)}</td>
                        <td className="p-3 font-mono text-right text-success">
                          {formatCurrency(charge.paid_amount || 0)}
                        </td>
                        <td className="p-3 font-mono text-right font-bold text-danger">
                          {formatCurrency(outstanding)}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              charge.status === 'paid'
                                ? 'success'
                                : charge.status === 'waived'
                                ? 'gray'
                                : charge.status === 'partial'
                                ? 'warning'
                                : 'danger'
                            }
                            className="capitalize"
                          >
                            {charge.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isSettled && (
                              <>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  className="text-xs h-7 px-2"
                                  onClick={() => setSelectedChargeForPay(charge)}
                                >
                                  Pay
                                </Button>
                                {charge.type === 'lost' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 px-2"
                                    onClick={() => setSelectedChargeForReplace(charge)}
                                  >
                                    Replace
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs h-7 px-2 text-faint hover:text-danger"
                                  onClick={() => setSelectedChargeForWaive(charge)}
                                >
                                  Waive
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <PaymentDialog
        charge={selectedChargeForPay}
        open={!!selectedChargeForPay}
        onClose={() => setSelectedChargeForPay(null)}
      />

      {/* Waiver Dialog */}
      <WaiverDialog
        charge={selectedChargeForWaive}
        open={!!selectedChargeForWaive}
        onClose={() => setSelectedChargeForWaive(null)}
      />

      {/* Replacement Copy Dialog */}
      <ReplacementCopyDialog
        charge={selectedChargeForReplace}
        open={!!selectedChargeForReplace}
        onClose={() => setSelectedChargeForReplace(null)}
      />

      {/* Manual Charge Dialog */}
      <Dialog open={isManualChargeOpen} onClose={() => setIsManualChargeOpen(false)}>
        <DialogHeader>
          <DialogTitle>Create Manual Charge</DialogTitle>
          <DialogDescription>
            Issue a direct fine or fee to any learner or teacher profile.
          </DialogDescription>
        </DialogHeader>

        <DialogContent className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-muted mb-1">
              Borrower
            </label>
            <Select
              value={manualBorrowerId}
              onChange={(e) => setManualBorrowerId(e.target.value)}
              options={[
                { value: '', label: '-- Select Borrower --' },
                ...borrowers.map((b) => ({
                  value: b.id,
                  label: `${b.name} (${b.borrower_no || 'Staff'})`,
                })),
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-muted mb-1">
                Charge Type
              </label>
              <Select
                value={manualType}
                onChange={(e) => setManualType(e.target.value as any)}
                options={[
                  { value: 'manual', label: 'Manual Fee' },
                  { value: 'lost', label: 'Lost Book' },
                  { value: 'damaged', label: 'Damage Fee' },
                  { value: 'overdue', label: 'Late Return Fine' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted mb-1">
                Amount (Rands)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted mb-1">
              Reason / Description
            </label>
            <Input
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
              placeholder="e.g. Broken book cover / Late return penalty"
            />
          </div>
        </DialogContent>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsManualChargeOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateManualCharge}
            loading={createChargeMutation.isPending}
            disabled={!manualBorrowerId || !manualReason.trim()}
          >
            Create Charge
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
