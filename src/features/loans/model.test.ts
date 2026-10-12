import { describe, expect, it } from 'vitest'
import { busyQuantity, isAwaitingIssue, isOverdue, loanSchema, sortLoans, type Loan } from './model'

const today = '2026-10-13'

const loan = (patch: Partial<Loan>): Loan => ({
  id: 'x',
  borrower: 'Klient',
  contact: '',
  startsOn: '2026-10-10',
  endsOn: '2026-10-12',
  status: 'reserved',
  note: '',
  issuedAt: null,
  returnedAt: null,
  items: [{ equipmentId: 'mixer', quantity: 1, damaged: false }],
  ...patch,
})

describe('loan state', () => {
  it('is overdue only when issued and past its end date', () => {
    expect(isOverdue(loan({ status: 'issued', endsOn: '2026-10-12' }), today)).toBe(true)
    expect(isOverdue(loan({ status: 'issued', endsOn: '2026-10-13' }), today)).toBe(false)
    expect(isOverdue(loan({ status: 'returned', endsOn: '2026-10-01' }), today)).toBe(false)
  })

  it('flags reservations that should already be handed out', () => {
    expect(isAwaitingIssue(loan({ startsOn: '2026-10-13' }), today)).toBe(true)
    expect(isAwaitingIssue(loan({ startsOn: '2026-10-14' }), today)).toBe(false)
  })

  it('sorts overdue first, then issued, reserved and finally closed loans', () => {
    const sorted = sortLoans(
      [
        loan({ id: 'closed', status: 'returned' }),
        loan({ id: 'reserved', status: 'reserved', startsOn: '2026-11-01', endsOn: '2026-11-02' }),
        loan({ id: 'issued', status: 'issued', endsOn: '2026-10-20' }),
        loan({ id: 'overdue', status: 'issued', endsOn: '2026-10-01' }),
      ],
      today,
    )
    expect(sorted.map((l) => l.id)).toEqual(['overdue', 'issued', 'reserved', 'closed'])
  })
})

describe('busyQuantity', () => {
  const cables = (id: string, patch: Partial<Loan>) =>
    loan({ id, items: [{ equipmentId: 'cables', quantity: 5, damaged: false }], ...patch })
  const loans = [
    cables('a', { startsOn: '2026-11-01', endsOn: '2026-11-03' }),
    cables('b', { startsOn: '2026-11-03', endsOn: '2026-11-05', status: 'issued' }),
    cables('c', { startsOn: '2026-11-01', endsOn: '2026-11-03', status: 'returned' }),
    cables('late', { startsOn: '2026-09-01', endsOn: '2026-09-02', status: 'issued' }),
  ]

  it('adds up open loans overlapping the term, including one overdue and still out', () => {
    expect(busyQuantity(loans, 'cables', '2026-11-03', '2026-11-03', today)).toBe(15)
    expect(busyQuantity(loans, 'cables', '2026-11-06', '2026-11-07', today)).toBe(5)
  })

  it('ignores other equipment', () => {
    expect(busyQuantity(loans, 'mixer', '2026-11-01', '2026-11-05', today)).toBe(0)
  })
})

describe('loanSchema', () => {
  const valid = { borrower: 'Klient', contact: '', startsOn: '2026-11-01', endsOn: '2026-11-03', note: '', items: [{ equipmentId: 'a', quantity: 1 }] }

  it('accepts a valid loan and a single-day loan', () => {
    expect(loanSchema.safeParse(valid).success).toBe(true)
    expect(loanSchema.safeParse({ ...valid, endsOn: '2026-11-01' }).success).toBe(true)
  })

  it('rejects a missing borrower, reversed dates and an empty item list', () => {
    expect(loanSchema.safeParse({ ...valid, borrower: ' ' }).success).toBe(false)
    expect(loanSchema.safeParse({ ...valid, endsOn: '2026-10-31' }).success).toBe(false)
    expect(loanSchema.safeParse({ ...valid, items: [] }).success).toBe(false)
  })
})
