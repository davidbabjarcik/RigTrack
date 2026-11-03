import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

/** Zápis z pack listu naprieč eventmi (naložené / vrátené). */
export type PackMark = { eventId: string; equipmentId: string | null; caseId: string | null; phase: 'out' | 'back'; checkedAt: string; checkedByName: string }

export const returnKeys = {
  recent: (companyId: string) => ['company', companyId, 'pack-returns'] as const,
  closed: (companyId: string) => ['company', companyId, 'event-returns'] as const,
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
export function stillOut(marks: PackMark[], events: EventLike[], today: string, closed: Set<string> = new Set()) {
  // Uzavreté vrátenie (čo chýbalo, je nahlásené) už nesvieti.
  const ended = new Map(events.filter((event) => event.endsOn < today && event.status !== 'cancelled' && !closed.has(event.id)).map((event) => [event.id, event]))
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

/** Uzavreté vrátenie eventu: kto, kedy a čo pri tom chýbalo (0145). */
export type EventReturn = { eventId: string; closedAt: string; closedByName: string; missing: string[] }

/** Uzavreté vrátenia firmy; bez migrácie 0145 prázdne. */
export async function fetchEventReturns(companyId: string): Promise<EventReturn[]> {
  const { data, error } = await getSupabase().from('event_returns').select('event_id, closed_at, closed_by_name, missing').eq('company_id', companyId)
  if (error) return []
  type Row = { event_id: string; closed_at: string; closed_by_name: string; missing: unknown }
  return (data as Row[]).map((row) => ({
    eventId: row.event_id,
    closedAt: row.closed_at,
    closedByName: row.closed_by_name,
    missing: Array.isArray(row.missing) ? row.missing.filter((name): name is string => typeof name === 'string') : [],
  }))
}

export function useEventReturns(companyId: string, enabled = true) {
  return useQuery({ queryKey: returnKeys.closed(companyId), queryFn: () => fetchEventReturns(companyId), enabled, retry: false, staleTime: 60_000 })
}

const migrationHint = (error: { message: string }) =>
  /close_event_return|reopen_event_return|event_returns/.test(error.message) ? new Error('Uzavretie vrátenia ešte databáza nepozná – spustite migráciu 0145 (supabase/update-all.sql).') : error

/** Uzavrie vrátenie: uloží, čo chýbalo (názvy), a kto to uzavrel. */
export async function closeEventReturn(eventId: string, missing: string[]) {
  const { error } = await getSupabase().rpc('close_event_return', { _event_id: eventId, _missing: missing.slice(0, 500).map((name) => name.slice(0, 200)) })
  if (error) throw migrationHint(error)
}

export async function reopenEventReturn(eventId: string) {
  const { error } = await getSupabase().rpc('reopen_event_return', { _event_id: eventId })
  if (error) throw migrationHint(error)
}
