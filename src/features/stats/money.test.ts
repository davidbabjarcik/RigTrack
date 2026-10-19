import { describe, expect, it } from 'vitest'
import { byMonth, byRole, byYear, inYear, moneyYears, NO_EVENT, NO_ROLE, sum, type MemberPayment } from './money'

const pay = (amount: number, happenedOn: string, eventId: string | null = null, memberId = 'me'): MemberPayment => ({
  memberId,
  amount,
  happenedOn,
  eventId,
  paidAt: null,
})

describe('money statistics', () => {
  it('sums by month and by year, biggest first', () => {
    const items = [
      { date: '2026-09-05', amount: 100 },
      { date: '2026-09-20', amount: 50.5 },
      { date: '2026-10-01', amount: 120 },
      { date: '2025-07-01', amount: 300 },
    ]
    expect(byMonth(items)).toEqual([
      { id: '2025-07', label: 'júl 2025', value: 300 },
      { id: '2026-09', label: 'september 2026', value: 150.5 },
      { id: '2026-10', label: 'október 2026', value: 120 },
    ])
    expect(byYear(items)).toEqual([
      { id: '2025', label: '2025', value: 300 },
      { id: '2026', label: '2026', value: 270.5 },
    ])
    expect(moneyYears(items.map((item) => item.date))).toEqual(['2026', '2025'])
    expect(inYear('2026-01-01', 'all')).toBe(true)
    expect(inYear('2025-12-31', '2026')).toBe(false)
  })

  it('groups pay by the role the member had on the event', () => {
    const events = [
      { id: 'e1', crew: [{ id: 'c1', memberId: 'me', name: '', role: 'Osvetľovač', response: 'pending' as const, responseNote: '' }] },
      { id: 'e2', crew: [{ id: 'c2', memberId: 'me', name: '', role: ' osvetľovač ', response: 'pending' as const, responseNote: '' }] },
      { id: 'e3', crew: [{ id: 'c3', memberId: 'me', name: '', role: 'Zvukár', response: 'pending' as const, responseNote: '' }] },
      { id: 'e4', crew: [] },
    ]
    expect(byRole([pay(200, '2026-09-01', 'e1'), pay(150, '2026-09-02', 'e2'), pay(120, '2026-09-03', 'e3'), pay(80, '2026-09-04', 'e4'), pay(30, '2026-09-05')], events)).toEqual([
      { id: 'osvetľovač', label: 'Osvetľovač', value: 350 },
      { id: 'zvukár', label: 'Zvukár', value: 120 },
      { id: NO_ROLE.toLowerCase(), label: NO_ROLE, value: 80 },
      { id: NO_EVENT.toLowerCase(), label: NO_EVENT, value: 30 },
    ])
  })

  it('adds money without rounding errors', () => {
    expect(sum([{ amount: 0.1 }, { amount: 0.2 }])).toBe(0.3)
  })
})
