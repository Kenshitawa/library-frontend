import React from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  CircleDot,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'gray' | 'outline' | 'outline'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  icon?: React.ReactNode
  size?: 'sm' | 'md'
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'gray',
  icon,
  size = 'md',
  className,
  children,
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    primary:
      'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-950/60 dark:text-primary-300 dark:border-primary-800',
    success:
      'bg-success-50 text-success-700 border-success-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    warning:
      'bg-warning-50 text-warning-700 border-warning-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    danger:
      'bg-danger-50 text-danger-700 border-danger-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
    info: 'bg-info-50 text-info-700 border-info-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    gray: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    outline: 'bg-transparent text-slate-700 border-slate-300 dark:text-slate-200 dark:border-slate-600',
  }

  const defaultIcons: Record<BadgeVariant, React.ReactNode> = {
    primary: <CircleDot className="h-3 w-3 shrink-0" />,
    success: <CheckCircle2 className="h-3 w-3 shrink-0" />,
    warning: <AlertTriangle className="h-3 w-3 shrink-0" />,
    danger: <AlertCircle className="h-3 w-3 shrink-0" />,
    info: <Info className="h-3 w-3 shrink-0" />,
    gray: <CircleDot className="h-3 w-3 shrink-0" />,
    outline: <CircleDot className="h-3 w-3 shrink-0" />,
  }

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border leading-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {icon ?? defaultIcons[variant]}
      <span>{children}</span>
    </span>
  )
}
