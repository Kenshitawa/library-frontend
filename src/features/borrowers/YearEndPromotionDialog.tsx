import React, { useState } from 'react'
import { ArrowRight, Users, GraduationCap, AlertCircle, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { useClasses } from '@/hooks/useBorrowers'
import { useClassLearners, usePromoteClass } from '@/hooks/useClassIssue'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface YearEndPromotionDialogProps {
  open: boolean
  onClose: () => void
}

export const YearEndPromotionDialog: React.FC<YearEndPromotionDialogProps> = ({
  open,
  onClose,
}) => {
  const { user } = useAuth()
  const { data: classes = [] } = useClasses()
  const [sourceClassId, setSourceClassId] = useState<string>('')
  const [destClassId, setDestClassId] = useState<string>('')

  const { data: learnersStatus = [], isLoading: loadingLearners } = useClassLearners(sourceClassId)
  const promoteMutation = usePromoteClass()

  const handlePromote = async () => {
    if (!sourceClassId || !destClassId) {
      toast.error('Please select both source and destination classes')
      return
    }
    if (sourceClassId === destClassId) {
      toast.error('Source and destination classes cannot be the same')
      return
    }

    try {
      const res = await promoteMutation.mutateAsync({
        sourceClassId,
        destClassId,
        userId: user?.id || '',
      })
      toast.success(
        `Promoted ${res.promoted_count || learnersStatus.length} learners successfully!`
      )
      onClose()
    } catch (err: any) {
      toast.error('Failed to promote class: ' + err.message)
    }
  }

  const sourceClass = classes.find((c) => c.id === sourceClassId)
  const destClass = classes.find((c) => c.id === destClassId)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg">
      <DialogHeader>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <DialogTitle>Year-End Class Promotion</DialogTitle>
        </div>
        <DialogDescription>
          Promote all enrolled learners from one grade class to their next academic year class. All loan history, reservations, and charges are preserved.
        </DialogDescription>
      </DialogHeader>

      <DialogContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Source Class (Current)
            </label>
            <Select
              value={sourceClassId}
              onChange={(e) => setSourceClassId(e.target.value)}
              options={[
                { value: '', label: '-- Select Source Class --' },
                ...classes.map((c) => ({
                  value: c.id,
                  label: `${c.grade_level || ''} ${c.name} (${c.year || ''})`.trim(),
                })),
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Destination Class (Next Year)
            </label>
            <Select
              value={destClassId}
              onChange={(e) => setDestClassId(e.target.value)}
              options={[
                { value: '', label: '-- Select Destination Class --' },
                ...classes
                  .filter((c) => c.id !== sourceClassId)
                  .map((c) => ({
                    value: c.id,
                    label: `${c.grade_level || ''} ${c.name} (${c.year || ''})`.trim(),
                  })),
              ]}
            />
          </div>
        </div>

        {sourceClassId && destClassId && (
          <div className="flex items-center justify-center gap-3 p-3 bg-primary-50 dark:bg-primary-950/20 rounded-lg text-sm text-primary font-medium">
            <span>{sourceClass?.name}</span>
            <ArrowRight className="h-4 w-4" />
            <span>{destClass?.name}</span>
          </div>
        )}

        {/* Learners Preview */}
        {sourceClassId && (
          <div className="border border-line rounded-lg overflow-hidden">
            <div className="bg-surface-1/50 p-2.5 text-xs font-semibold text-muted flex justify-between items-center">
              <span>Learners to be promoted ({learnersStatus.length})</span>
              <Badge variant="outline">{sourceClass?.name}</Badge>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-line text-xs">
              {loadingLearners ? (
                <div className="p-4 text-center text-muted">Loading learners...</div>
              ) : learnersStatus.length === 0 ? (
                <div className="p-4 text-center text-muted">
                  No learners found in this class.
                </div>
              ) : (
                learnersStatus.map((ls) => (
                  <div
                    key={ls.borrower.id}
                    className="p-2.5 flex items-center justify-between hover:bg-surface-2"
                  >
                    <div>
                      <span className="font-medium text-body">
                        {ls.borrower.name}
                      </span>
                      <span className="ml-2 font-mono text-muted">
                        ({ls.borrower.borrower_no || 'N/A'})
                      </span>
                    </div>
                    <Badge variant={ls.borrower.status === 'active' ? 'success' : 'danger'}>
                      {ls.borrower.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </DialogContent>

      <DialogFooter className="flex justify-between items-center">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handlePromote}
          disabled={!sourceClassId || !destClassId || learnersStatus.length === 0}
          loading={promoteMutation.isPending}
        >
          <GraduationCap className="mr-2 h-4 w-4" /> Apply Promotion ({learnersStatus.length} Learners)
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
