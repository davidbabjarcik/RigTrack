// Kto šoféroval pri eventoch: jazdy, kilometre a rebríček šoférov.
import type { Ranked } from '@/features/stats/model'

export const DIRECTIONS = ['there', 'back', 'both'] as const
export type Direction = (typeof DIRECTIONS)[number]
export const DIRECTION_LABELS: Record<Direction, string> = { there: 'tam', back: 'späť', both: 'tam aj späť' }

export type Drive = {
  id: string
  eventId: string
  date: string
  vehicleId: string | null
  memberId: string | null
  driverName: string
  direction: Direction
  route: string
  km: number | null
}

/** Km jazdy podľa vzdialenosti zo skladu na akciu: jedným smerom, alebo tam aj späť. */
export const suggestedKm = (distanceKm: number | null, direction: Direction) => (distanceKm === null ? null : Math.round(distanceKm * (direction === 'both' ? 2 : 1) * 10) / 10)

export const driverKey = (drive: Pick<Drive, 'memberId' | 'driverName'>) => drive.memberId ?? `ext:${drive.driverName.trim().toLowerCase()}`

/** Šoféri v roku podľa najazdených km (a počtu jázd), od najviac. */
export function driverRanking(drives: Drive[], year: string, nameOf: (drive: Drive) => string, limit = 8): (Ranked & { drives: number })[] {
  const totals = new Map<string, { label: string; km: number; drives: number }>()
  for (const drive of drives) {
    if (year !== 'all' && !drive.date.startsWith(year)) continue
    const key = driverKey(drive)
    const current = totals.get(key) ?? { label: nameOf(drive), km: 0, drives: 0 }
    current.km += drive.km ?? 0
    current.drives += 1
    totals.set(key, current)
  }
  return [...totals]
    .sort((a, b) => b[1].km - a[1].km || b[1].drives - a[1].drives)
    .slice(0, limit)
    .map(([key, value]) => ({ id: key, label: value.label, value: Math.round(value.km * 10) / 10, drives: value.drives }))
}
