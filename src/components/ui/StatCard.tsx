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
    primary: 'bg-white/15 text-white',
    success: 'bg-white/15 text-white',
    warning: 'bg-white/15 text-white',
    danger: 'bg-white/15 text-white',
    info: 'bg-white/15 text-white',
  }
  const surfaceMap = {
    primary: 'border-[#176557] bg-[#176557] dark:border-[#10473f] dark:bg-[#10473f]',
    success: 'border-[#376e35] bg-[#376e35] dark:border-[#244b2c] dark:bg-[#244b2c]',
    warning: 'border-[#8a5a00] bg-[#8a5a00] dark:border-[#654400] dark:bg-[#654400]',
    danger: 'border-[#9a3029] bg-[#9a3029] dark:border-[#74251f] dark:bg-[#74251f]',
    info: 'border-[#286878] bg-[#286878] dark:border-[#1d4e5a] dark:bg-[#1d4e5a]',
  }

  return (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      className={cn('p-5 flex flex-col justify-between', surfaceMap[color], onClick && 'cursor-pointer', className)}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white/90">
          {label}
        </span>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', colorMap[color])}>
          {icon}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-2xl font-bold tracking-tight text-white">
          {value}
        </div>

        {(trend || description) && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-white/85">
            {trend && (
              <span
                className={cn(
                  'inline-flex items-center font-medium',
                  'text-white'
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
