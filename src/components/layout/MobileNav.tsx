import React, { useEffect, useRef } from 'react'
import { Link, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  UserPlus,
  ArrowRightCircle,
  ArrowLeftCircle,
  DollarSign,
  Clock,
  BarChart3,
  UserCog,
  Settings,
  FileText,
  Bell,
  Library,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLibraryProfile } from '@/hooks/useLibraryProfile'
import { useAuth } from '@/hooks/useAuth'

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  librarianOnly?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

export interface MobileNavProps {
  open: boolean
  onClose: () => void
}

/**
 * BoardUI-style navigation sheet: a floating rounded panel with a fixed brand
 * header, a scrollable nav body and a pinned primary action. Every workspace is
 * reachable here, including Settings, and the list scrolls independently so it
 * never runs off the bottom of the screen.
 */
export const MobileNav: React.FC<MobileNavProps> = ({ open, onClose }) => {
  const { profile: libProfile } = useLibraryProfile()
  const { role, profile } = useAuth()
  const isLibrarian = role === 'librarian'
  const closeRef = useRef<HTMLButtonElement>(null)

  const groups: NavGroup[] = [
    {
      label: 'Main',
      items: [
        { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
        { label: 'Returns', to: '/returns', icon: Clock },
        { label: 'Notifications', to: '/notifications', icon: Bell },
      ],
    },
    {
      label: 'Library',
      items: [
        { label: 'Catalog', to: '/catalog', icon: BookOpen },
        { label: 'Borrowers', to: '/borrowers', icon: Users, librarianOnly: true },
        { label: 'Issue Desk', to: '/issue', icon: ArrowRightCircle, librarianOnly: true },
        { label: 'Return Desk', to: '/return', icon: ArrowLeftCircle, librarianOnly: true },
      ],
    },
    {
      label: 'Management',
      items: [
        { label: 'Charges', to: '/charges', icon: DollarSign, librarianOnly: true },
        { label: 'Reservations', to: '/reservations', icon: Clock, librarianOnly: true },
        { label: 'Reports', to: '/reports', icon: BarChart3, librarianOnly: true },
        { label: 'Users', to: '/users', icon: UserCog, librarianOnly: true },
      ],
    },
    {
      label: 'System',
      items: [
        { label: 'Settings', to: '/settings', icon: Settings, librarianOnly: true },
        { label: 'Audit Log', to: '/audit', icon: FileText, librarianOnly: true },
      ],
    },
  ]

  // Close on Escape and lock page scroll while the sheet is open.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Library navigation">
      <div
        className="absolute inset-0 bg-[#0c1d17]/45 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-y-3 left-3 flex max-h-[calc(100dvh-1.5rem)] w-[min(20rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-[var(--page-shadow)]">
        {/* Brand header */}
        <div className="flex items-start gap-3 border-b border-[var(--surface-border)] px-4 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary text-white shadow-sm">
            {libProfile?.logo_url ? (
              <img src={libProfile.logo_url} alt="Library logo" className="h-full w-full object-contain" />
            ) : (
              <Library className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {libProfile?.name || 'School Library'}
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
              {profile?.name ?? 'Library Desk'}
            </p>
          </div>
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            aria-label="Close navigation"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-inset)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable workspace list */}
        <nav
          aria-label="Library workspaces"
          className="flex-1 overflow-y-auto overscroll-contain px-2.5 pb-4"
        >
          {groups.map((group) => {
            const items = group.items.filter((item) => !item.librarianOnly || isLibrarian)
            if (items.length === 0) return null
            return (
              <div key={group.label} className="pt-4 first:pt-3">
                <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-primary text-white shadow-sm'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-inset)] hover:text-[var(--text-primary)]'
                          )
                        }
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Pinned primary action */}
        {isLibrarian && (
          <div className="border-t border-[var(--surface-border)] p-3">
            <Link
              to="/borrowers?new=1"
              onClick={onClose}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <UserPlus className="h-4 w-4" />
              Add learner
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
