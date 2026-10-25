// Mesačný výkaz dochádzky: hodiny na firme, doma a na eventoch po ľuďoch, sadzby a navrhovaná odmena (0092).
import { useQuery } from '@tanstack/react-query'
import { logMinutes } from '@/features/duties/model'
import { getSupabase } from '@/lib/supabase/client'
import { workedMinutes } from './model'
import type { WorkSession } from './workApi'

export type Rate = { memberId: string; companyRate: number | null; homeRate: number | null; eventRate: number | null }
export type EventLog = { userId: string; eventId: string; eventName: string; workDate: string; startsAt: string; endsAt: string; breakMinutes: number }
export type MonthRow = {
  memberId: string
  companyMinutes: number
  homeMinutes: number
  eventMinutes: number
  rate: Rate
  /** Navrhovaná odmena podľa sadzieb (null = žiadna sadzba). */
  amount: number | null
}

const round2 = (value: number) => Math.round(value * 100) / 100

/** Hranice mesiaca „2026-10“ ako dátumy (od vrátane, do vylúčene). */
export function monthRange(month: string) {
  const [year, index] = month.split('-').map(Number)
  const next = index === 12 ? `${year + 1}-01` : `${year}-${String(index + 1).padStart(2, '0')}`
  return { from: `${month}-01`, to: `${next}-01` }
}

/** Súčty po ľuďoch za mesiac a navrhovaná odmena = hodiny × sadzba pre každé miesto. */
export function monthlyRows(sessions: WorkSession[], logs: EventLog[], rates: Rate[], now: number): MonthRow[] {
  const people = [...new Set([...sessions.map((item) => item.userId), ...logs.map((item) => item.userId)])]
  return people.map((memberId) => {
    const mine = sessions.filter((item) => item.userId === memberId)
    const companyMinutes = mine.filter((item) => item.place === 'company').reduce((sum, item) => sum + workedMinutes(item, now), 0)
    const homeMinutes = mine.filter((item) => item.place === 'home').reduce((sum, item) => sum + workedMinutes(item, now), 0)
    const eventMinutes = logs.filter((item) => item.userId === memberId).reduce((sum, item) => sum + logMinutes(item), 0)
    const rate = rates.find((item) => item.memberId === memberId) ?? { memberId, companyRate: null, homeRate: null, eventRate: null }
    const parts: [number, number | null][] = [
      [companyMinutes, rate.companyRate],
      [homeMinutes, rate.homeRate],
      [eventMinutes, rate.eventRate],
    ]
    const priced = parts.filter(([, value]) => value !== null)
    const amount = priced.length === 0 ? null : round2(priced.reduce((sum, [minutes, value]) => sum + (minutes / 60) * (value ?? 0), 0))
    return { memberId, companyMinutes, homeMinutes, eventMinutes, rate, amount }
  })
}

/** Poznámka k odmene: „Dochádzka 10/2026 – firma 20 h, doma 4,5 h, eventy 30 h“. */
export function rewardNote(month: string, row: MonthRow) {
  const hours = (minutes: number) => `${(Math.round((minutes / 60) * 10) / 10).toString().replace('.', ',')} h`
  const parts = [row.companyMinutes > 0 && `firma ${hours(row.companyMinutes)}`, row.homeMinutes > 0 && `doma ${hours(row.homeMinutes)}`, row.eventMinutes > 0 && `eventy ${hours(row.eventMinutes)}`].filter(Boolean)
  return `Dochádzka ${month.slice(5)}/${month.slice(0, 4)} – ${parts.join(', ')}`
}

export const monthlyKeys = {
  rates: (companyId: string) => ['company', companyId, 'member-rates'] as const,
  logs: (companyId: string, month: string) => ['company', companyId, 'event-work-logs', month] as const,
}

export async function fetchRates(companyId: string): Promise<Rate[]> {
  const { data, error } = await getSupabase().from('member_rates').select('member_id, company_rate, home_rate, event_rate').eq('company_id', companyId)
  if (error) throw error
  const num = (value: number | string | null) => (value === null ? null : Number(value))
  return (data as { member_id: string; company_rate: number | string | null; home_rate: number | string | null; event_rate: number | string | null }[]).map((row) => ({
    memberId: row.member_id,
    companyRate: num(row.company_rate),
    homeRate: num(row.home_rate),
    eventRate: num(row.event_rate),
  }))
}

export function useRates(companyId: string) {
  return useQuery({ queryKey: monthlyKeys.rates(companyId), queryFn: () => fetchRates(companyId), retry: false })
}

export async function saveRate(companyId: string, rate: Rate) {
  const { error } = await getSupabase()
    .from('member_rates')
    .upsert({ company_id: companyId, member_id: rate.memberId, company_rate: rate.companyRate, home_rate: rate.homeRate, event_rate: rate.eventRate, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function fetchEventLogs(companyId: string, month: string): Promise<EventLog[]> {
  const { from, to } = monthRange(month)
  const { data, error } = await getSupabase()
    .from('event_work_logs')
    .select('user_id, event_id, work_date, starts_at, ends_at, break_minutes, events(name)')
    .eq('company_id', companyId)
    .gte('work_date', from)
    .lt('work_date', to)
  if (error) throw error
  type Row = { user_id: string; event_id: string; work_date: string; starts_at: string; ends_at: string; break_minutes: number; events: { name: string } | { name: string }[] | null }
  return (data as Row[]).map((row) => ({
    userId: row.user_id,
    eventId: row.event_id,
    eventName: (Array.isArray(row.events) ? row.events[0]?.name : row.events?.name) ?? 'Event',
    workDate: row.work_date,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    breakMinutes: row.break_minutes,
  }))
}
