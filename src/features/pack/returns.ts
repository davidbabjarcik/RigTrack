import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

/** Zápis z pack listu naprieč eventmi (naložené / vrátené). */
export type PackMark = { eventId: string; equipmentId: string | null; caseId: string | null; phase: 'out' | 'back'; checkedAt: string; checkedByName: string }

export const returnKeys = {
  recent: (companyId: string) => ['company', companyId, 'pack-returns'] as const,
}

const WINDOW_DAYS = 120

/** Naložené a vrátené za posledné mesiace (stačí na „ešte vonku“ aj na „po vrátení skontrolovať“). */
export async function fetchRecentPackMarks(companyId: string): Promise<PackMark[]> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString()
  const { data, error } = await getSupabase()
    .from('event_pack_checks')
    .select('event_id, equipment_id, case_id, phase, checked_at, checked_by_name')
    .eq('company_id', companyId)
    .gte('checked_at', since)
    .order('checked_at', { ascending: false })
    .limit(5000)
  if (error) return []
  type Row = { event_id: string; equipment_id: string | null; case_id: string | null; phase: 'out' | 'back'; checked_at: string; checked_by_name: string }
  return (data as Row[]).map((row) => ({ eventId: row.event_id, equipmentId: row.equipment_id, caseId: row.case_id, phase: row.phase, checkedAt: row.checked_at, checkedByName: row.checked_by_name }))
}

export function useRecentPackMarks(companyId: string, enabled = true) {
  return useQuery({ queryKey: returnKeys.recent(companyId), queryFn: () => fetchRecentPackMarks(companyId), enabled, retry: false, staleTime: 60_000 })
}

/** Posledné vrátenie každého case z eventu (case id → kedy a z ktorého eventu). */
export function lastReturns(marks: PackMark[]) {
  const result = new Map<string, PackMark>()
  for (const mark of marks) {
    if (mark.phase !== 'back' || !mark.caseId) continue
    const known = result.get(mark.caseId)
    if (!known || known.checkedAt < mark.checkedAt) result.set(mark.caseId, mark)
  }
  return result
}

/** Case sa vrátil z eventu a odvtedy nikto neskontroloval jeho obsah (napr. nespočítaná káblovka). */
export function returnedUnchecked(returned: PackMark | undefined, lastCheckAt: string | null | undefined) {
  if (!returned) return false
  return !lastCheckAt || lastCheckAt < returned.checkedAt
}

type EventLike = { id: string; name: string; endsOn: string; status: string }

/**
 * Ešte vonku: z eventov, ktoré už skončili, bolo naložené, ale nie vrátené.
 * Zoskupené po eventoch, najstaršie hore.
 */
export function stillOut(marks: PackMark[], events: EventLike[], today: string) {
  const ended = new Map(events.filter((event) => event.endsOn < today && event.status !== 'cancelled').map((event) => [event.id, event]))
  const key = (mark: PackMark) => `${mark.eventId}|${mark.caseId ?? ''}|${mark.equipmentId ?? ''}`
  const back = new Set(marks.filter((mark) => mark.phase === 'back').map(key))
  const groups = new Map<string, { event: EventLike; items: PackMark[] }>()
  for (const mark of marks) {
    const event = ended.get(mark.eventId)
    if (!event || mark.phase !== 'out' || back.has(key(mark))) continue
    const group = groups.get(event.id) ?? { event, items: [] }
    if (!group.items.some((item) => key(item) === key(mark))) group.items.push(mark)
    groups.set(event.id, group)
  }
  return [...groups.values()].sort((a, b) => a.event.endsOn.localeCompare(b.event.endsOn))
}
