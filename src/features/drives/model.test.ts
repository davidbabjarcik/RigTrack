import { describe, expect, it } from 'vitest'
import { driverRanking, suggestedKm, type Drive } from './model'

const drive = (id: string, date: string, memberId: string | null, km: number | null, driverName = '') =>
  ({ id, eventId: 'e', date, vehicleId: null, memberId, driverName, direction: 'both', route: '', km }) as Drive

describe('drives', () => {
  it('suggests km from the distance', () => {
    expect(suggestedKm(42, 'both')).toBe(84)
    expect(suggestedKm(42.25, 'there')).toBe(42.3)
    expect(suggestedKm(null, 'back')).toBeNull()
  })

  it('ranks drivers by km in a year, externals by name', () => {
    const drives = [drive('1', '2026-01-01', 'jano', 100), drive('2', '2026-02-01', 'jano', 50), drive('3', '2026-03-01', null, 200, 'Peter'), drive('4', '2026-04-01', null, null, 'peter '), drive('5', '2025-12-31', 'jano', 999)]
    expect(driverRanking(drives, '2026', (item) => item.memberId ?? item.driverName.trim())).toEqual([
      { id: 'ext:peter', label: 'Peter', value: 200, drives: 2 },
      { id: 'jano', label: 'jano', value: 150, drives: 2 },
    ])
  })
})
