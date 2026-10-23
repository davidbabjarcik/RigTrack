// Činnosti pri evente (nakladanie, vykladanie, kontrola hliníka, kabeláže…) a z nich štatistiky.
import type { Ranked } from '@/features/stats/model'

export type DutyType = { id: string; name: string; sort: number; active: boolean }
export type EventDuty = { id: string; eventId: string; dutyTypeId: string; memberId: string | null; personName: string }
export type WorkLog = { userId: string; workDate: string; startsAt: string; endsAt: string; breakMinutes: number }

/** Návrh činností pre firmu, ktorá ešte žiadne nemá. */
export const DEFAULT_DUTIES = ['Nakladanie', 'Vykladanie', 'Kontrola a naskladnenie hliníka', 'Kontrola kabeláže']

/** Kľúč človeka: člen podľa účtu, externista podľa mena (bez ohľadu na veľké písmená). */
export const personKey = (duty: Pick<EventDuty, 'memberId' | 'personName'>) => duty.memberId ?? `ext:${duty.personName.trim().toLowerCase()}`

/** Minúty jedného záznamu výkazu: od–do (aj cez polnoc) mínus prestávka. */
export function logMinutes(log: Pick<WorkLog, 'startsAt' | 'endsAt' | 'breakMinutes'>) {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }
  let span = toMinutes(log.endsAt) - toMinutes(log.startsAt)
  if (span <= 0) span += 24 * 60
  return Math.max(0, span - log.breakMinutes)
}

const inYear = (date: string, year: string) => year === 'all' || date.startsWith(year)

/** Odpracované hodiny po ľuďoch v roku (z výkazov času), od najviac. */
export function hoursByPerson(logs: WorkLog[], year: string, nameOf: (userId: string) => string, limit = 10): Ranked[] {
  const totals = new Map<string, number>()
  for (const log of logs) if (inYear(log.workDate, year)) totals.set(log.userId, (totals.get(log.userId) ?? 0) + logMinutes(log))
  return [...totals]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([userId, minutes]) => ({ id: userId, label: nameOf(userId), value: Math.round((minutes / 60) * 10) / 10 }))
}

/** Koľkokrát kto robil danú činnosť (na koľkých eventoch) v roku podľa začiatku eventu, od najviac. */
export function dutyRanking(
  duties: EventDuty[],
  dutyTypeId: string,
  eventStart: (eventId: string) => string | undefined,
  year: string,
  nameOf: (duty: EventDuty) => string,
  limit = 8,
): Ranked[] {
  const totals = new Map<string, { label: string; count: number }>()
  for (const duty of duties) {
    if (duty.dutyTypeId !== dutyTypeId) continue
    const start = eventStart(duty.eventId)
    if (!start || !inYear(start, year)) continue
    const key = personKey(duty)
    const current = totals.get(key) ?? { label: nameOf(duty), count: 0 }
    current.count += 1
    totals.set(key, current)
  }
  return [...totals]
    .sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label, 'sk'))
    .slice(0, limit)
    .map(([key, value]) => ({ id: key, label: value.label, value: value.count }))
}
