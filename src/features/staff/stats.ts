import type { CompanyEvent } from '@/features/events/model'
import type { Payment } from '@/features/payouts/model'

/** Obdobie prehľadu: kalendárny rok („2025“) alebo posledných 12 mesiacov. */
export type Period = { id: string; label: string; from: string; to: string }

export function periods(today: string, events: Pick<CompanyEvent, 'startsOn'>[]): Period[] {
  const year = Number(today.slice(0, 4))
  const years = new Set([year, year - 1, ...events.map((event) => Number(event.startsOn.slice(0, 4)))].filter((value) => value <= year))
  const lastYear = new Date(`${today}T00:00:00Z`)
  lastYear.setUTCFullYear(lastYear.getUTCFullYear() - 1)
  return [
    { id: 'last12', label: 'Posledných 12 mesiacov', from: lastYear.toISOString().slice(0, 10), to: today },
    ...[...years].sort((a, b) => b - a).map((value) => ({ id: String(value), label: String(value), from: `${value}-01-01`, to: `${value}-12-31` })),
  ]
}

type Who = { memberId: string | null; name: string }

/** Bol človek v posádke eventu? Člen podľa účtu, brigádnik bez účtu podľa mena. */
export function wasOnEvent(event: Pick<CompanyEvent, 'crew'>, who: Who) {
  return event.crew.some((crew) => (who.memberId ? crew.memberId === who.memberId : !crew.memberId && crew.name.trim().toLowerCase() === who.name.trim().toLowerCase()))
}

const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1

/** Eventy človeka: minulé (už sa začali) od najnovších. */
export function pastEventsOf(events: CompanyEvent[], who: Who, today: string) {
  return events
    .filter((event) => event.status !== 'cancelled' && event.startsOn <= today && wasOnEvent(event, who))
    .sort((a, b) => b.startsOn.localeCompare(a.startsOn))
}

export type PersonStats = {
  /** Eventy firmy v období (bez zrušených, už začaté). */
  total: number
  attended: CompanyEvent[]
  missed: CompanyEvent[]
  /** Dni na akciách. */
  days: number
  roles: { role: string; count: number }[]
  /** Odmeny, bonusy a iné platby (bez záloh), ktoré mu patria za obdobie. */
  earned: number
  advances: number
  unpaid: number
}

export function personStats(events: CompanyEvent[], payments: Payment[], who: Who, period: Pick<Period, 'from' | 'to'>, today: string): PersonStats {
  const inPeriod = events.filter((event) => event.status !== 'cancelled' && event.startsOn >= period.from && event.startsOn <= period.to && event.startsOn <= today)
  const attended = inPeriod.filter((event) => wasOnEvent(event, who)).sort((a, b) => b.startsOn.localeCompare(a.startsOn))
  const missed = inPeriod.filter((event) => !wasOnEvent(event, who)).sort((a, b) => b.startsOn.localeCompare(a.startsOn))
  const roleCounts = new Map<string, number>()
  for (const event of attended) {
    const crew = event.crew.find((item) => (who.memberId ? item.memberId === who.memberId : item.name.trim().toLowerCase() === who.name.trim().toLowerCase()))
    const role = crew?.role.trim() || 'bez role'
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1)
  }
  const mine = who.memberId ? payments.filter((payment) => payment.memberId === who.memberId && payment.happenedOn >= period.from && payment.happenedOn <= period.to) : []
  const sum = (list: Payment[]) => Math.round(list.reduce((total, payment) => total + payment.amount, 0) * 100) / 100
  return {
    total: inPeriod.length,
    attended,
    missed,
    days: attended.reduce((total, event) => total + days(event.startsOn, event.endsOn < today ? event.endsOn : today), 0),
    roles: [...roleCounts].map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count || a.role.localeCompare(b.role, 'sk')),
    earned: sum(mine.filter((payment) => payment.kind !== 'advance')),
    advances: sum(mine.filter((payment) => payment.kind === 'advance')),
    unpaid: sum(mine.filter((payment) => !payment.paidAt)),
  }
}
