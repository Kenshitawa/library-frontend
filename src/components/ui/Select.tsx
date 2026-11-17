import React, { forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  description?: string
  options: SelectOption[]
  placeholder?: string
  wrapperClassName?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      description,
      options,
      placeholder,
      id,
      className,
      wrapperClassName,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const selectId = id || generatedId
    const errorId = `${selectId}-error`
    const descId = `${selectId}-desc`

    return (
      <div className={cn('w-full flex flex-col gap-1.5', wrapperClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-medium text-body"
          >
            {label}
            {props.required && <span className="text-danger ml-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center w-full">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              error ? errorId : description ? descId : undefined
            }
            className={cn(
              'w-full appearance-none rounded-lg border border-line-strong bg-surface-1 px-3 py-2 pr-9 text-sm text-body transition-colors',
              'focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/10',
              'disabled:cursor-not-allowed disabled:bg-surface-1 disabled:text-faint',
              error && 'border-danger focus:border-danger focus:ring-danger/20',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          <ChevronDown className="absolute right-3 h-4 w-4 pointer-events-none text-muted" />
        </div>

        {description && !error && (
          <p id={descId} className="text-[11px] text-faint">
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

Select.displayName = 'Select'
