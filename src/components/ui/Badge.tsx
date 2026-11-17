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
    primary: 'border-teal-400/25 bg-teal-400/10 text-accent',
    success: 'border-emerald-400/25 bg-emerald-400/10 text-positive',
    warning: 'border-amber-400/25 bg-amber-400/10 text-caution',
    danger: 'border-rose-400/25 bg-rose-400/10 text-negative',
    info: 'border-sky-400/25 bg-sky-400/10 text-sky-accent',
    gray: 'border-slate-400/20 bg-slate-400/10 text-body',
    outline: 'border-line-strong bg-transparent text-body',
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
