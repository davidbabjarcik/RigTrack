import { describe, expect, it } from 'vitest'
import { busyQuantity, busyUnits, describeContent, describeDamage, groupByCase, isAwaitingIssue, isOverdue, loanDays, loanPricing, loanSchema, sortLoans, type Loan } from './model'

const today = '2026-10-13'

const loan = (patch: Partial<Loan>): Loan => ({
  id: 'x',
  borrower: 'Klient',
  contact: '',
  borrowerIco: '',
  borrowerAddress: '',
  billedDays: null,
  price: null,
  deposit: null,
  startsOn: '2026-10-10',
  endsOn: '2026-10-12',
  status: 'reserved',
  note: '',
  issuedAt: null,
  returnedAt: null,
  issuedByName: '',
  returnedByName: '',
  items: [{ equipmentId: 'mixer', quantity: 1, damaged: false, caseId: null, unitNumbers: [], damagedUnits: [], damagedQuantity: 0, unitPrice: null }],
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
    loan({ id, items: [{ equipmentId: 'cables', quantity: 5, damaged: false, caseId: null, unitNumbers: [], damagedUnits: [], damagedQuantity: 0, unitPrice: null }], ...patch })
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
  const valid = { borrower: 'Klient', contact: '', borrowerIco: '', borrowerAddress: '', startsOn: '2026-11-01', endsOn: '2026-11-03', note: '', items: [{ equipmentId: 'a', quantity: 1, caseId: '', unitNumbers: [] }] }

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

describe('groupByCase', () => {
  it('separates whole cases from individually picked equipment', () => {
    const items = [
      { equipmentId: 'di', quantity: 2, caseId: 'audio' },
      { equipmentId: 'mixer', quantity: 1, caseId: null },
      { equipmentId: 'xlr', quantity: 1, caseId: 'audio' },
    ]
    const grouped = groupByCase(items)
    expect(grouped.single.map((item) => item.equipmentId)).toEqual(['mixer'])
    expect(grouped.cases).toEqual([{ caseId: 'audio', content: [items[0], items[2]] }])
    expect(describeContent(grouped.cases[0].content, (id) => id.toUpperCase())).toBe('2× DI, XLR')
  })
})

describe('numbered pieces', () => {
  const item = { equipmentId: 'blinder', quantity: 2, damaged: false, caseId: null, unitNumbers: [1, 3], damagedUnits: [], damagedQuantity: 0, unitPrice: null }

  it('finds the pieces taken by other open loans in the term', () => {
    const loans = [
      loan({ id: 'a', startsOn: '2026-11-01', endsOn: '2026-11-03', items: [item] }),
      loan({ id: 'b', startsOn: '2026-11-10', endsOn: '2026-11-12', items: [{ ...item, unitNumbers: [2] }] }),
      loan({ id: 'c', status: 'returned', startsOn: '2026-11-01', endsOn: '2026-11-03', items: [{ ...item, unitNumbers: [4] }] }),
    ]
    expect(busyUnits(loans, 'blinder', '2026-11-02', '2026-11-05', '2026-10-01')).toEqual([1, 3])
    expect(busyUnits(loans, 'mixer', '2026-11-02', '2026-11-05', '2026-10-01')).toEqual([])
  })

  it('describes what came back damaged', () => {
    expect(describeDamage(item)).toBe('')
    expect(describeDamage({ ...item, damaged: true, damagedUnits: [3], damagedQuantity: 1 })).toBe('poškodené #3')
    expect(describeDamage({ ...item, damaged: true, damagedQuantity: 2 })).toBe('poškodené 2 ks')
    expect(describeDamage({ ...item, quantity: 1, damaged: true, damagedQuantity: 1 })).toBe('poškodené')
  })
})

describe('loan pricing', () => {
  const items = [
    { quantity: 4, unitPrice: 12.5 },
    { quantity: 1, unitPrice: 30 },
    { quantity: 50, unitPrice: null },
  ]

  it('counts calendar days including both ends', () => {
    expect(loanDays('2026-11-01', '2026-11-01')).toBe(1)
    expect(loanDays('2026-11-01', '2026-11-03')).toBe(3)
    expect(loanDays('2026-10-24', '2026-10-26')).toBe(3) // cez zmenu času
    expect(loanDays('', '2026-11-03')).toBe(1)
  })

  it('multiplies the daily sum by the days and lets an agreed price win', () => {
    const base = { startsOn: '2026-11-01', endsOn: '2026-11-03', items }
    expect(loanPricing(base)).toEqual({ days: 3, perDay: 80, calculated: 240, total: 240, priced: true })
    expect(loanPricing({ ...base, billedDays: 2 })).toMatchObject({ days: 2, calculated: 160, total: 160 })
    expect(loanPricing({ ...base, price: 200 })).toMatchObject({ calculated: 240, total: 200 })
  })

  it('knows a loan without any prices', () => {
    expect(loanPricing({ startsOn: '2026-11-01', endsOn: '2026-11-01', items: [{ quantity: 2 }] })).toMatchObject({ total: 0, priced: false })
  })
})
