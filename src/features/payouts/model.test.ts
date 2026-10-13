import { describe, expect, it } from 'vitest'
import type { CompanyEvent } from '@/features/events/model'
import { inYear, lastEditionPayout, paymentSchema, paymentTotals, paymentYears, shareByMember, sortPayments, unpaidByMember, type Payment } from './model'

const payment = (patch: Partial<Payment>): Payment => ({
  id: 'x', memberId: 'm1', amount: 100, kind: 'reward', happenedOn: '2026-10-01', eventId: null, note: '', paidAt: null, ...patch,
})

describe('paymentTotals', () => {
  it('splits unpaid from paid without float drift', () => {
    expect(
      paymentTotals([payment({ amount: 0.1 }), payment({ amount: 0.2 }), payment({ amount: 50, paidAt: '2026-10-05T10:00:00Z' })]),
    ).toEqual({ unpaid: 0.3, paid: 50 })
    expect(paymentTotals([])).toEqual({ unpaid: 0, paid: 0 })
  })
})

describe('unpaidByMember', () => {
  it('sums what is owed per member and leaves out members who are settled', () => {
    expect(
      unpaidByMember([
        payment({ memberId: 'a', amount: 60 }),
        payment({ memberId: 'b', amount: 200 }),
        payment({ memberId: 'a', amount: 40.5 }),
        payment({ memberId: 'c', amount: 80, paidAt: '2026-10-05T10:00:00Z' }),
      ]),
    ).toEqual([
      { memberId: 'b', unpaid: 200 },
      { memberId: 'a', unpaid: 100.5 },
    ])
  })
})

describe('sortPayments', () => {
  it('lists unpaid first from the oldest, then paid from the newest', () => {
    const sorted = sortPayments([
      payment({ id: 'paid-old', happenedOn: '2026-01-01', paidAt: 'x' }),
      payment({ id: 'unpaid-new', happenedOn: '2026-10-10' }),
      payment({ id: 'paid-new', happenedOn: '2026-09-01', paidAt: 'x' }),
      payment({ id: 'unpaid-old', happenedOn: '2026-08-01' }),
    ])
    expect(sorted.map((p) => p.id)).toEqual(['unpaid-old', 'unpaid-new', 'paid-new', 'paid-old'])
  })
})

describe('paymentSchema', () => {
  const valid = { memberId: 'm1', amount: 120, kind: 'reward', happenedOn: '2026-10-13', eventId: '', note: '' }

  it('requires a member and a positive amount', () => {
    expect(paymentSchema.safeParse(valid).success).toBe(true)
    expect(paymentSchema.safeParse({ ...valid, memberId: '' }).success).toBe(false)
    expect(paymentSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false)
    expect(paymentSchema.safeParse({ ...valid, amount: NaN }).success).toBe(false)
  })
})

describe('shareByMember', () => {
  const payments = [
    payment({ memberId: 'jano', amount: 300, paidAt: 'x' }),
    payment({ memberId: 'fero', amount: 100 }),
    payment({ memberId: 'jano', amount: 100 }),
    payment({ memberId: 'eva', amount: 0.1 }),
    payment({ memberId: 'eva', amount: 0.2 }),
  ]

  it('ranks members by what they got and gives each a share of the whole', () => {
    const { rows, total } = shareByMember(payments, false)
    expect(total).toBe(500.3)
    expect(rows.map((row) => [row.memberId, row.amount])).toEqual([['jano', 400], ['fero', 100], ['eva', 0.3]])
    expect(rows.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1)
    expect(rows[0].share).toBeCloseTo(400 / 500.3)
  })

  it('can count only what has been paid out', () => {
    expect(shareByMember(payments, true)).toEqual({ rows: [{ memberId: 'jano', amount: 300, share: 1, members: 1 }], total: 300 })
    expect(shareByMember([payment({})], true)).toEqual({ rows: [], total: 0 })
  })

  it('merges the tail into one row', () => {
    const { rows } = shareByMember(payments, false, 1)
    expect(rows.map((row) => [row.memberId, row.amount, row.members])).toEqual([['jano', 400, 1], [null, 100.3, 2]])
  })
})

describe('years', () => {
  const payments = [payment({ happenedOn: '2025-08-10' }), payment({ happenedOn: '2026-01-05' }), payment({ happenedOn: '2025-12-31' })]

  it('lists the years with records, newest first, and filters by one', () => {
    expect(paymentYears(payments)).toEqual(['2026', '2025'])
    expect(inYear(payments, '2025')).toHaveLength(2)
    expect(inYear(payments, '')).toHaveLength(3)
  })
})

describe('lastEditionPayout', () => {
  const edition = (id: string, name: string, startsOn: string): CompanyEvent => ({
    id, name, client: '', venue: '', startsOn, endsOn: startsOn, status: 'done', note: '', equipment: [], crew: [],
  })
  const events = [edition('j25', 'JESKO Medzilaborce 2025', '2025-08-09'), edition('j26', 'JESKO Medzilaborce 2026', '2026-08-08'), edition('new', 'Nová akcia', '2026-09-01')]
  const payments = [
    payment({ memberId: 'jano', eventId: 'j25', amount: 100 }),
    payment({ memberId: 'jano', eventId: 'j25', amount: 20, kind: 'bonus' }),
    payment({ memberId: 'fero', eventId: 'j25', amount: 80 }),
  ]

  it('adds up what the member got for the previous edition', () => {
    expect(lastEditionPayout(payments, events, 'jano', 'j26')).toMatchObject({ amount: 120, event: { id: 'j25' } })
    expect(lastEditionPayout(payments, events, 'fero', 'j26')?.amount).toBe(80)
  })

  it('has nothing to suggest for a first edition, a newcomer or an incomplete choice', () => {
    expect(lastEditionPayout(payments, events, 'jano', 'new')).toBeNull()
    expect(lastEditionPayout(payments, events, 'eva', 'j26')).toBeNull()
    expect(lastEditionPayout(payments, events, '', 'j26')).toBeNull()
    expect(lastEditionPayout(payments, events, 'jano', '')).toBeNull()
  })
})
