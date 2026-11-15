import React, { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cx } from '@/utils/cx'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-button transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none'

    const variantStyles = {
      primary: 'bg-primary text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm dark:bg-[#287452] dark:hover:bg-[#338660] dark:active:bg-[#246b4a]',
      secondary:
        'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300 dark:bg-[#293b31] dark:text-[#edf4ed] dark:hover:bg-[#354c3e]',
      outline:
        'border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 dark:border-[#52685a] dark:text-[#e2ece3] dark:hover:bg-[#293b31]',
      ghost:
        'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200 dark:text-[#d4e0d5] dark:hover:bg-[#293b31]',
      danger: 'bg-danger text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
      success: 'bg-success text-white hover:bg-green-700 active:bg-green-800 shadow-sm',
    }

    const sizeStyles = {
      sm: 'text-xs px-2.5 py-1.5 h-8 gap-1.5',
      md: 'text-sm px-4 py-2 h-10 gap-2',
      lg: 'text-base px-5 py-2.5 h-12 gap-2.5',
      icon: 'h-10 w-10 p-0',
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cx(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'
