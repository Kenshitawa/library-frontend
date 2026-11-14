import { describe, it, expect } from 'vitest'
import { formatDate, formatCurrency, getDueDateStatus } from '../lib/utils'

describe('utils formatting helpers', () => {
  it('formats currency in cents using Kenyan shillings', () => {
    expect(formatCurrency(2800)).toContain('28')
    expect(formatCurrency(2800)).toContain('Ksh')
    expect(formatCurrency(0)).toContain('0.00')
    expect(formatCurrency(15050)).toContain('150.50')
  })

  it('formats dates consistently', () => {
    const formatted = formatDate('2026-11-13T12:00:00Z')
    expect(formatted).not.toBe('—')
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })

  it('correctly calculates due date status (overdue, due-today, due-soon, ok)', () => {
    const now = new Date()

    // 5 days ago = overdue
    const overdueDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
    expect(getDueDateStatus(overdueDate)).toBe('overdue')

    // Today = due-today
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0)
    expect(getDueDateStatus(today)).toBe('due-today')

    // 2 days in future = due-soon
    const soonDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    expect(getDueDateStatus(soonDate)).toBe('due-soon')

    // 14 days in future = ok
    const okDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    expect(getDueDateStatus(okDate)).toBe('ok')
  })
})
