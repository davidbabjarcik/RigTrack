import { serviceState, type Equipment } from '@/features/equipment/model'
import { EVENT_STATUS_LABELS, isLive, type CompanyEvent } from '@/features/events/model'
import { isOpen, LOAN_STATUS_LABELS, type Loan } from '@/features/loans/model'
import type { ShoppingItem } from '@/features/shopping/model'
import type { Task } from '@/features/tasks/model'
import { vehicleDeadlines, type Vehicle } from '@/features/vehicles/model'
import { upcomingCelebrations, type Celebration } from '@/features/staff/celebrations'
import type { Person } from '@/features/staff/model'

// Kalendár je odvodený pohľad: nič sa doň nezapisuje, skladá sa z termínov ostatných modulov.

export const ENTRY_KINDS = ['event', 'loan', 'vehicle', 'task', 'service', 'shopping', 'celebration'] as const
export type EntryKind = (typeof ENTRY_KINDS)[number]

export const ENTRY_KIND_LABELS: Record<EntryKind, string> = {
  event: 'Eventy',
  loan: 'Výpožičky',
  vehicle: 'Vozidlá',
  task: 'Úlohy',
  service: 'Servis techniky',
  shopping: 'Nákupy',
  celebration: 'Narodeniny a meniny',
}

export type AgendaEntry = {
  id: string
  date: string
  kind: EntryKind
  title: string
  detail: string
  /** Kam vedie kliknutie. */
  to: string
}

export type AgendaSources = {
  events: CompanyEvent[]
  loans: Loan[]
  vehicles: Vehicle[]
  tasks: Task[]
  equipment: Equipment[]
  shopping: ShoppingItem[]
  /** Ľudia z tímu (narodeniny a meniny); nepovinné. */
  people?: Person[]
}

/** Všetky nevybavené termíny zo všetkých modulov, zoradené podľa dátumu. */
export function buildAgenda(sources: AgendaSources, today: string): AgendaEntry[] {
  const entries: AgendaEntry[] = []

  for (const event of sources.events.filter(isLive)) {
    const detail = [event.venue, event.endsOn > event.startsOn && `do ${event.endsOn.split('-').reverse().map(Number).join('. ')}`]
      .filter(Boolean)
      .join(' · ')
    // Prebiehajúci viacdňový event patrí k dnešku, nie medzi veci po termíne.
    const running = event.startsOn < today && event.endsOn >= today
    entries.push({
      id: `event-${event.id}`,
      date: running ? today : event.startsOn,
      kind: 'event',
      title: event.name,
      detail: [running && 'prebieha', detail].filter(Boolean).join(' · ') || 'event',
      to: `/events/${event.id}`,
    })
  }

  for (const loan of sources.loans.filter(isOpen)) {
    if (loan.status === 'reserved') {
      entries.push({ id: `loan-out-${loan.id}`, date: loan.startsOn, kind: 'loan', title: loan.borrower, detail: 'vydať techniku', to: `/loans/${loan.id}` })
    }
    entries.push({ id: `loan-back-${loan.id}`, date: loan.endsOn, kind: 'loan', title: loan.borrower, detail: 'vrátenie techniky', to: `/loans/${loan.id}` })
  }

  for (const vehicle of sources.vehicles.filter((candidate) => candidate.status !== 'retired')) {
    for (const deadline of vehicleDeadlines(vehicle, today)) {
      entries.push({
        id: `vehicle-${vehicle.id}-${deadline.key}`,
        date: deadline.date,
        kind: 'vehicle',
        title: vehicle.plate,
        detail: `končí ${deadline.label}`,
        to: `/vehicles/${vehicle.id}`,
      })
    }
  }

  for (const task of sources.tasks) {
    if (task.status !== 'done' && task.dueOn) {
      entries.push({ id: `task-${task.id}`, date: task.dueOn, kind: 'task', title: task.title, detail: 'termín úlohy', to: '/todos' })
    }
  }

  for (const item of sources.equipment) {
    const service = serviceState(item, today)
    if (item.status !== 'retired' && 'dueOn' in service) {
      entries.push({ id: `service-${item.id}`, date: service.dueOn, kind: 'service', title: item.name, detail: 'pravidelný servis', to: `/equipment/${item.id}` })
    }
  }

  for (const item of sources.shopping) {
    if (item.list === 'buy' && item.status !== 'delivered' && item.dueOn) {
      entries.push({ id: `shopping-${item.id}`, date: item.dueOn, kind: 'shopping', title: item.name, detail: 'kúpiť do', to: '/shopping' })
    }
  }

  // Narodeniny a meniny na rok dopredu.
  for (const celebration of upcomingCelebrations(sources.people ?? [], today, 366)) {
    entries.push(celebrationEntry(celebration))
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'sk'))
}

function celebrationEntry(celebration: Celebration): AgendaEntry {
  return {
    id: `celebration-${celebration.kind}-${celebration.person.key}-${celebration.date}`,
    date: celebration.date,
    kind: 'celebration',
    title: celebration.person.name,
    detail: celebration.kind === 'birthday' ? `narodeniny${celebration.age !== null ? ` (${celebration.age})` : ''}` : 'meniny',
    to: `/staff/${celebration.person.key}`,
  }
}

export type AgendaGroup = { date: string; entries: AgendaEntry[] }

/**
 * Rozdelí agendu na to, čo je po termíne, a na nadchádzajúce dni do `until` (vrátane),
 * zoskupené po dňoch.
 */
export function groupAgenda(entries: AgendaEntry[], today: string, until: string) {
  const overdue = entries.filter((entry) => entry.date < today)
  const groups: AgendaGroup[] = []
  for (const entry of entries) {
    if (entry.date < today || entry.date > until) continue
    const last = groups[groups.length - 1]
    if (last?.date === entry.date) last.entries.push(entry)
    else groups.push({ date: entry.date, entries: [entry] })
  }
  return { overdue, upcoming: groups, later: entries.filter((entry) => entry.date > until).length }
}

/** Dátum o `days` dní neskôr. */
export function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Mesiac o `by` mesiacov ďalej: „2026-12“ + 1 → „2027-01“. */
export function shiftMonth(month: string, by: number) {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(Date.UTC(year, monthNumber - 1 + by, 1)).toISOString().slice(0, 7)
}

/** Dni mriežky mesiaca: celé týždne od pondelka, vrátane dní susedných mesiacov. */
export function monthGridDays(month: string) {
  const first = `${month}-01`
  const offset = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7
  const [year, monthNumber] = month.split('-').map(Number)
  const length = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const start = addDays(first, -offset)
  return Array.from({ length: Math.ceil((offset + length) / 7) * 7 }, (_, index) => addDays(start, index))
}

/**
 * Termíny pre mriežku, podľa dní od `from` do `to`. Na rozdiel od agendy tu eventy
 * a výpožičky zaberajú každý svoj deň a vidno aj tie minulé; zrušené eventy nie.
 */
export function entriesByDay(sources: AgendaSources, today: string, from: string, to: string) {
  const byDay = new Map<string, AgendaEntry[]>()
  const add = (entry: AgendaEntry) => byDay.set(entry.date, [...(byDay.get(entry.date) ?? []), entry])
  const span = (startsOn: string, endsOn: string, entry: Omit<AgendaEntry, 'date'>) => {
    const last = endsOn < to ? endsOn : to
    for (let day = startsOn > from ? startsOn : from; day <= last; day = addDays(day, 1)) {
      add({ ...entry, id: `${entry.id}-${day}`, date: day })
    }
  }

  for (const event of sources.events) {
    if (event.status === 'cancelled') continue
    span(event.startsOn, event.endsOn, {
      id: `event-${event.id}`,
      kind: 'event',
      title: event.name,
      detail: [EVENT_STATUS_LABELS[event.status], event.venue].filter(Boolean).join(' · '),
      to: `/events/${event.id}`,
    })
  }
  for (const loan of sources.loans) {
    span(loan.startsOn, loan.endsOn, {
      id: `loan-${loan.id}`,
      kind: 'loan',
      title: loan.borrower,
      detail: LOAN_STATUS_LABELS[loan.status],
      to: `/loans/${loan.id}`,
    })
  }
  for (const entry of buildAgenda({ ...sources, people: [] }, today)) {
    if (entry.kind !== 'event' && entry.kind !== 'loan' && entry.date >= from && entry.date <= to) add(entry)
  }
  // Narodeniny a meniny aj v minulých dňoch mriežky.
  const gridDayCount = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1
  for (const celebration of upcomingCelebrations(sources.people ?? [], from, gridDayCount)) add(celebrationEntry(celebration))
  return byDay
}
