import { describe, expect, it } from 'vitest'
import type { CompanyEvent } from '@/features/events/model'
import type { Payment } from '@/features/payouts/model'
import { pastEventsOf, periods, personStats } from './stats'

const event = (id: string, startsOn: string, crew: { memberId: string | null; name: string; role: string }[], patch: Partial<CompanyEvent> = {}) =>
  ({ id, name: id, startsOn, endsOn: startsOn, status: 'confirmed', crew: crew.map((item, index) => ({ id: `${id}-${index}`, ...item })), ...patch }) as unknown as CompanyEvent
const pay = (patch: Partial<Payment>): Payment => ({ id: 'p', memberId: 'u1', amount: 100, kind: 'reward', happenedOn: '2025-05-01', eventId: null, note: '', paidAt: '2025-05-02', ...patch })

const events = [
  event('a', '2025-03-01', [{ memberId: 'u1', name: '', role: 'Osvetľovač' }]),
  event('b', '2025-06-01', [{ memberId: 'u2', name: '', role: 'Zvukár' }]),
  event('c', '2025-07-01', [{ memberId: 'u1', name: '', role: 'Osvetľovač' }], { endsOn: '2025-07-03' }),
  event('d', '2025-08-01', [{ memberId: 'u1', name: '', role: 'Stagehand' }], { status: 'cancelled' }),
  event('e', '2025-09-01', [{ memberId: null, name: 'Jano Brigádnik', role: 'Stagehand' }]),
]

describe('staff overview', () => {
  it('counts attended and missed events, days, roles and earnings', () => {
    const stats = personStats(events, [pay({}), pay({ amount: 50, kind: 'advance', paidAt: null }), pay({ happenedOn: '2024-12-31' })], { memberId: 'u1', name: 'Dávid' }, { from: '2025-01-01', to: '2025-12-31' }, '2026-10-19')
    expect(stats.total).toBe(4)
    expect(stats.attended.map((item) => item.id)).toEqual(['c', 'a'])
    expect(stats.missed.map((item) => item.id)).toEqual(['e', 'b'])
    expect(stats.days).toBe(4)
    expect(stats.roles).toEqual([{ role: 'Osvetľovač', count: 2 }])
    expect(stats.earned).toBe(100)
    expect(stats.advances).toBe(50)
    expect(stats.unpaid).toBe(50)
  })

  it('matches part-timers by name and lists past events', () => {
    expect(pastEventsOf(events, { memberId: null, name: 'jano brigádnik' }, '2026-10-19').map((item) => item.id)).toEqual(['e'])
  })

  it('offers the last 12 months and years with events', () => {
    expect(periods('2026-10-19', events).map((period) => period.id)).toEqual(['last12', '2026', '2025'])
  })
})
