import React, { forwardRef, useId } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  description?: string
  wrapperClassName?: string
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      label,
      error,
      description,
      id,
      className,
      wrapperClassName,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const errorId = `${inputId}-error`
    const descId = `${inputId}-desc`

    return (
      <div className={cn('w-full flex flex-col gap-1.5', wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-body"
          >
            {label}
            {props.required && <span className="text-danger ml-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center w-full">
          <input
            id={inputId}
            ref={ref}
            type="date"
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              error ? errorId : description ? descId : undefined
            }
            className={cn(
              'w-full rounded-lg border border-line-strong bg-surface-1 px-3 py-2 text-sm text-body transition-colors',
              'focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/10',
              'disabled:cursor-not-allowed disabled:bg-surface-1 disabled:text-faint',
              error && 'border-danger focus:border-danger focus:ring-danger/20',
              className
            )}
            {...props}
          />
          <CalendarIcon className="absolute right-3 h-4 w-4 pointer-events-none text-muted" />
        </div>

        {description && !error && (
          <p id={descId} className="text-xs text-muted">
            {description}
          </p>
        )}

        {error && (
          <p id={errorId} className="text-xs font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    )
  }
)

DatePicker.displayName = 'DatePicker'
