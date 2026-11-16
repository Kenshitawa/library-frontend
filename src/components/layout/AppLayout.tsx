import React, { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  UserPlus,
  Clock,
  ArrowRightCircle,
  ArrowLeftCircle,
  AlertTriangle,
} from 'lucide-react'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { TopBar } from './TopBar'
import { CommandPalette } from './CommandPalette'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useSessionTimeout } from '@/hooks/useSessionTimeout'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { showWarning, stayLoggedIn } = useSessionTimeout()
  const { role } = useAuth()
  const isLibrarian = role === 'librarian'

  // Cmd+K or Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const mobileNavItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Catalog', to: '/catalog', icon: BookOpen },
    { label: 'Returns', to: '/returns', icon: Clock },
    ...(isLibrarian
      ? [
          { label: 'Issue', to: '/issue', icon: ArrowRightCircle },
          { label: 'Return', to: '/return', icon: ArrowLeftCircle },
          { label: 'Add', to: '/borrowers?new=1', icon: UserPlus },
        ]
      : []),
  ]

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--app-bg)] text-[var(--text-primary)] transition-colors duration-150">
      {/* Desktop / Tablet Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onToggleMobileNav={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 pb-20 sm:p-6 md:pb-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Navigation (< 768px) */}
        <nav aria-label="Primary navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-[#b8d3c4] bg-[#d7e9dc]/95 px-1 backdrop-blur-sm dark:border-[#31584d] dark:bg-[#173c35]/95">
          {mobileNavItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-1 text-[10px] font-medium transition-colors',
                    isActive
                      ? 'text-primary dark:text-primary-400 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  )
                }
                aria-label={item.label === 'Add' ? 'Add learner' : item.label}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>

      <MobileNav
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Session Inactivity Timeout Warning Dialog */}
      <Dialog open={showWarning} onClose={stayLoggedIn} maxWidth="sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-50 text-warning dark:bg-amber-950/50">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Session Expiring Soon</DialogTitle>
              <DialogDescription className="mt-1">
                You have been inactive. For security, you will be logged out in 2 minutes.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="primary" onClick={stayLoggedIn}>
            Stay Logged In
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
