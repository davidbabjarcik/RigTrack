import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import type { ScheduleFields, ScheduleItem, ScheduleKind } from './model'

export const scheduleKeys = { ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'schedule'] as const }

type Row = { id: string; day: string; starts_at: string; ends_at: string | null; stage: string; kind: ScheduleKind; title: string; note: string }
const hhmm = (value: string | null) => (value ?? '').slice(0, 5)

/** Harmonogram akcie; bez migrácie 0203 null. */
export async function fetchSchedule(companyId: string, eventId: string): Promise<ScheduleItem[] | null> {
  const { data, error } = await getSupabase().from('event_schedule_items').select('id, day, starts_at, ends_at, stage, kind, title, note').eq('company_id', companyId).eq('event_id', eventId).order('day').order('starts_at')
  if (error) return null
  return (data as Row[]).map((row) => ({ id: row.id, day: row.day, startsAt: hhmm(row.starts_at), endsAt: hhmm(row.ends_at), stage: row.stage, kind: row.kind, title: row.title, note: row.note }))
}

export function useSchedule(companyId: string, eventId: string) {
  return useQuery({ queryKey: scheduleKeys.ofEvent(companyId, eventId), queryFn: () => fetchSchedule(companyId, eventId), retry: false })
}

const toRow = (fields: ScheduleFields) => ({ day: fields.day, starts_at: fields.startsAt, ends_at: fields.endsAt || null, stage: fields.stage.trim(), kind: fields.kind, title: fields.title.trim(), note: fields.note.trim() })

export async function saveScheduleItem(companyId: string, eventId: string, id: string | null, fields: ScheduleFields) {
  const table = getSupabase().from('event_schedule_items')
  const { error } = id ? await table.update(toRow(fields)).eq('id', id) : await table.insert({ ...toRow(fields), company_id: companyId, event_id: eventId })
  if (error) throw error
}

/** Uloží verziu harmonogramu (snímka pre zdieľanie); vráti číslo verzie. */
export async function saveScheduleVersion(eventId: string): Promise<number> {
  const { data, error } = await getSupabase().rpc('save_schedule_version', { _event_id: eventId })
  if (error) throw error
  return data as number
}

export async function fetchScheduleVersionCount(companyId: string, eventId: string): Promise<number> {
  const { count, error } = await getSupabase().from('doc_versions').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('doc_type', 'schedule').eq('doc_id', eventId)
  if (error) return 0
  return count ?? 0
}

export async function deleteScheduleItem(id: string) {
  const { error } = await getSupabase().from('event_schedule_items').delete().eq('id', id)
  if (error) throw error
}
