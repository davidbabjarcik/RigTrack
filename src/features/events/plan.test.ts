import { describe, expect, it } from 'vitest'
import { dayKm, eventDates, formatMinutes, onDay, totalKm, workedMinutes } from './plan'

describe('multi-day events', () => {
  it('lists the days of an event', () => {
    expect(eventDates('2026-11-07', '2026-11-11')).toEqual(['2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11'])
    expect(eventDates('2026-11-07', '2026-11-07')).toEqual(['2026-11-07'])
  })

  it('treats an empty day list as every day', () => {
    expect(onDay([], '2026-11-07')).toBe(true)
    expect(onDay(['2026-11-08'], '2026-11-07')).toBe(false)
  })

  it('counts kilometres from the warehouse', () => {
    // 92 km jedným smerom, 2 autá, 1 otočka → 368 km; druhý deň 1 auto, 2 otočky + 15 km po meste
    expect(dayKm(92, { vehicles: 2, roundTrips: 1, extraKm: 0 })).toBe(368)
    expect(totalKm(92, [{ vehicles: 2, roundTrips: 1, extraKm: 0 }, { vehicles: 1, roundTrips: 2, extraKm: 15 }])).toBe(751)
    expect(dayKm(null, { vehicles: 1, roundTrips: 1, extraKm: 20 })).toBe(20)
  })

  it('counts worked time including overnight shifts and breaks', () => {
    expect(workedMinutes({ startsAt: '08:00', endsAt: '18:30', breakMinutes: 45 })).toBe(585)
    expect(workedMinutes({ startsAt: '18:00', endsAt: '02:00', breakMinutes: 0 })).toBe(480)
    expect(formatMinutes(585)).toBe('9 h 45 min')
    expect(formatMinutes(480)).toBe('8 h')
  })
})
