import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StepItem {
  id: string | number
  title: string
  description?: string
}

export interface StepperProps {
  steps: StepItem[]
  currentStep: number // 0-indexed
  onStepClick?: (index: number) => void
  className?: string
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  className,
}) => {
  return (
    <nav aria-label="Progress" className={cn('w-full', className)}>
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep

          return (
            <li
              key={step.id}
              className={cn(
                'relative flex-1',
                index !== steps.length - 1 && 'pr-8 sm:pr-20'
              )}
            >
              {/* Connector line */}
              {index !== steps.length - 1 && (
                <div
                  className="absolute top-4 left-0 -ml-px mt-0.5 h-0.5 w-full bg-slate-200 dark:bg-slate-700"
                  aria-hidden="true"
                >
                  <div
                    className={cn(
                      'h-full bg-primary transition-all duration-300',
                      isCompleted ? 'w-full' : 'w-0'
                    )}
                  />
                </div>
              )}

              <div
                onClick={() => onStepClick && onStepClick(index)}
                className={cn(
                  'group relative flex items-center',
                  onStepClick && 'cursor-pointer'
                )}
              >
                <span className="flex h-9 items-center" aria-hidden="true">
                  <span
                    className={cn(
                      'relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                      isCompleted
                        ? 'bg-primary text-heading'
                        : isCurrent
                        ? 'border-2 border-primary bg-white text-primary dark:bg-slate-900 dark:text-primary-400'
                        : 'border-2 border-slate-300 bg-white text-faint dark:border-slate-700 dark:bg-slate-900 dark:text-muted'
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                </span>
                <span className="ml-3 flex min-w-0 flex-col">
                  <span
                    className={cn(
                      'text-xs font-semibold uppercase tracking-wider',
                      isCurrent
                        ? 'text-primary dark:text-primary-400'
                        : isCompleted
                        ? 'text-heading'
                        : 'text-muted'
                    )}
                  >
                    {step.title}
                  </span>
                  {step.description && (
                    <span className="text-xs text-muted truncate hidden sm:inline">
                      {step.description}
                    </span>
                  )}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
