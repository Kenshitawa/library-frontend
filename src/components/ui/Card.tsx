import React from 'react'
import { cx } from '@/utils/cx'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean
}

export const Card: React.FC<CardProps> = ({ className, hoverable, children, ...props }) => {
  return (
    <div
      className={cx(
        'rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-card transition-[box-shadow,border-color,background-color] duration-150',
        hoverable && 'hover:shadow-card-hover hover:border-primary/40',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cx('flex flex-col space-y-1.5 border-b border-[var(--surface-border)] p-5 sm:p-6', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <h3
      className={cx('text-lg font-semibold leading-tight tracking-tight text-[var(--text-primary)]', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <p     className={cx('text-sm text-[var(--text-secondary)]', className)} {...props}>
      {children}
    </p>
  )
}

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cx('p-4 sm:p-6', className)} {...props}>
      {children}
    </div>
  )
}

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cx(
        'mt-4 flex items-center border-t border-[var(--surface-border)] p-4 pt-4 sm:p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
