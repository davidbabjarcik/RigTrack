import { describe, expect, it } from 'vitest'
import { monthlyRows, monthRange, rewardNote } from './monthly'
import type { WorkSession } from './workApi'

const session = (userId: string, place: 'company' | 'home', start: string, end: string): WorkSession => ({
  id: start, userId, place, startedAt: start, endedAt: end, verified: true, distanceM: null, pausedAt: null, pauseKind: null, breakMinutes: 0, waitMinutes: 0, note: '', editedByName: '',
})

describe('monthly attendance report', () => {
  it('computes the month range across the new year', () => {
    expect(monthRange('2026-10')).toEqual({ from: '2026-10-01', to: '2026-11-01' })
    expect(monthRange('2026-12')).toEqual({ from: '2026-12-01', to: '2027-01-01' })
  })

  it('sums hours by place and suggests a reward from rates', () => {
    const sessions = [session('a', 'company', '2026-10-01T08:00:00Z', '2026-10-01T16:00:00Z'), session('a', 'home', '2026-10-02T08:00:00Z', '2026-10-02T10:30:00Z')]
    const logs = [{ userId: 'a', eventId: 'e', eventName: 'Festival', workDate: '2026-10-05', startsAt: '14:00', endsAt: '02:00', breakMinutes: 60 }, { userId: 'b', eventId: 'e', eventName: 'Festival', workDate: '2026-10-05', startsAt: '10:00', endsAt: '12:00', breakMinutes: 0 }]
    const rows = monthlyRows(sessions, logs, [{ memberId: 'a', companyRate: 8, homeRate: 6, eventRate: null }], 0)
    expect(rows[0]).toMatchObject({ memberId: 'a', companyMinutes: 480, homeMinutes: 150, eventMinutes: 660, amount: 79 })
    expect(rows[1]).toMatchObject({ memberId: 'b', eventMinutes: 120, amount: null })
    expect(rewardNote('2026-10', rows[0])).toBe('Dochádzka 10/2026 – firma 8 h, doma 2,5 h, eventy 11 h')
  })
})
