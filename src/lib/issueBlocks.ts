import type { Borrower, BorrowerType, Copy, Title } from '@/types'
import { formatCurrency } from './utils'

export interface IssueBlockParams {
  borrower: Pick<Borrower, 'id' | 'status'>
  borrowerType: Pick<BorrowerType, 'max_items' | 'charge_threshold'>
  copy: Pick<Copy, 'id' | 'status'> & { title?: Pick<Title, 'type'> | null }
  openIssuesCount: number
  hasOverdue: boolean
  outstandingCharges: number
  isReservedForBorrower?: boolean
}

export interface IssueBlockResult {
  blocked: boolean
  reason: string
}

export function evaluateIssueBlocks(params: IssueBlockParams): IssueBlockResult {
  const {
    borrower,
    borrowerType,
    copy,
    openIssuesCount,
    hasOverdue,
    outstandingCharges,
    isReservedForBorrower = false,
  } = params

  // 1. Borrower inactive
  if (borrower.status === 'inactive') {
    return {
      blocked: true,
      reason: 'Borrower is inactive and cannot be issued books.',
    }
  }

  // 2. Copy status
  if (copy.status !== 'available' && copy.status !== 'reserved') {
    return {
      blocked: true,
      reason: `Copy is not available (status: ${copy.status}).`,
    }
  }

  // 3. Reserved for someone else
  if (copy.status === 'reserved' && !isReservedForBorrower) {
    return {
      blocked: true,
      reason: 'Copy is reserved for another borrower.',
    }
  }

  // 4. Reference books cannot be issued for home use
  if (copy.title?.type === 'reference') {
    return {
      blocked: true,
      reason: 'Reference books cannot be issued for home use.',
    }
  }

  // 5. Max items limit
  if (openIssuesCount >= borrowerType.max_items) {
    return {
      blocked: true,
      reason: `Item limit reached (${openIssuesCount} of ${borrowerType.max_items}).`,
    }
  }

  // 6. Overdue items
  if (hasOverdue) {
    return {
      blocked: true,
      reason: 'Borrower has overdue items.',
    }
  }

  // 7. Outstanding charges threshold
  if (outstandingCharges > borrowerType.charge_threshold) {
    return {
      blocked: true,
      reason: `Borrower has an outstanding balance of ${formatCurrency(outstandingCharges)}.`,
    }
  }

  return {
    blocked: false,
    reason: '',
  }
}
