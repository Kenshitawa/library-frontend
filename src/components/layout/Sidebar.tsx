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
        'relative hidden md:flex flex-col border-r border-[#b8d3c4] bg-[#d7e9dc] transition-all duration-200 dark:border-[#31584d] dark:bg-[#17382f] select-none z-30',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center px-4 border-b border-[#b8d3c4] dark:border-[#31584d]">
        <div className="flex items-center gap-3 overflow-hidden">
          {libProfile?.logo_url ? (
            <img
              src={libProfile.logo_url}
              alt="Library Logo"
              className="h-9 w-9 rounded-lg object-contain shrink-0"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
              <Library className="h-5 w-5" />
            </div>
          )}
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                {libProfile?.name || 'School Library'}
              </span>
              <span className="text-xs text-slate-500 dark:text-[#b4c3b6] truncate">Library Desk</span>
            </div>
          )}
        </div>
      </div>

      {isLibrarian && (
        <div className="px-3 pt-3">
          <Link
            to="/borrowers?new=1"
            title={collapsed ? 'Add learner' : undefined}
            aria-label="Add learner"
            className={cn(
              'flex items-center gap-3 rounded-button bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-800 transition-colors hover:bg-primary-100 dark:bg-[#254534] dark:text-[#c6edcf] dark:hover:bg-[#315641]',
              collapsed && 'justify-center px-2'
            )}
          >
            <UserPlus className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">Add learner</span>}
          </Link>
        </div>
      )}

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navigation.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.librarianOnly || isLibrarian
          )
          if (visibleItems.length === 0) return null

          return (
            <div key={group.group} className="space-y-1">
              {!collapsed && (
                <h4 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#a7b9aa]">
                  {group.group}
                </h4>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-button px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-slate-600 hover:bg-[#c6dfd0] dark:text-[#c1d0c3] dark:hover:bg-[#294b3e] dark:hover:text-[#f0f5ef]',
                          collapsed && 'justify-center px-2'
                        )
                      }
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Collapse Toggle Footer */}
      <div className="border-t border-[#b8d3c4] p-3 dark:border-[#31584d]">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex w-full items-center justify-center gap-2 rounded-button p-2 text-xs font-medium text-slate-500 hover:bg-[#c6dfd0] dark:text-[#b4c3b6] dark:hover:bg-[#294b3e]"
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
