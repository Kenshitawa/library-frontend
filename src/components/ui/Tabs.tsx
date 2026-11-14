import React, { createContext, useContext } from 'react'
import { cn } from '@/lib/utils'

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
      <div className={cn('w-full flex flex-col', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TabsList: React.FC<TabsListProps> = ({ className, children, ...props }) => {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center border-b border-slate-200 dark:border-slate-800 space-x-1',
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
      className={cn(
        'inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors select-none -mb-px',
        isActive
          ? 'border-primary text-primary dark:text-primary-400 font-semibold'
          : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200',
        className
      )}
      {...props}
    >
      {children}
      {badge !== undefined && (
        <span
          className={cn(
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
      className={cn('pt-4 focus-visible:outline-none', className)}
      {...props}
    >
      {children}
    </div>
  )
}
