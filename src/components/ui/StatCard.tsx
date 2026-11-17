import React from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from './Card'

export interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: {
    value: string | number
    label?: string
    positive?: boolean
  }
  description?: string
  className?: string
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  onClick?: () => void
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  description,
  className,
  color = 'primary',
  onClick,
}) => {
  const colorMap = {
    primary: 'bg-surface-2 text-heading',
    success: 'bg-surface-2 text-heading',
    warning: 'bg-surface-2 text-heading',
    danger: 'bg-surface-2 text-heading',
    info: 'bg-surface-2 text-heading',
  }
  const surfaceMap = {
    primary: 'border-accent/20 bg-accent/[0.07]',
    success: 'border-positive/20 bg-positive/[0.07]',
    warning: 'border-caution/25 bg-caution/[0.08]',
    danger: 'border-negative/20 bg-negative/[0.07]',
    info: 'border-sky-accent/20 bg-sky-accent/[0.07]',
  }

  return (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      className={cn('p-5 flex flex-col justify-between', surfaceMap[color], onClick && 'cursor-pointer', className)}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-heading/90">
          {label}
        </span>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', colorMap[color])}>
          {icon}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-2xl font-bold tracking-tight text-heading">
          {value}
        </div>

        {(trend || description) && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-heading/85">
            {trend && (
              <span
                className={cn(
                  'inline-flex items-center font-medium',
                  'text-heading'
                )}
              >
                {trend.positive ? (
                  <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />
                )}
                {trend.value}
              </span>
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </div>
    </Card>
  )
}
