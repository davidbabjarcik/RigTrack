import { describe, expect, it } from 'vitest'
import { currentMeeting, distanceM, formatDistance, formatMinutes, workedMinutes, type Meeting } from './model'

const meeting = (id: string, meetAt: string) => ({ id, meetAt }) as Meeting

describe('attendance model', () => {
  it('measures distance between points', () => {
    // Stropkov – Svidník je zhruba 15 km vzdušnou čiarou.
    const km = distanceM({ lat: 49.2026, lon: 21.6513 }, { lat: 49.3056, lon: 21.5703 }) / 1000
    expect(km).toBeGreaterThan(12)
    expect(km).toBeLessThan(15)
    expect(distanceM({ lat: 49.2, lon: 21.65 }, { lat: 49.2, lon: 21.65 })).toBe(0)
    expect(formatDistance(80)).toBe('80 m')
    expect(formatDistance(12_400)).toBe('12,4 km')
  })

  it('picks the meeting closest to now within its window', () => {
    const now = Date.parse('2026-11-01T12:00:00Z')
    const meetings = [meeting('old', '2026-10-31T08:00:00Z'), meeting('soon', '2026-11-01T13:00:00Z'), meeting('later', '2026-11-01T20:00:00Z')]
    expect(currentMeeting(meetings, now)?.id).toBe('soon')
    expect(currentMeeting([meeting('far', '2026-11-02T12:00:00Z')], now)).toBeNull()
  })

  it('subtracts breaks, waiting and a running pause', () => {
    const now = Date.parse('2026-11-01T18:00:00Z')
    const base = { startedAt: '2026-11-01T12:00:00Z', endedAt: null, pausedAt: null, breakMinutes: 30, waitMinutes: 15 }
    expect(workedMinutes(base, now)).toBe(360 - 45)
    expect(workedMinutes({ ...base, pausedAt: '2026-11-01T17:30:00Z' }, now)).toBe(360 - 45 - 30)
    expect(workedMinutes({ ...base, endedAt: '2026-11-01T16:00:00Z' }, now)).toBe(240 - 45)
    expect(formatMinutes(125)).toBe('2 h 05 min')
  })
})
