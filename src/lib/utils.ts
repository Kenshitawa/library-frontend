import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind CSS class names with conflict resolution */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format integer cents as Kenya-localized currency (e.g. 2800 → "Ksh 28.00"). */
export function formatCurrency(cents: number, currency = 'KES'): string {
  const amount = Number(cents)
  if (!Number.isFinite(amount)) {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(0)
  }
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100)
}

/** Format a Date or ISO date string as a locale-aware short date */
export function formatDate(
  date: string | Date | null | undefined,
  timezone = 'Africa/Nairobi'
): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeZone: timezone,
  }).format(d)
}

/** Format an ISO date-time string as a locale-aware date+time */
export function formatDateTime(
  date: string | Date | null | undefined,
  timezone = 'Africa/Nairobi'
): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(d)
}

/** Returns status of due date relative to today: 'overdue' | 'due-today' | 'due-soon' | 'ok' */
export function getDueDateStatus(
  dueAt: Date | string
): 'overdue' | 'due-today' | 'due-soon' | 'ok' {
  const due = typeof dueAt === 'string' ? new Date(dueAt) : dueAt
  const now = new Date()

  // Reset time portions for pure day comparisons in local timezone
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const dueDayStart = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()

  const diffDays = Math.round((dueDayStart - todayStart) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return 'overdue'
  } else if (diffDays === 0) {
    return 'due-today'
  } else if (diffDays <= 3) {
    return 'due-soon'
  } else {
    return 'ok'
  }
}

/** Returns true if the given ISO date or Date is in the past */
export function isOverdue(dueAt: string | Date): boolean {
  return getDueDateStatus(dueAt) === 'overdue'
}

/** Days until due date (negative = overdue) */
export function daysUntilDue(dueAt: string | Date): number {
  const due = typeof dueAt === 'string' ? new Date(dueAt) : dueAt
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const dueDayStart = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()
  return Math.round((dueDayStart - todayStart) / (1000 * 60 * 60 * 24))
}
