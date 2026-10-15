import type { CompanyEvent } from '@/features/events/model'
import type { Ranked } from './model'

// Peniaze v štatistikách: príjmy firmy z akcií, odmeny členom a zárobky jedného človeka.
// Ktoré čísla kto uvidí, rozhoduje databáza: bez oprávnenia sem príjmy firmy ani cudzie odmeny neprídu.

export type Amount = { date: string; amount: number }
export type MemberPayment = { memberId: string; amount: number; happenedOn: string; eventId: string | null; paidAt: string | null }

const round = (value: number) => Math.round(value * 100) / 100
const MONTHS = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december']

/** Rok „all“ = všetko, inak len záznamy z daného roka (YYYY). */
export const inYear = (date: string, year: string) => year === 'all' || date.startsWith(year)

/** Roky, v ktorých niečo je, od najnovšieho. */
export function moneyYears(dates: string[]) {
  return [...new Set(dates.map((date) => date.slice(0, 4)))].sort().reverse()
}

function ranked(totals: Map<string, number>, label: (key: string) => string, limit: number): Ranked[] {
  return [...totals.entries()]
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, value]) => ({ id: key, label: label(key), value: round(value) }))
}

/** Súčty po mesiacoch, od najväčšieho: „október 2026“. */
export function byMonth(items: Amount[], limit = 12): Ranked[] {
  const totals = new Map<string, number>()
  for (const item of items) totals.set(item.date.slice(0, 7), (totals.get(item.date.slice(0, 7)) ?? 0) + item.amount)
  return ranked(totals, (key) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`, limit)
}

/** Súčty po rokoch, od najväčšieho. */
export function byYear(items: Amount[], limit = 10): Ranked[] {
  const totals = new Map<string, number>()
  for (const item of items) totals.set(item.date.slice(0, 4), (totals.get(item.date.slice(0, 4)) ?? 0) + item.amount)
  return ranked(totals, (key) => key, limit)
}

export const NO_EVENT = 'Mimo eventov'
export const NO_ROLE = 'Bez role'

/**
 * Odmeny podľa role, v ktorej človek na evente bol (z posádky eventu): osvetľovač, zvukár…
 * Rovnaká rola napísaná inak (veľké písmená, medzery) sa zráta spolu.
 */
export function byRole(payments: MemberPayment[], events: Pick<CompanyEvent, 'id' | 'crew'>[], limit = 8): Ranked[] {
  const totals = new Map<string, number>()
  const labels = new Map<string, string>()
  for (const payment of payments) {
    let role = NO_EVENT
    if (payment.eventId) {
      const crew = events.find((event) => event.id === payment.eventId)?.crew.find((person) => person.memberId === payment.memberId)
      role = crew?.role.trim() || NO_ROLE
    }
    const key = role.toLowerCase().replace(/\s+/g, ' ')
    if (!labels.has(key)) labels.set(key, role)
    totals.set(key, (totals.get(key) ?? 0) + payment.amount)
  }
  return ranked(totals, (key) => labels.get(key) ?? key, limit)
}

export const sum = (items: { amount: number }[]) => round(items.reduce((total, item) => total + item.amount, 0))
