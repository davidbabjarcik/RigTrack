// Moje štatistiky naprieč firmami: akcie, zárobky, hodiny, jazdy a činnosti (len moje údaje).
import { useQuery } from '@tanstack/react-query'
import { logMinutes } from '@/features/duties/model'
import { getSupabase } from '@/lib/supabase/client'

export type MyCrewEvent = {
  companyId: string
  startsOn: string
  cancelled: boolean
  declined: boolean
  eventId?: string
  endsOn?: string
  client?: string
  venue?: string
}
export type MyPayment = { companyId: string; amount: number; date: string }
export type MyMinutes = { companyId: string; date: string; minutes: number; source?: 'event' | 'company' | 'home' }
export type MyDrive = { companyId: string; date: string; km: number }
export type MyDuty = { companyId: string; date: string; name: string }
export type MyStatsData = { events: MyCrewEvent[]; payments: MyPayment[]; minutes: MyMinutes[]; drives: MyDrive[]; duties: MyDuty[] }
export type CompanyStats = { companyId: string; events: number; eventsYear: number; earned: number; earnedYear: number; hoursYear: number }
/** Filter: firma ('' = všetky), rok ('' = všetky roky) a mesiac ('' = celý rok, inak '01'–'12'). */
export type MyStatsFilter = { companyId: string; year: string; month: string }
export type Ranked = { label: string; value: number }
export type MySummary = {
  events: number
  days: number
  declined: number
  hoursEvent: number
  hoursCompany: number
  hoursHome: number
  earned: number
  perEvent: number
  drives: number
  km: number
  duties: Ranked[]
  clients: Ranked[]
  venues: Ranked[]
  /** Po mesiacoch zvoleného roka (prázdne pri „všetky roky“). */
  months: { month: string; events: number; hours: number; earned: number }[]
}

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits
const DAY = 86_400_000
const daysOf = (from: string, to: string) => Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1)

/** Súčty po firmách; „Year“ = zvolené obdobie ('' = všetko). Zrušené akcie a odmietnuté pozvánky sa nerátajú, budúce akcie áno. */
export function statsByCompany(companyIds: string[], events: MyCrewEvent[], payments: MyPayment[], minutes: MyMinutes[], year: string): CompanyStats[] {
  return companyIds.map((companyId) => {
    const mine = events.filter((item) => item.companyId === companyId && !item.cancelled && !item.declined)
    const paid = payments.filter((item) => item.companyId === companyId)
    const worked = minutes.filter((item) => item.companyId === companyId && item.date.startsWith(year))
    return {
      companyId,
      events: mine.length,
      eventsYear: mine.filter((item) => item.startsOn.startsWith(year)).length,
      earned: round(paid.reduce((sum, item) => sum + item.amount, 0)),
      earnedYear: round(paid.filter((item) => item.date.startsWith(year)).reduce((sum, item) => sum + item.amount, 0)),
      hoursYear: round(worked.reduce((sum, item) => sum + item.minutes, 0) / 60, 1),
    }
  })
}

function ranked(values: string[], limit = 5): Ranked[] {
  const counts = new Map<string, number>()
  for (const value of values.map((item) => item.trim()).filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'sk'))
    .slice(0, limit)
}

/** Súhrn pre zvolený filter: akcie, dni, hodiny podľa miesta, odmeny, jazdy, činnosti, klienti a miesta. */
export function summarize(data: MyStatsData, filter: MyStatsFilter): MySummary {
  const period = filter.year ? (filter.month ? `${filter.year}-${filter.month}` : filter.year) : ''
  const inScope = (companyId: string) => !filter.companyId || companyId === filter.companyId
  const pick = <T extends { companyId: string; date: string }>(rows: T[], prefix = period) => rows.filter((row) => inScope(row.companyId) && row.date.startsWith(prefix))
  const offered = data.events.filter((item) => inScope(item.companyId) && item.startsOn.startsWith(period) && !item.cancelled)
  const events = offered.filter((item) => !item.declined)
  const minutes = pick(data.minutes)
  const drives = pick(data.drives)
  const hours = (source: NonNullable<MyMinutes['source']>) => round(minutes.filter((row) => (row.source ?? 'event') === source).reduce((sum, row) => sum + row.minutes, 0) / 60, 1)
  const earned = round(pick(data.payments).reduce((sum, row) => sum + row.amount, 0))
  const months = filter.year
    ? Array.from({ length: 12 }, (_, index) => {
        const month = `${filter.year}-${String(index + 1).padStart(2, '0')}`
        return {
          month,
          events: events.filter((item) => item.startsOn.startsWith(month)).length,
          hours: round(pick(data.minutes, month).reduce((sum, row) => sum + row.minutes, 0) / 60, 1),
          earned: round(pick(data.payments, month).reduce((sum, row) => sum + row.amount, 0)),
        }
      })
    : []
  return {
    events: events.length,
    days: events.reduce((sum, item) => sum + daysOf(item.startsOn, item.endsOn ?? item.startsOn), 0),
    declined: offered.length - events.length,
    hoursEvent: hours('event'),
    hoursCompany: hours('company'),
    hoursHome: hours('home'),
    earned,
    perEvent: events.length > 0 ? round(earned / events.length) : 0,
    drives: drives.length,
    km: round(drives.reduce((sum, row) => sum + row.km, 0), 1),
    duties: ranked(pick(data.duties).map((row) => row.name)),
    clients: ranked(events.map((item) => item.client ?? '')),
    venues: ranked(events.map((item) => item.venue ?? '')),
    months,
  }
}

type EventRow = { id: string; starts_on: string; ends_on: string; status: string; client: string; venue: string }

/** Moje údaje zo všetkých firiem naraz (databáza vráti len to, čo smiem vidieť – svoje). */
export async function fetchMyStatsData(userId: string): Promise<MyStatsData> {
  const db = getSupabase()
  const [crew, payments, logs, sessions, drives, duties] = await Promise.all([
    db.from('event_crew').select('company_id, event_id, response').eq('member_id', userId),
    db.from('member_payments').select('company_id, amount, happened_on').eq('member_id', userId),
    db.from('event_work_logs').select('company_id, work_date, starts_at, ends_at, break_minutes').eq('user_id', userId),
    db.from('work_sessions').select('company_id, place, started_at, ended_at, break_minutes, wait_minutes').eq('user_id', userId).not('ended_at', 'is', null),
    // Jazdy (0082) a činnosti (0077); bez migrácie sa len nezarátajú.
    db.from('event_drives').select('company_id, event_id, drive_date, km').eq('member_id', userId),
    db.from('event_duties').select('company_id, event_id, company_duty_types(name)').eq('member_id', userId),
  ])
  if (crew.error) throw crew.error
  const crewRows = crew.data as { company_id: string; event_id: string; response: string }[]
  const ids = [...new Set(crewRows.map((row) => row.event_id))]
  const events = ids.length > 0 ? await db.from('events').select('id, starts_on, ends_on, status, client, venue').in('id', ids) : { data: [], error: null }
  if (events.error) throw events.error
  const eventRows = new Map((events.data as EventRow[]).map((row) => [row.id, row]))

  const minutes: MyMinutes[] = [
    ...((logs.data ?? []) as { company_id: string; work_date: string; starts_at: string; ends_at: string; break_minutes: number }[]).map((row) => ({
      companyId: row.company_id,
      date: row.work_date,
      minutes: logMinutes({ startsAt: row.starts_at, endsAt: row.ends_at, breakMinutes: row.break_minutes }),
      source: 'event' as const,
    })),
    // Práca na firme / doma (0080); bez migrácie sa len nezaráta.
    ...((sessions.data ?? []) as { company_id: string; place: string; started_at: string; ended_at: string; break_minutes: number; wait_minutes: number }[]).map((row) => ({
      companyId: row.company_id,
      date: row.started_at.slice(0, 10),
      minutes: Math.max(0, (Date.parse(row.ended_at) - Date.parse(row.started_at)) / 60_000 - row.break_minutes - row.wait_minutes),
      source: (row.place === 'home' ? 'home' : 'company') as 'home' | 'company',
    })),
  ]
  type DutyRow = { company_id: string; event_id: string; company_duty_types: { name: string } | { name: string }[] | null }
  return {
    events: crewRows
      .filter((row) => eventRows.has(row.event_id))
      .map((row) => {
        const event = eventRows.get(row.event_id)!
        return {
          companyId: row.company_id,
          eventId: row.event_id,
          startsOn: event.starts_on,
          endsOn: event.ends_on,
          client: event.client,
          venue: event.venue,
          cancelled: event.status === 'cancelled',
          declined: row.response === 'no',
        }
      }),
    payments: ((payments.data ?? []) as { company_id: string; amount: number | string; happened_on: string }[]).map((row) => ({ companyId: row.company_id, amount: Number(row.amount), date: row.happened_on })),
    minutes,
    drives: ((drives.data ?? []) as { company_id: string; drive_date: string; km: number | string | null }[]).map((row) => ({ companyId: row.company_id, date: row.drive_date, km: Number(row.km ?? 0) })),
    duties: ((duties.data ?? []) as DutyRow[]).map((row) => {
      const type = Array.isArray(row.company_duty_types) ? row.company_duty_types[0] : row.company_duty_types
      return { companyId: row.company_id, date: eventRows.get(row.event_id)?.starts_on ?? '', name: type?.name ?? '' }
    }),
  }
}

export function useMyStats(userId: string) {
  return useQuery({ queryKey: ['my-stats', userId], queryFn: () => fetchMyStatsData(userId), retry: false, staleTime: 5 * 60_000 })
}
