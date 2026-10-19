import { describe, expect, it } from 'vitest'
import type { CompanyEvent } from '@/features/events/model'
import { clashes, matchesPerson, mergeStaff, unavailableOn, upcomingEvents, upcomingPeriods, type StaffRow } from './model'

const row = (patch: Partial<StaffRow>): StaffRow => ({
  id: 's1', memberId: null, name: '', position: '', phone: '', email: '', photoPath: '', skills: '', note: '', active: true, birthDate: null, nameDay: '', licences: [], onboarded: true, ...patch,
})
const members = [
  { userId: 'u1', email: 'peter@x.sk', fullName: 'Peter Zvukár', role: 'technik' as const },
  { userId: 'u2', email: 'jana@x.sk', fullName: '', role: 'skladnik' as const },
]

describe('staff', () => {
  it('merges members with their cards and keeps part-timers and former members', () => {
    const people = mergeStaff(members, [
      row({ id: 's1', memberId: 'u1', position: 'Zvukár', phone: '+421 900' }),
      row({ id: 's2', name: 'Jano Brigádnik', position: 'Stagehand' }),
      row({ id: 's3', memberId: 'gone', name: '' }),
      row({ id: 's4', name: 'Neaktívny', active: false }),
    ])
    expect(people.map((person) => [person.key, person.name, person.position, person.isMember])).toEqual([
      ['s3', 'Bývalý člen', '', false],
      ['m-u2', 'jana@x.sk', '', true],
      ['s2', 'Jano Brigádnik', 'Stagehand', false],
      ['s1', 'Peter Zvukár', 'Zvukár', true],
      ['s4', 'Neaktívny', '', false],
    ])
  })

  it('knows when someone cannot come', () => {
    const periods = [
      { id: 'p1', staffId: 's1', startsOn: '2026-11-01', endsOn: '2026-11-07', note: 'Dovolenka' },
      { id: 'p2', staffId: 's1', startsOn: '2026-10-01', endsOn: '2026-10-02', note: '' },
      { id: 'p3', staffId: 's2', startsOn: '2026-11-03', endsOn: '2026-11-03', note: '' },
    ]
    expect(unavailableOn(periods, 's1', '2026-11-05')?.id).toBe('p1')
    expect(unavailableOn(periods, 's1', '2026-11-08')).toBeNull()
    expect(clashes(periods, 's1', '2026-10-31', '2026-11-01').map((period) => period.id)).toEqual(['p1'])
    expect(upcomingPeriods(periods, 's1', '2026-10-17').map((period) => period.id)).toEqual(['p1'])
  })

  it('lists upcoming events where the member is in the crew', () => {
    const event = (id: string, startsOn: string, memberId: string, status: CompanyEvent['status'] = 'confirmed') =>
      ({ id, startsOn, endsOn: startsOn, status, crew: [{ id: 'c', memberId, name: '', role: '' }] }) as unknown as CompanyEvent
    const events = [event('late', '2026-12-01', 'u1'), event('soon', '2026-11-01', 'u1'), event('past', '2026-01-01', 'u1'), event('off', '2026-11-02', 'u1', 'cancelled'), event('other', '2026-11-03', 'u2')]
    expect(upcomingEvents(events, 'u1', '2026-10-17').map((item) => item.id)).toEqual(['soon', 'late'])
  })

  it('finds people by name, position or skill without accents', () => {
    const [peter] = mergeStaff(members.slice(0, 1), [row({ memberId: 'u1', position: 'Zvukár', skills: 'vodičák B, práca vo výškach' })])
    expect(matchesPerson(peter, 'zvukar')).toBe(true)
    expect(matchesPerson(peter, 'vyskach')).toBe(true)
    expect(matchesPerson(peter, 'osvetlovac')).toBe(false)
  })
})

describe('celebrations', () => {
  it('finds birthdays and name days in the next days', async () => {
    const { upcomingCelebrations, describeCelebration, formatNameDay } = await import('./celebrations')
    const people = mergeStaff([], [
      row({ id: 'a', name: 'Jano', birthDate: '1996-10-20' }),
      row({ id: 'b', name: 'Mária', nameDay: '10-19' }),
      row({ id: 'c', name: 'Neaktívny', nameDay: '10-19', active: false }),
    ])
    const list = upcomingCelebrations(people, '2026-10-19', 7)
    expect(list.map((item) => describeCelebration(item, '2026-10-19'))).toEqual(['Dnes má meniny Mária', 'Zajtra má narodeniny Jano (30)'])
    expect(formatNameDay('06-24')).toBe('24. 6.')
  })
})
