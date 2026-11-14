import { describe, it, expect } from 'vitest'
import { evaluateIssueBlocks } from '../lib/issueBlocks'

describe('Issue Blocking Rules (FR-26 & AC-1)', () => {
  const baseBorrower = {
    id: 'borrower-1',
    status: 'active' as const,
  }

  const baseBorrowerType = {
    max_items: 3,
    charge_threshold: 0,
  }

  const baseCopy = {
    id: 'copy-1',
    status: 'available' as const,
    title: { type: 'textbook' as const },
  }

  it('allows checkout when all conditions are normal', () => {
    const result = evaluateIssueBlocks({
      borrower: baseBorrower,
      borrowerType: baseBorrowerType,
      copy: baseCopy,
      openIssuesCount: 1,
      hasOverdue: false,
      outstandingCharges: 0,
    })

    expect(result.blocked).toBe(false)
    expect(result.reason).toBe('')
  })

  it('blocks inactive borrower (AC-8, FR-20)', () => {
    const result = evaluateIssueBlocks({
      borrower: { ...baseBorrower, status: 'inactive' },
      borrowerType: baseBorrowerType,
      copy: baseCopy,
      openIssuesCount: 0,
      hasOverdue: false,
      outstandingCharges: 0,
    })

    expect(result.blocked).toBe(true)
    expect(result.reason).toContain('inactive')
  })

  it('blocks when item limit reached (AC-1)', () => {
    const result = evaluateIssueBlocks({
      borrower: baseBorrower,
      borrowerType: baseBorrowerType,
      copy: baseCopy,
      openIssuesCount: 3, // max is 3
      hasOverdue: false,
      outstandingCharges: 0,
    })

    expect(result.blocked).toBe(true)
    expect(result.reason).toContain('Item limit reached (3 of 3)')
  })

  it('blocks when borrower has overdue items', () => {
    const result = evaluateIssueBlocks({
      borrower: baseBorrower,
      borrowerType: baseBorrowerType,
      copy: baseCopy,
      openIssuesCount: 1,
      hasOverdue: true,
      outstandingCharges: 0,
    })

    expect(result.blocked).toBe(true)
    expect(result.reason).toContain('overdue')
  })

  it('blocks when borrower has outstanding charges over threshold', () => {
    const result = evaluateIssueBlocks({
      borrower: baseBorrower,
      borrowerType: baseBorrowerType,
      copy: baseCopy,
      openIssuesCount: 1,
      hasOverdue: false,
      outstandingCharges: 5000, // R50.00 > 0 threshold
    })

    expect(result.blocked).toBe(true)
    expect(result.reason).toContain('outstanding balance')
  })

  it('blocks reference books from home loan', () => {
    const result = evaluateIssueBlocks({
      borrower: baseBorrower,
      borrowerType: baseBorrowerType,
      copy: {
        ...baseCopy,
        title: { type: 'reference' as const },
      },
      openIssuesCount: 0,
      hasOverdue: false,
      outstandingCharges: 0,
    })

    expect(result.blocked).toBe(true)
    expect(result.reason).toContain('Reference books cannot be issued')
  })

  it('blocks copy that is reserved for another borrower', () => {
    const result = evaluateIssueBlocks({
      borrower: baseBorrower,
      borrowerType: baseBorrowerType,
      copy: {
        ...baseCopy,
        status: 'reserved' as const,
      },
      openIssuesCount: 0,
      hasOverdue: false,
      outstandingCharges: 0,
      isReservedForBorrower: false,
    })

    expect(result.blocked).toBe(true)
    expect(result.reason).toContain('reserved for another borrower')
  })
})
