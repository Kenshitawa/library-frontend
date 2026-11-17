import React, { useEffect, useRef } from 'react'
import { useLocation, Link } from 'react-router-dom'
import {
  Search,
  Sun,
  Moon,
  Bell,
  LogOut,
  User as UserIcon,
  Menu,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useNotifications } from '@/hooks/useNotifications'
import { playNotificationSound } from '@/lib/notificationSound'

export interface TopBarProps {
  onOpenCommandPalette: () => void
  onToggleMobileNav?: () => void
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenCommandPalette,
  onToggleMobileNav,
}) => {
  const { user, profile, role, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { data: notifications } = useNotifications()
  const location = useLocation()
  const previousUnreadRef = useRef<Set<string> | null>(null)

  // Generate breadcrumb info based on path
  const pathParts = location.pathname.split('/').filter(Boolean)
  const currentTitle =
    pathParts.length > 0
      ? pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1)
      : 'Dashboard'

  const unreadNotifications = (notifications || []).filter((notification) => !notification.read_at)
  const unreadCount = unreadNotifications.length

  useEffect(() => {
    if (!notifications) return
    const currentIds = new Set(unreadNotifications.map((notification) => notification.id))
    const previousIds = previousUnreadRef.current
    previousUnreadRef.current = currentIds
    if (!previousIds || !Array.from(currentIds).some((id) => !previousIds.has(id))) return

    try {
      if (localStorage.getItem('library-notification-sound') === 'on') playNotificationSound()
    } catch (error) {
      console.warn('Could not play the new-notification sound.', error)
    }
  }, [notifications, unreadNotifications])

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-line bg-abyss/80 backdrop-blur-xl px-4 sm:px-6">
      {/* Left: Mobile hamburger & Page Breadcrumb */}
      <div className="flex items-center gap-3">
        {onToggleMobileNav && (
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-9 w-9 p-0"
            onClick={onToggleMobileNav}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div className="flex flex-col">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-faint">
            <span className="text-faint">Library</span>
            {pathParts.length > 0 && (
              <>
                <span className="text-faint">/</span>
                <span className="capitalize text-body font-medium">
                  {pathParts[0]}
                </span>
              </>
            )}
          </div>
          <h1 className="text-base font-semibold text-heading sm:text-lg">
            {currentTitle}
          </h1>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Global Search Cmd+K Button */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 rounded-lg border border-line-strong bg-surface-1 px-3 py-1.5 text-xs text-muted hover:border-teal-400/30 hover:text-accent transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Quick search...</span>
          <kbd className="rounded border border-line-strong bg-surface-1 px-1.5 py-0.5 text-[10px] font-semibold text-faint">
            ⌘K
          </kbd>
        </button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 text-muted hover:text-heading"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notification Bell */}
        <Link to="/notifications" aria-label={`View notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}>
          <div className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-heading">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold text-heading leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </Link>

        {/* User Menu Dropdown */}
        <DropdownMenu
          align="right"
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-line-strong p-1 hover:border-line-strong transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-400/15 text-accent text-xs font-bold">
                {profile?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
            </button>
          }
          items={[
            {
              label: profile?.name || user?.email || 'User',
              icon: <UserIcon className="h-4 w-4" />,
              disabled: true,
            },
            {
              label: `Role: ${role || 'user'}`,
              disabled: true,
            },
            {
              label: '',
              divider: true,
            },
            {
              label: 'Sign out',
              icon: <LogOut className="h-4 w-4" />,
              danger: true,
              onClick: () => signOut(),
            },
          ]}
        />
      </div>
    </header>
  )
}
