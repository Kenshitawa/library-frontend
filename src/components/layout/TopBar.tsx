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
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-[#b8d3c4] bg-[#d7e9dc]/95 px-4 backdrop-blur-sm dark:border-[#31584d] dark:bg-[#17382f]/95 sm:px-6">
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
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Link to="/dashboard" className="text-slate-500 hover:text-primary dark:text-[#b4c3b6] dark:hover:text-[#9de2bb] transition-colors">
              Library
            </Link>
            {pathParts.length > 0 && (
              <>
                <span>/</span>
                <span className="capitalize text-slate-600 dark:text-[#d4e0d5]">
                  {pathParts[0]}
                </span>
              </>
            )}
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
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
          className="hidden sm:flex items-center gap-2 rounded-button border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 dark:border-[#40584a] dark:bg-[#22342b] dark:text-[#b4c3b6] transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Quick search...</span>
          <kbd className="rounded bg-white dark:bg-[#14221b] px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:text-[#b4c3b6] shadow-sm border border-slate-200 dark:border-[#40584a]">
            ⌘K
          </kbd>
        </button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 text-slate-500 hover:text-slate-900 dark:text-[#b4c3b6] dark:hover:text-[#f0f5ef]"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notification Bell */}
        <Link to="/notifications" aria-label={`View notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}>
          <div className="relative inline-flex h-9 w-9 items-center justify-center rounded-button text-slate-500 transition-colors hover:bg-[#c6dfd0] dark:text-[#b4c3b6] dark:hover:bg-[#294b3e]">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold text-white leading-none">
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
              className="flex items-center gap-2 rounded-full border border-slate-200 p-1 hover:border-slate-300 dark:border-[#40584a] transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-800 dark:bg-primary-950 dark:text-primary-300 text-xs font-bold">
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
