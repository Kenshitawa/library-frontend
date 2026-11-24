import React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRightCircle,
  ArrowLeftCircle,
  AlertCircle,
  Clock,
  UserPlus,
  BookOpen,
  Calendar,
  Activity,
  ChevronRight,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useDashboardStats, useDueSoon, useOverdue } from '@/hooks/useIssues'
import { useAuditLog } from '@/hooks/useAuditLog'
import { formatDate, daysUntilDue } from '@/lib/utils'

// Show a clean zero baseline instead of simulated circulation activity.
const emptyChartData = Array.from({ length: 30 }).map((_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (29 - i))
  return {
    date: d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', timeZone: 'Africa/Nairobi' }),
    issues: 0,
    returns: 0,
  }
})

export const DashboardPage: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: dueSoonList } = useDueSoon()
  const { data: overdueList } = useOverdue()
  const { data: recentActivity } = useAuditLog()

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-heading sm:text-2xl">
            Circulation Dashboard
          </h2>
          <p className="text-sm text-muted">
            Overview of textbook loans, returns, and desk activity
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/issue">
            <Button
              variant="primary"
              leftIcon={<ArrowRightCircle className="h-4 w-4" />}
            >
              Issue Book
            </Button>
          </Link>
          <Link to="/return">
            <Button
              variant="secondary"
              leftIcon={<ArrowLeftCircle className="h-4 w-4" />}
            >
              Return Book
            </Button>
          </Link>
          <Link to="/borrowers">
            <Button
              variant="outline"
              leftIcon={<UserPlus className="h-4 w-4" />}
            >
              Add Borrower
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Issued Today"
          value={statsLoading ? '—' : stats?.issuedToday ?? 0}
          icon={<ArrowRightCircle className="h-5 w-5" />}
          color="primary"
          trend={{ value: 'Today', positive: true }}
        />
        <StatCard
          label="Returned Today"
          value={statsLoading ? '—' : stats?.returnedToday ?? 0}
          icon={<ArrowLeftCircle className="h-5 w-5" />}
          color="success"
          trend={{ value: 'Today', positive: true }}
        />
        <StatCard
          label="Overdue Items"
          value={statsLoading ? '—' : stats?.overdueCount ?? 0}
          icon={<AlertCircle className="h-5 w-5" />}
          color="danger"
          description="Requires librarian follow-up"
        />
        <StatCard
          label="Due Soon (3 Days)"
          value={statsLoading ? '—' : stats?.dueSoonCount ?? 0}
          icon={<Clock className="h-5 w-5" />}
          color="warning"
          description="Coming due within 3 days"
        />
      </div>

      {/* Circulation Activity Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Circulation Activity (Last 30 Days)</CardTitle>
            <p className="text-xs text-faint mt-0.5">
              Daily comparison of books issued vs books returned
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              <span className="text-muted">Issues</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
              <span className="text-muted">Returns</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={emptyChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  className="text-muted"
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderRadius: '8px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="issues"
                  name="Issues"
                  stroke="#0f766e"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="returns"
                  name="Returns"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Split lists: Overdue & Due Soon */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue List */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-danger" />
              <CardTitle>Overdue Books</CardTitle>
            </div>
            <Link to="/returns" className="text-xs font-medium text-primary hover:underline">
              View Returns
            </Link>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {overdueList && overdueList.length > 0 ? (
              <div className="divide-y divide-line">
                {overdueList.slice(0, 5).map((item) => {
                  const daysLate = Math.abs(daysUntilDue(item.due_at))
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 hover:bg-surface-2 transition-colors"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-semibold text-sm text-heading truncate">
                          {item.copy?.title?.title || 'Unknown Title'}
                        </span>
                        <span className="text-xs text-faint truncate">
                          Borrower: {item.borrower?.name} ({item.borrower?.borrower_no})
                          {item.borrower?.class?.name ? ` · ${item.borrower.class.name}` : ''}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="danger" size="sm">
                          {daysLate} {daysLate === 1 ? 'day' : 'days'} late
                        </Badge>
                        <div className="text-[11px] text-muted mt-1">
                          Due {formatDate(item.due_at)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted">
                No overdue books. Excellent work!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Due Soon (3 Days) List */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <CardTitle>Due Soon (Next 3 Days)</CardTitle>
            </div>
            <Link to="/calendar" className="text-xs font-medium text-primary hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {dueSoonList && dueSoonList.length > 0 ? (
              <div className="divide-y divide-line">
                {dueSoonList.slice(0, 5).map((item) => {
                  const daysLeft = daysUntilDue(item.due_at)
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 hover:bg-surface-2 transition-colors"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-semibold text-sm text-heading truncate">
                          {item.copy?.title?.title || 'Unknown Title'}
                        </span>
                        <span className="text-xs text-faint truncate">
                          Borrower: {item.borrower?.name} ({item.borrower?.borrower_no})
                          {item.borrower?.class?.name ? ` · ${item.borrower.class.name}` : ''}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="warning" size="sm">
                          {daysLeft === 0 ? 'Due today' : `${daysLeft} days left`}
                        </Badge>
                        <div className="text-[11px] text-muted mt-1">
                          Due {formatDate(item.due_at)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted">
                No books due in the next 3 days.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity from Audit Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Recent Desk Activity</CardTitle>
          </div>
          <Link to="/audit" className="text-xs font-medium text-primary hover:underline">
            Full Audit Log
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentActivity && recentActivity.length > 0 ? (
            <div className="divide-y divide-line">
              {recentActivity.slice(0, 6).map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-surface-2 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold uppercase tracking-wider text-body">
                      {log.action}
                    </span>
                    <span className="text-faint">
                      on <strong className="text-body">{log.entity}</strong>
                    </span>
                    {log.user?.name && (
                      <span className="text-muted hidden sm:inline">
                        by {log.user.name}
                      </span>
                    )}
                  </div>
                  <span className="text-muted shrink-0">
                    {formatDate(log.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted">
              No recent audit activity.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
