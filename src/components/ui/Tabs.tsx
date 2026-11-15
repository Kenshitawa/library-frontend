import React, { createContext, useContext } from 'react'
import { cx } from '@/utils/cx'

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined)

export interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({
  value,
  onValueChange,
  children,
  className,
}) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cx('w-full flex flex-col', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TabsList: React.FC<TabsListProps> = ({ className, children, ...props }) => {
  return (
    <div
      role="tablist"
      className={cx(
        'flex w-full flex-wrap items-stretch gap-1 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-inset)] p-1.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  badge?: number | string
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  badge,
  className,
  children,
  ...props
}) => {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsTrigger must be used within Tabs')

  const isActive = context.value === value

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isActive}
      onClick={() => context.onValueChange(value)}
      className={cx(
        'inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-center text-xs font-medium leading-4 transition-[color,background-color,box-shadow] duration-150 select-none sm:flex-none sm:px-4 sm:text-sm',
        isActive
          ? 'bg-[var(--surface)] text-primary shadow-sm font-semibold'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface)]/60 hover:text-[var(--text-primary)]',
        className
      )}
      {...props}
    >
      {children}
      {badge !== undefined && (
        <span
          className={cx(
            'rounded-full px-2 py-0.5 text-xs',
            isActive
              ? 'bg-primary-100 text-primary-800 dark:bg-primary-950 dark:text-primary-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
          )}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  className,
  children,
  ...props
}) => {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')

  if (context.value !== value) return null

  return (
    <div
      role="tabpanel"
      className={cx('pt-4 focus-visible:outline-none', className)}
      {...props}
    >
      {children}
    </div>
  )
}
