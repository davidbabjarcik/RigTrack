// Moje štatistiky naprieč firmami: akcie, zárobky a odpracované hodiny po firmách (len moje údaje).
import { useQuery } from '@tanstack/react-query'
import { logMinutes } from '@/features/duties/model'
import { getSupabase } from '@/lib/supabase/client'

export type MyCrewEvent = { companyId: string; startsOn: string; cancelled: boolean; declined: boolean }
export type MyPayment = { companyId: string; amount: number; date: string }
export type MyMinutes = { companyId: string; date: string; minutes: number }
export type CompanyStats = { companyId: string; events: number; eventsYear: number; earned: number; earnedYear: number; hoursYear: number }

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits

/** Súčty po firmách; „Year“ = zvolený rok. Zrušené akcie a odmietnuté pozvánky sa nerátajú, budúce akcie áno. */
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

/** Moje údaje zo všetkých firiem naraz (databáza vráti len to, čo smiem vidieť – svoje). */
export async function fetchMyStatsData(userId: string) {
  const db = getSupabase()
  const [crew, payments, logs, sessions] = await Promise.all([
    db.from('event_crew').select('company_id, event_id, response').eq('member_id', userId),
    db.from('member_payments').select('company_id, amount, happened_on').eq('member_id', userId),
    db.from('event_work_logs').select('company_id, work_date, starts_at, ends_at, break_minutes').eq('user_id', userId),
    db.from('work_sessions').select('company_id, started_at, ended_at, break_minutes, wait_minutes').eq('user_id', userId).not('ended_at', 'is', null),
  ])
  if (crew.error) throw crew.error
  const crewRows = crew.data as { company_id: string; event_id: string; response: string }[]
  const ids = [...new Set(crewRows.map((row) => row.event_id))]
  const events = ids.length > 0 ? await db.from('events').select('id, starts_on, status').in('id', ids) : { data: [], error: null }
  if (events.error) throw events.error
  const eventRows = new Map((events.data as { id: string; starts_on: string; status: string }[]).map((row) => [row.id, row]))

  const minutes: MyMinutes[] = [
    ...((logs.data ?? []) as { company_id: string; work_date: string; starts_at: string; ends_at: string; break_minutes: number }[]).map((row) => ({
      companyId: row.company_id,
      date: row.work_date,
      minutes: logMinutes({ startsAt: row.starts_at, endsAt: row.ends_at, breakMinutes: row.break_minutes }),
    })),
    // Práca na firme / doma (0080); bez migrácie sa len nezaráta.
    ...((sessions.data ?? []) as { company_id: string; started_at: string; ended_at: string; break_minutes: number; wait_minutes: number }[]).map((row) => ({
      companyId: row.company_id,
      date: row.started_at.slice(0, 10),
      minutes: Math.max(0, (Date.parse(row.ended_at) - Date.parse(row.started_at)) / 60_000 - row.break_minutes - row.wait_minutes),
    })),
  ]
  return {
    events: crewRows
      .filter((row) => eventRows.has(row.event_id))
      .map((row) => ({ companyId: row.company_id, startsOn: eventRows.get(row.event_id)!.starts_on, cancelled: eventRows.get(row.event_id)!.status === 'cancelled', declined: row.response === 'no' })),
    payments: ((payments.data ?? []) as { company_id: string; amount: number | string; happened_on: string }[]).map((row) => ({ companyId: row.company_id, amount: Number(row.amount), date: row.happened_on })),
    minutes,
  }
}

export function useMyStats(userId: string) {
  return useQuery({ queryKey: ['my-stats', userId], queryFn: () => fetchMyStatsData(userId), retry: false, staleTime: 5 * 60_000 })
}
