import React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean
}

export const Card: React.FC<CardProps> = ({ className, hoverable, children, ...props }) => {
  return (
    <div
      className={cn(
        'rounded-card border border-[#cdd8c3] bg-[#fbfbf4] text-slate-900 shadow-card transition-all duration-150',
        'dark:border-[#3a5145] dark:bg-[#1a2922] dark:text-[#f0f5ef] dark:shadow-[0_8px_24px_rgba(0,0,0,0.18)]',
        hoverable && 'hover:shadow-card-hover hover:border-[#9fb58f] dark:hover:border-[#668674]',
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
      className={cn('flex flex-col space-y-1.5 p-6 border-b border-slate-100 dark:border-[#344a3d]', className)}
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
      className={cn('text-lg font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-100', className)}
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
    <p     className={cn('text-sm text-slate-500 dark:text-[#b4c3b6]', className)} {...props}>
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
    <div className={cn('p-6', className)} {...props}>
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
      className={cn(
        'flex items-center p-6 pt-0 border-t border-slate-100 dark:border-[#344a3d] mt-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
