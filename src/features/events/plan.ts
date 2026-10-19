// Viacdňový event: program po dňoch, doprava a osobný výkaz.

export const DAY_KINDS = ['build', 'show', 'teardown', 'travel', 'rest'] as const
export type DayKind = (typeof DAY_KINDS)[number]

export const DAY_KIND_LABELS: Record<DayKind, string> = {
  build: 'Stavba',
  show: 'Event',
  teardown: 'Balenie',
  travel: 'Cesta',
  rest: 'Voľno',
}

export type EventDay = { id: string; day: string; kind: DayKind; startsAt: string; endsAt: string; note: string }

export const LINK_TAGS = ['rider', 'lightplot', 'stageplot', 'tech', 'contract', 'photos', 'other'] as const
export type LinkTag = (typeof LINK_TAGS)[number]
export const LINK_TAG_LABELS: Record<LinkTag, string> = {
  rider: 'Rider',
  lightplot: 'Lightplot',
  stageplot: 'Stage plot',
  tech: 'Technické info',
  contract: 'Zmluva / ponuka',
  photos: 'Fotky',
  other: 'Iné',
}
export type EventLink = { id: string; url: string; title: string; tag: LinkTag }

export const STAYS = ['home', 'venue', 'elsewhere'] as const
export type Stay = (typeof STAYS)[number]
export const STAY_LABELS: Record<Stay, string> = { home: 'Domov', venue: 'Spali sme na akcii', elsewhere: 'Spali sme inde' }
export type TravelDay = { id: string; date: string; vehicles: number; roundTrips: number; stay: Stay; stayPlace: string; extraKm: number; note: string }

export const EXPENSE_CATEGORIES = ['fuel', 'food', 'accommodation', 'parking', 'material', 'other'] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]
export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  fuel: 'Palivo',
  food: 'Jedlo',
  accommodation: 'Ubytovanie',
  parking: 'Parkovanie / diaľnica',
  material: 'Materiál',
  other: 'Iné',
}
export type WorkLog = { id: string; userId: string; date: string; startsAt: string; endsAt: string; breakMinutes: number; note: string }
export type Expense = { id: string; userId: string; date: string; amount: number; category: ExpenseCategory; place: string; note: string }

const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Všetky dni eventu od–do vrátane. */
export function eventDates(startsOn: string, endsOn: string) {
  const dates: string[] = []
  for (let day = startsOn; day <= endsOn && dates.length < 60; day = addDays(day, 1)) dates.push(day)
  return dates
}

/** Ide človek v daný deň? Prázdny zoznam dní = všetky dni. */
export function onDay(days: string[], date: string) {
  return days.length === 0 || days.includes(date)
}

/** Km za deň: tam a späť × otočky × autá + navyše. */
export function dayKm(distanceKm: number | null, travel: Pick<TravelDay, 'vehicles' | 'roundTrips' | 'extraKm'>) {
  return Math.round(((distanceKm ?? 0) * 2 * travel.roundTrips * travel.vehicles + travel.extraKm) * 10) / 10
}

export function totalKm(distanceKm: number | null, travel: Pick<TravelDay, 'vehicles' | 'roundTrips' | 'extraKm'>[]) {
  return Math.round(travel.reduce((sum, day) => sum + dayKm(distanceKm, day), 0) * 10) / 10
}

const minutesOf = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/** Odpracované minúty: od–do (aj cez polnoc) mínus prestávky. */
export function workedMinutes(log: Pick<WorkLog, 'startsAt' | 'endsAt' | 'breakMinutes'>) {
  let span = minutesOf(log.endsAt) - minutesOf(log.startsAt)
  if (span < 0) span += 24 * 60
  return Math.max(0, span - log.breakMinutes)
}

/** 645 → „10 h 45 min“ */
export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}
