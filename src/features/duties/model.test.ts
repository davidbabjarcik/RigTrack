import { describe, expect, it } from 'vitest'
import { dutyRanking, hoursByPerson, logMinutes, type EventDuty } from './model'

describe('duties model', () => {
  it('counts work log minutes across midnight minus breaks', () => {
    expect(logMinutes({ startsAt: '13:00:00', endsAt: '23:30:00', breakMinutes: 30 })).toBe(600)
    expect(logMinutes({ startsAt: '20:00', endsAt: '02:00', breakMinutes: 0 })).toBe(360)
  })

  it('ranks hours by person in a year', () => {
    const logs = [
      { userId: 'a', workDate: '2026-03-01', startsAt: '08:00', endsAt: '16:00', breakMinutes: 30 },
      { userId: 'b', workDate: '2026-03-02', startsAt: '08:00', endsAt: '20:00', breakMinutes: 0 },
      { userId: 'a', workDate: '2025-12-31', startsAt: '08:00', endsAt: '20:00', breakMinutes: 0 },
    ]
    expect(hoursByPerson(logs, '2026', (id) => id.toUpperCase())).toEqual([
      { id: 'b', label: 'B', value: 12 },
      { id: 'a', label: 'A', value: 7.5 },
    ])
  })

  it('ranks people on a duty, members and externals by name', () => {
    const duty = (eventId: string, memberId: string | null, personName = '') => ({ id: `${eventId}${memberId}${personName}`, eventId, dutyTypeId: 'load', memberId, personName }) as EventDuty
    const duties = [duty('e1', 'jano'), duty('e2', 'jano'), duty('e1', null, 'Peter'), duty('e2', null, 'peter '), duty('e3', null, 'Peter'), { ...duty('e1', 'fero'), dutyTypeId: 'cables' }]
    const starts: Record<string, string> = { e1: '2026-01-10', e2: '2026-02-10', e3: '2025-06-01' }
    const ranking = dutyRanking(duties, 'load', (id) => starts[id], '2026', (item) => item.memberId ?? item.personName.trim())
    expect(ranking).toEqual([
      { id: 'jano', label: 'jano', value: 2 },
      { id: 'ext:peter', label: 'Peter', value: 2 },
    ])
  })
})

describe('hours with work outside events', () => {
  it('adds minutes from work at the company or at home', () => {
    const logs = [{ userId: 'a', workDate: '2026-03-01', startsAt: '08:00', endsAt: '10:00', breakMinutes: 0 }]
    const extra = [{ userId: 'a', date: '2026-03-02', minutes: 90 }, { userId: 'b', date: '2025-01-01', minutes: 600 }]
    expect(hoursByPerson(logs, '2026', (id) => id, 10, extra)).toEqual([{ id: 'a', label: 'a', value: 3.5 }])
  })
})

describe('guessPhase', () => {
  it('puts loading before and checks after the event', async () => {
    const { guessPhase } = await import('./model')
    expect(['Nakladanie', 'Vykladanie', 'Kontrola a naskladnenie hliníka', 'Kontrola kabeláže', 'Stavba pódia'].map(guessPhase)).toEqual(['before', 'after', 'after', 'after', 'event'])
  })
})

describe('dutyOwners', () => {
  it('offers chosen people and everyone with a chosen role', async () => {
    const { dutyOwners } = await import('./model')
    const members = [
      { userId: 'a', role: 'technik' },
      { userId: 'b', role: 'skladnik' },
      { userId: 'c', role: 'helper' },
    ]
    expect(dutyOwners({ ownerIds: ['c'], ownerRoles: ['skladnik'] }, members).map((m) => m.userId)).toEqual(['b', 'c'])
    expect(dutyOwners({ ownerIds: [], ownerRoles: [] }, members)).toEqual([])
  })
})
