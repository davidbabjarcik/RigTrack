import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import type { DutyType, EventDuty, WorkLog } from './model'

export const dutyKeys = {
  types: (companyId: string) => ['company', companyId, 'duty-types'] as const,
  ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'duties'] as const,
  all: (companyId: string) => ['company', companyId, 'duties'] as const,
  workLogs: (companyId: string) => ['company', companyId, 'work-logs'] as const,
}

export async function fetchDutyTypes(companyId: string): Promise<DutyType[]> {
  const { data, error } = await getSupabase().from('company_duty_types').select('id, name, sort, active').eq('company_id', companyId).order('sort').order('name')
  if (error) throw error
  return data as DutyType[]
}

export function useDutyTypes(companyId: string) {
  return useQuery({ queryKey: dutyKeys.types(companyId), queryFn: () => fetchDutyTypes(companyId), retry: false })
}

export async function addDutyTypes(companyId: string, names: string[], firstSort: number) {
  const { error } = await getSupabase()
    .from('company_duty_types')
    .insert(names.map((name, index) => ({ company_id: companyId, name: name.trim(), sort: firstSort + index })))
  if (error) throw error
}

export async function updateDutyType(id: string, fields: Partial<Pick<DutyType, 'name' | 'sort' | 'active'>>) {
  const { error } = await getSupabase().from('company_duty_types').update(fields).eq('id', id)
  if (error) throw error
}

export async function deleteDutyType(id: string) {
  const { error } = await getSupabase().from('company_duty_types').delete().eq('id', id)
  if (error) throw error
}

type DutyRow = { id: string; event_id: string; duty_type_id: string; member_id: string | null; person_name: string }
const toDuty = (row: DutyRow): EventDuty => ({ id: row.id, eventId: row.event_id, dutyTypeId: row.duty_type_id, memberId: row.member_id, personName: row.person_name })
const DUTY_COLUMNS = 'id, event_id, duty_type_id, member_id, person_name'

export async function fetchEventDuties(companyId: string, eventId: string) {
  const { data, error } = await getSupabase().from('event_duties').select(DUTY_COLUMNS).eq('company_id', companyId).eq('event_id', eventId).order('created_at')
  if (error) throw error
  return (data as DutyRow[]).map(toDuty)
}

export function useEventDuties(companyId: string, eventId: string) {
  return useQuery({ queryKey: dutyKeys.ofEvent(companyId, eventId), queryFn: () => fetchEventDuties(companyId, eventId), retry: false })
}

export async function addDuty(companyId: string, eventId: string, dutyTypeId: string, person: { memberId: string } | { name: string }) {
  const { error } = await getSupabase()
    .from('event_duties')
    .insert({
      company_id: companyId,
      event_id: eventId,
      duty_type_id: dutyTypeId,
      ...('memberId' in person ? { member_id: person.memberId } : { person_name: person.name.trim() }),
    })
  if (error && error.code !== '23505') throw error
}

export async function removeDuty(id: string) {
  const { error } = await getSupabase().from('event_duties').delete().eq('id', id)
  if (error) throw error
}

// Supabase vráti najviac 1000 riadkov naraz, preto sa načítava po stranách.
async function allPages<T>(query: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const page = 1000
  const rows: T[] = []
  for (let from = 0; ; from += page) {
    const { data, error } = await query(from, from + page - 1)
    if (error) throw error
    const chunk = data as T[]
    rows.push(...chunk)
    if (chunk.length < page) return rows
  }
}

/** Všetky zápisy činností firmy (pre štatistiky). */
export async function fetchAllDuties(companyId: string) {
  const rows = await allPages<DutyRow>((from, to) => getSupabase().from('event_duties').select(DUTY_COLUMNS).eq('company_id', companyId).order('id').range(from, to))
  return rows.map(toDuty)
}

/** Výkazy času firmy (admin vidí všetky, ostatní svoje – rozhoduje databáza). */
export async function fetchWorkLogs(companyId: string): Promise<WorkLog[]> {
  const rows = await allPages<{ user_id: string; work_date: string; starts_at: string; ends_at: string; break_minutes: number }>((from, to) =>
    getSupabase().from('event_work_logs').select('user_id, work_date, starts_at, ends_at, break_minutes').eq('company_id', companyId).order('id').range(from, to),
  )
  return rows.map((row) => ({ userId: row.user_id, workDate: row.work_date, startsAt: row.starts_at, endsAt: row.ends_at, breakMinutes: row.break_minutes }))
}
