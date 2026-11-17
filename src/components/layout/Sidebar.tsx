import React from 'react'
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
  ChevronLeft,
  ChevronRight,
  Library,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLibraryProfile } from '@/hooks/useLibraryProfile'
import { useAuth } from '@/hooks/useAuth'

export interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  librarianOnly?: boolean
}

interface NavGroup {
  group: string
  items: NavItem[]
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const { profile: libProfile } = useLibraryProfile()
  const { role } = useAuth()
  const isLibrarian = role === 'librarian'

  const navigation: NavGroup[] = [
    {
      group: 'Main',
      items: [
        { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
        { label: 'Returns', to: '/returns', icon: Clock },
        { label: 'Notifications', to: '/notifications', icon: Bell },
      ],
    },
    {
      group: 'Library',
      items: [
        { label: 'Catalog', to: '/catalog', icon: BookOpen },
        { label: 'Borrowers', to: '/borrowers', icon: Users, librarianOnly: true },
        { label: 'Issue Desk', to: '/issue', icon: ArrowRightCircle, librarianOnly: true },
        { label: 'Return Desk', to: '/return', icon: ArrowLeftCircle, librarianOnly: true },
      ],
    },
    {
      group: 'Management',
      items: [
        { label: 'Charges', to: '/charges', icon: DollarSign, librarianOnly: true },
        { label: 'Reservations', to: '/reservations', icon: Clock, librarianOnly: true },
        { label: 'Reports', to: '/reports', icon: BarChart3, librarianOnly: true },
        { label: 'Users', to: '/users', icon: UserCog, librarianOnly: true },
      ],
    },
    {
      group: 'System',
      items: [
        { label: 'Settings', to: '/settings', icon: Settings, librarianOnly: true },
        { label: 'Audit Log', to: '/audit', icon: FileText, librarianOnly: true },
      ],
    },
  ]

  return (
    <aside
      className={cn(
        'relative hidden md:flex flex-col border-r border-line bg-panel transition-all duration-200 select-none z-30',
        collapsed ? 'w-20' : 'w-[258px]'
      )}
    >
      {/* Brand Header */}
      <div className="border-b border-line px-4 py-4">
        <Link to="/dashboard" className="group flex items-center gap-3 rounded-xl px-2 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-400/25 bg-teal-400/10 text-accent shadow-[0_0_30px_-8px_rgba(45,212,191,0.6)]">
            {libProfile?.logo_url ? (
              <img src={libProfile.logo_url} alt="Library logo" className="h-6 w-6 object-contain" />
            ) : (
              <Library className="h-5 w-5" />
            )}
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-[#070c16] bg-emerald-400" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-[0.16em] text-heading">
                {libProfile?.name || 'SCHOOL LIBRARY'}
              </span>
              <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.18em] text-faint">
                Library desk
              </span>
            </span>
          )}
        </Link>
      </div>

      {isLibrarian && !collapsed && (
        <div className="px-3 pt-3">
          <Link
            to="/borrowers?new=1"
            className="flex items-center gap-3 rounded-xl border border-teal-400/20 bg-teal-400/10 px-3 py-2 text-sm font-semibold text-accent transition hover:bg-teal-400/15"
          >
            <UserPlus className="h-4 w-4 shrink-0" />
            <span className="truncate">Add learner</span>
          </Link>
        </div>
      )}

      {/* Navigation Groups */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-5">
        {navigation.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.librarianOnly || isLibrarian
          )
          if (visibleItems.length === 0) return null

          return (
            <div key={group.group} className="mb-6">
              {!collapsed && (
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-faint">
                  {group.group}
                </p>
              )}
              <ul className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        title={collapsed ? item.label : undefined}
                        aria-label={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          cn(
                            'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400',
                            isActive
                              ? 'bg-surface-2 font-semibold text-heading'
                              : 'font-medium text-muted hover:bg-surface-1 hover:text-heading',
                            collapsed && 'justify-center px-2'
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-teal-300" />
                            )}
                            <Icon
                              className={cn(
                                'h-[18px] w-[18px] shrink-0',
                                isActive ? 'text-accent' : 'text-faint group-hover:text-body'
                              )}
                            />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                          </>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}

        {!collapsed && (
          <div className="mt-4 rounded-xl border border-line bg-surface-1 p-3.5">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Library online
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-faint">
              Circulation desk ready. Use Cmd+K for quick search.
            </p>
          </div>
        )}
      </nav>

      {/* Collapse Toggle Footer */}
      <div className="border-t border-line p-3">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex w-full items-center justify-center gap-2 rounded-xl p-2 text-xs font-medium text-faint hover:bg-surface-1 hover:text-body transition"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}