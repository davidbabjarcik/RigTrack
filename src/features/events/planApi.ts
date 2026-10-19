import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import type { DayKind, EventDay, EventLink, Expense, ExpenseCategory, LinkTag, Stay, TravelDay, WorkLog } from './plan'

export const planKeys = {
  days: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'days'] as const,
  links: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'links'] as const,
  travel: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'travel'] as const,
  place: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'place'] as const,
  logs: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'logs'] as const,
}

const hhmm = (value: string | null) => (value ?? '').slice(0, 5)
const db = () => getSupabase()
const check = <T,>(result: { data: T | null; error: unknown }) => {
  if (result.error) throw result.error
  return result.data as T
}

// --- Program po dňoch ---

export async function fetchDays(companyId: string, eventId: string): Promise<EventDay[]> {
  const rows = check(await db().from('event_days').select('id, day, kind, starts_at, ends_at, note').eq('company_id', companyId).eq('event_id', eventId).order('day')) as {
    id: string
    day: string
    kind: DayKind
    starts_at: string | null
    ends_at: string | null
    note: string
  }[]
  return rows.map((row) => ({ id: row.id, day: row.day, kind: row.kind, startsAt: hhmm(row.starts_at), endsAt: hhmm(row.ends_at), note: row.note }))
}

export function useEventDays(companyId: string, eventId: string) {
  return useQuery({ queryKey: planKeys.days(companyId, eventId), queryFn: () => fetchDays(companyId, eventId), retry: false })
}

/** Uloží deň (nový alebo zmenený); prázdny deň bez druhu sa nezapisuje. */
export async function saveDay(companyId: string, eventId: string, day: Omit<EventDay, 'id'> & { id?: string }) {
  const fields = { kind: day.kind, starts_at: day.startsAt || null, ends_at: day.endsAt || null, note: day.note.trim() }
  if (day.id) check(await db().from('event_days').update(fields).eq('id', day.id).select('id'))
  else check(await db().from('event_days').insert({ ...fields, company_id: companyId, event_id: eventId, day: day.day }).select('id'))
}

export async function deleteDay(id: string) {
  check(await db().from('event_days').delete().eq('id', id).select('id'))
}

export async function setCrewDays(crewId: string, days: string[]) {
  check(await db().from('event_crew').update({ days }).eq('id', crewId).select('id'))
}

/** Dni posádky (stĺpec z 0059); bez migrácie prázdne. */
export async function fetchCrewDays(companyId: string, eventId: string): Promise<Record<string, string[]>> {
  const rows = check(await db().from('event_crew').select('id, days').eq('company_id', companyId).eq('event_id', eventId)) as { id: string; days: string[] }[]
  return Object.fromEntries(rows.map((row) => [row.id, row.days ?? []]))
}

// --- Odkazy ---

export async function fetchLinks(companyId: string, eventId: string): Promise<EventLink[]> {
  return check(await db().from('event_links').select('id, url, title, tag').eq('company_id', companyId).eq('event_id', eventId).order('created_at')) as EventLink[]
}

export async function addLink(companyId: string, eventId: string, link: { url: string; title: string; tag: LinkTag }) {
  check(await db().from('event_links').insert({ company_id: companyId, event_id: eventId, url: link.url.trim(), title: link.title.trim(), tag: link.tag }).select('id'))
}

export async function deleteLink(id: string) {
  check(await db().from('event_links').delete().eq('id', id).select('id'))
}

// --- Doprava ---

export async function fetchPlace(companyId: string, eventId: string): Promise<{ address: string; distanceKm: number | null }> {
  const row = check(await db().from('events').select('address, distance_km').eq('company_id', companyId).eq('id', eventId).single()) as { address: string; distance_km: number | string | null }
  return { address: row.address, distanceKm: row.distance_km === null ? null : Number(row.distance_km) }
}

export async function savePlace(companyId: string, eventId: string, address: string, distanceKm: number | null) {
  check(await db().from('events').update({ address: address.trim(), distance_km: distanceKm }).eq('company_id', companyId).eq('id', eventId).select('id'))
}

export async function fetchTravel(companyId: string, eventId: string): Promise<TravelDay[]> {
  const rows = check(
    await db().from('event_travel').select('id, travel_date, vehicles, round_trips, stay, stay_place, extra_km, note').eq('company_id', companyId).eq('event_id', eventId).order('travel_date'),
  ) as { id: string; travel_date: string; vehicles: number; round_trips: number; stay: Stay; stay_place: string; extra_km: number | string; note: string }[]
  return rows.map((row) => ({
    id: row.id,
    date: row.travel_date,
    vehicles: row.vehicles,
    roundTrips: row.round_trips,
    stay: row.stay,
    stayPlace: row.stay_place,
    extraKm: Number(row.extra_km),
    note: row.note,
  }))
}

export async function saveTravel(companyId: string, eventId: string, day: Omit<TravelDay, 'id'> & { id?: string }) {
  const fields = { vehicles: day.vehicles, round_trips: day.roundTrips, stay: day.stay, stay_place: day.stayPlace.trim(), extra_km: day.extraKm, note: day.note.trim() }
  if (day.id) check(await db().from('event_travel').update(fields).eq('id', day.id).select('id'))
  else check(await db().from('event_travel').insert({ ...fields, company_id: companyId, event_id: eventId, travel_date: day.date }).select('id'))
}

export async function deleteTravel(id: string) {
  check(await db().from('event_travel').delete().eq('id', id).select('id'))
}

// --- Osobný výkaz ---

export async function fetchLogs(companyId: string, eventId: string): Promise<{ work: WorkLog[]; expenses: Expense[] }> {
  const [work, expenses] = await Promise.all([
    db().from('event_work_logs').select('id, user_id, work_date, starts_at, ends_at, break_minutes, note').eq('company_id', companyId).eq('event_id', eventId).order('work_date'),
    db().from('event_expenses').select('id, user_id, spent_on, amount, category, place, note').eq('company_id', companyId).eq('event_id', eventId).order('spent_on'),
  ])
  const workRows = check(work) as { id: string; user_id: string; work_date: string; starts_at: string; ends_at: string; break_minutes: number; note: string }[]
  const expenseRows = check(expenses) as { id: string; user_id: string; spent_on: string; amount: number | string; category: ExpenseCategory; place: string; note: string }[]
  return {
    work: workRows.map((row) => ({ id: row.id, userId: row.user_id, date: row.work_date, startsAt: hhmm(row.starts_at), endsAt: hhmm(row.ends_at), breakMinutes: row.break_minutes, note: row.note })),
    expenses: expenseRows.map((row) => ({ id: row.id, userId: row.user_id, date: row.spent_on, amount: Number(row.amount), category: row.category, place: row.place, note: row.note })),
  }
}

export async function addWorkLog(companyId: string, eventId: string, log: Omit<WorkLog, 'id' | 'userId'>) {
  check(
    await db()
      .from('event_work_logs')
      .insert({ company_id: companyId, event_id: eventId, work_date: log.date, starts_at: log.startsAt, ends_at: log.endsAt, break_minutes: log.breakMinutes, note: log.note.trim() })
      .select('id'),
  )
}

export async function addExpense(companyId: string, eventId: string, expense: Omit<Expense, 'id' | 'userId'>) {
  check(
    await db()
      .from('event_expenses')
      .insert({ company_id: companyId, event_id: eventId, spent_on: expense.date, amount: expense.amount, category: expense.category, place: expense.place.trim(), note: expense.note.trim() })
      .select('id'),
  )
}

export async function deleteWorkLog(id: string) {
  check(await db().from('event_work_logs').delete().eq('id', id).select('id'))
}

export async function deleteExpense(id: string) {
  check(await db().from('event_expenses').delete().eq('id', id).select('id'))
}
