import React, { forwardRef, useId } from 'react'
import { cx } from '@/utils/cx'

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
      <div className={cx('w-full flex flex-col gap-1.5', wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {label}
            {props.required && <span className="text-danger ml-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftAddon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
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
            className={cx(
              'w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2.5 text-sm text-[var(--text-primary)] transition-[border-color,box-shadow,background-color] duration-150',
              'placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
              'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400',
              'placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-primary/20',
              'disabled:cursor-not-allowed disabled:bg-[var(--surface-inset)] disabled:text-[var(--text-muted)]',
              leftAddon && 'pl-10',
              rightAddon && 'pr-10',
              error && 'border-danger focus:border-danger focus:ring-danger/20',
              className
            )}
            {...props}
          />

          {rightAddon && (
            <div className="absolute right-3 flex items-center text-slate-400">
              {rightAddon}
            </div>
          )}
        </div>

        {description && !error && (
          <p id={descId} className="text-xs text-slate-500 dark:text-slate-400">
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
