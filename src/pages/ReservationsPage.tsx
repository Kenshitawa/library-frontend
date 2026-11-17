import React, { useState } from 'react'
import {
  Clock,
  Plus,
  BookOpen,
  Users,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
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
import {
  useReservations,
  useCreateReservation,
  useCancelReservation,
  useFulfillReservation,
} from '@/hooks/useReservations'
import { useTitles } from '@/hooks/useTitles'
import { useBorrowers } from '@/hooks/useBorrowers'
import { formatDate, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

export const ReservationsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false)
  const [selectedTitleId, setSelectedTitleId] = useState('')
  const [selectedBorrowerId, setSelectedBorrowerId] = useState('')

  const { data: reservations = [], isLoading } = useReservations(statusFilter)
  const { data: titlesData } = useTitles()
  const titles = titlesData || []
  const { data: borrowersData } = useBorrowers({ status: 'active' })
  const borrowers = borrowersData || []

  const createMutation = useCreateReservation()
  const cancelMutation = useCancelReservation()
  const fulfillMutation = useFulfillReservation()

  const handleCreate = async () => {
    if (!selectedTitleId || !selectedBorrowerId) {
      toast.error('Please select both a title and a borrower')
      return
    }

    try {
      await createMutation.mutateAsync({
        titleId: selectedTitleId,
        borrowerId: selectedBorrowerId,
      })
      toast.success('Reservation placed successfully!')
      setIsNewReservationOpen(false)
      setSelectedTitleId('')
      setSelectedBorrowerId('')
    } catch (err: any) {
      toast.error('Failed to place reservation: ' + err.message)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this reservation?')) return
    try {
      await cancelMutation.mutateAsync(id)
      toast.success('Reservation cancelled')
    } catch (err: any) {
      toast.error('Failed to cancel: ' + err.message)
    }
  }

  const handleFulfill = async (id: string) => {
    try {
      await fulfillMutation.mutateAsync(id)
      toast.success('Reservation marked as fulfilled')
    } catch (err: any) {
      toast.error('Failed to fulfill: ' + err.message)
    }
  }

  const waitingCount = reservations.filter((r) => r.status === 'waiting').length
  const readyCount = reservations.filter((r) => r.status === 'ready').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-heading sm:text-2xl">
            Title Reservations & Holds
          </h2>
          <p className="text-xs text-faint">
            Manage reservation queues, waiting lists, and 3-day hold notifications for returned books
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsNewReservationOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Place Reservation
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-faint uppercase">Ready for Pickup</p>
              <h3 className="text-2xl font-bold text-success mt-1">{readyCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-success-50 dark:bg-success-950/20 text-success flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-faint uppercase">In Waiting Queue</p>
              <h3 className="text-2xl font-bold text-primary mt-1">{waitingCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary-50 dark:bg-primary-950/20 text-primary flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-faint uppercase">Total Holds Tracked</p>
              <h3 className="text-2xl font-bold text-body mt-1">
                {reservations.length}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-surface-2 text-faint flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase text-faint">Filter Status:</span>
        <div className="flex flex-wrap gap-2">
          {['all', 'ready', 'waiting', 'fulfilled', 'cancelled', 'expired'].map((st) => (
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
      </div>

      {/* Reservations Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted">Loading reservations queue...</div>
          ) : reservations.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={<Clock className="h-8 w-8 text-muted" />}
                title="No reservations found"
                description="There are currently no reservations matching this status filter."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line bg-surface-1">
                    <th className="p-3 font-semibold text-muted">Queue #</th>
                    <th className="p-3 font-semibold text-muted">Book Title</th>
                    <th className="p-3 font-semibold text-muted">Borrower</th>
                    <th className="p-3 font-semibold text-muted">Placed Date</th>
                    <th className="p-3 font-semibold text-muted">Status</th>
                    <th className="p-3 font-semibold text-muted">Pickup Deadline</th>
                    <th className="p-3 font-semibold text-muted text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {reservations.map((res) => {
                    const statusVariant =
                      res.status === 'ready'
                        ? 'success'
                        : res.status === 'waiting'
                        ? 'warning'
                        : res.status === 'fulfilled'
                        ? 'primary'
                        : 'gray'

                    return (
                      <tr key={res.id} className="hover:bg-surface-2">
                        <td className="p-3 font-mono font-bold text-primary">
                          #{res.queue_position || '1'}
                        </td>
                        <td className="p-3 font-medium text-heading">
                          {res.title?.title || 'Unknown Title'}
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-body">
                            {res.borrower?.name}
                          </div>
                          <div className="text-[11px] text-muted">
                            {res.borrower?.class?.name || res.borrower?.borrower_no || ''}
                          </div>
                        </td>
                        <td className="p-3 text-faint">
                          {formatDate(res.placed_at)}
                        </td>
                        <td className="p-3">
                          <Badge variant={statusVariant as any} className="capitalize">
                            {res.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-faint">
                          {res.pickup_deadline ? formatDateTime(res.pickup_deadline) : '—'}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {res.status === 'ready' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 px-2"
                                onClick={() => handleFulfill(res.id)}
                              >
                                Fulfill
                              </Button>
                            )}
                            {['waiting', 'ready'].includes(res.status) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-7 px-2 text-danger hover:text-danger"
                                onClick={() => handleCancel(res.id)}
                              >
                                Cancel
                              </Button>
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

      {/* Place Reservation Dialog */}
      <Dialog open={isNewReservationOpen} onClose={() => setIsNewReservationOpen(false)}>
        <DialogHeader>
          <DialogTitle>Place New Title Reservation</DialogTitle>
          <DialogDescription>
            Place a hold on a book for a learner or teacher. If a copy is already available, it is immediately reserved for 3 days.
          </DialogDescription>
        </DialogHeader>

        <DialogContent className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-muted mb-1">
              Select Title
            </label>
            <Select
              value={selectedTitleId}
              onChange={(e) => setSelectedTitleId(e.target.value)}
              options={[
                { value: '', label: '-- Choose Title --' },
                ...titles.map((t) => ({
                  value: t.id,
                  label: `${t.title} (${t.type})`,
                })),
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted mb-1">
              Select Borrower
            </label>
            <Select
              value={selectedBorrowerId}
              onChange={(e) => setSelectedBorrowerId(e.target.value)}
              options={[
                { value: '', label: '-- Choose Borrower --' },
                ...borrowers.map((b) => ({
                  value: b.id,
                  label: `${b.name} (${b.borrower_no || 'Staff'})`,
                })),
              ]}
            />
          </div>
        </DialogContent>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsNewReservationOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!selectedTitleId || !selectedBorrowerId}
            loading={createMutation.isPending}
          >
            Confirm Reservation
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
