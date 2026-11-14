import React from 'react'
import { GraduationCap, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export const TeacherPortalPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
          Teacher Portal
        </h2>
        <p className="text-xs text-slate-500">
          Personal loans, reservations, and class textbook assignments view (Phase 6)
        </p>
      </div>

      <Card>
        <CardContent className="p-8">
          <EmptyState
            icon={<GraduationCap className="h-8 w-8 text-primary" />}
            title="Teacher Portal Access"
            description="View textbooks assigned to your classes, check personal active loans, and request renewals."
          />
        </CardContent>
      </Card>
    </div>
  )
}
