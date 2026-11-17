import React, { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  description?: string
  leftAddon?: React.ReactNode
  rightAddon?: React.ReactNode
  wrapperClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      description,
      leftAddon,
      rightAddon,
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
            className="text-xs font-medium text-body"
          >
            {label}
            {props.required && <span className="text-danger ml-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftAddon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-muted">
              {leftAddon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              error ? errorId : description ? descId : undefined
            }
            className={cn(
              'w-full rounded-lg border border-line-strong bg-surface-1 px-3 py-2 text-sm text-body transition-colors',
              'placeholder:text-faint focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/10',
              'disabled:cursor-not-allowed disabled:bg-surface-1 disabled:text-faint',
              leftAddon && 'pl-10',
              rightAddon && 'pr-10',
              error && 'border-danger focus:border-danger focus:ring-danger/20',
              className
            )}
            {...props}
          />

          {rightAddon && (
            <div className="absolute right-3 flex items-center text-muted">
              {rightAddon}
            </div>
          )}
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

Input.displayName = 'Input'
