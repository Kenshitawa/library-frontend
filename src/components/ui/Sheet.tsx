import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  width?: 'sm' | 'md' | 'lg' | 'xl'
}

export const Sheet: React.FC<SheetProps> = ({
  open,
  onClose,
  children,
  className,
  width = 'md',
}) => {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const widthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        ref={sheetRef}
        className={cn(
          'relative z-50 flex h-full w-full flex-col overflow-y-auto bg-white p-6 shadow-2xl transition-transform duration-200 ease-in-out animate-in slide-in-from-right',
          'dark:bg-slate-900 dark:border-l dark:border-slate-800',
          widthStyles[width],
          className
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sheet"
          className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  )
}

export const SheetHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn('flex flex-col space-y-1.5 pb-4 border-b border-slate-100 dark:border-slate-800', className)} {...props}>
      {children}
    </div>
  )
}

export const SheetTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <h2
      className={cn('text-lg font-semibold text-slate-900 dark:text-slate-100 pr-6', className)}
      {...props}
    >
      {children}
    </h2>
  )
}

export const SheetDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <p className={cn('text-sm text-slate-500 dark:text-slate-400', className)} {...props}>
      {children}
    </p>
  )
}

export const SheetBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn('flex-1 py-4', className)} {...props}>
      {children}
    </div>
  )
}

export const SheetFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto', className)}
      {...props}
    >
      {children}
    </div>
  )
}
