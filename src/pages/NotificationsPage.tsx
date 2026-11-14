import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, BookOpen, Download, MailWarning } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLibraryProfile } from '@/hooks/useLibraryProfile'
import { useMarkNotificationRead, useNotifications, type NotificationRecord } from '@/hooks/useNotifications'
import { downloadPickupWarningLetter } from '@/lib/circulationReceipt'

function notificationPath(notification: NotificationRecord): string {
  if (notification.type === 'monthly_inventory_report' && notification.report_id) {
    return `/reports?report=inventory&snapshotId=${encodeURIComponent(notification.report_id)}&download=1`
  }
  if (notification.type === 'reservation_pickup_warning') return '/reservations'
  if (notification.type === 'reservation_ready') return '/reservations'
  return '/returns'
}

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate()
  const { profile } = useLibraryProfile()
  const { data: notifications = [], isLoading, error } = useNotifications()
  const markRead = useMarkNotificationRead()
  const unreadCount = notifications.filter((notification) => !notification.read_at).length

  const openNotification = async (notification: NotificationRecord) => {
    try {
      if (!notification.read_at) await markRead.mutateAsync(notification.id)
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : 'Could not mark this notification as read.')
    } finally {
      navigate(notificationPath(notification))
    }
  }

  const downloadWarning = (notification: NotificationRecord) => {
    try {
      downloadPickupWarningLetter({
        libraryName: profile?.name || 'School Library',
        libraryAddress: profile?.address,
        borrowerName: notification.borrower?.name || 'Library borrower',
        borrowerNumber: notification.borrower?.borrower_no,
        subject: notification.subject || 'Reservation pickup notice',
        body: notification.body || '',
        createdAt: notification.created_at,
      })
    } catch (downloadError) {
      toast.error(downloadError instanceof Error ? downloadError.message : 'Could not create the warning letter.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-[#b8d3c4] bg-[#d7e9dc] p-5 dark:border-[#31584d] dark:bg-[#173c35] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">Notifications</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Inventory snapshots, reservation notices, and return reminders.
            </p>
          </div>
          <Badge variant={unreadCount ? 'warning' : 'success'}>
            {unreadCount} unread
          </Badge>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger" role="alert">
          Could not load notifications: {error.message}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading notifications…</div>
          ) : notifications.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Bell className="h-8 w-8 text-primary" />}
                title="You’re all caught up"
                description="New library reminders and reports will appear here."
              />
            </div>
          ) : (
            <div className="divide-y divide-[#d9e6d8] dark:divide-[#31514a]">
              {notifications.map((notification) => {
                const isInventory = notification.type === 'monthly_inventory_report'
                const isWarning = notification.type === 'reservation_pickup_warning'
                return (
                  <article
                    key={notification.id}
                    className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5 ${
                      notification.read_at ? '' : 'bg-[#f1f7e9] dark:bg-[#25443a]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void openNotification(notification)}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isWarning
                          ? 'bg-[#f5dfd9] text-[#a54c3b] dark:bg-[#59332e] dark:text-[#f0b5a7]'
                          : 'bg-[#dcefe5] text-[#176557] dark:bg-[#214a40] dark:text-[#a9e3ce]'
                      }`}>
                        {isWarning ? <MailWarning className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {notification.subject || 'Library notification'}
                          </span>
                          {!notification.read_at && <Badge variant="info" size="sm">New</Badge>}
                        </span>
                        <span className="mt-1 block whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                          {notification.body || 'Open to view details.'}
                        </span>
                        <span className="mt-2 block text-xs text-slate-500">
                          {new Date(notification.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
                          {notification.borrower?.name ? ` · ${notification.borrower.name}` : ''}
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                      {isInventory && notification.report_id && (
                        <Link
                          to={notificationPath(notification)}
                          onClick={() => {
                            if (!notification.read_at) {
                              markRead.mutate(notification.id, {
                                onError: (mutationError) => toast.error(mutationError.message),
                              })
                            }
                          }}
                        >
                          <Button variant="primary" size="sm" leftIcon={<Download className="h-4 w-4" />}>
                            Download inventory
                          </Button>
                        </Link>
                      )}
                      {isWarning && (
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Download className="h-4 w-4" />}
                          onClick={() => downloadWarning(notification)}
                        >
                          Download letter
                        </Button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
