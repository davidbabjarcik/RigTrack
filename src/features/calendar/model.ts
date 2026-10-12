import { serviceState, type Equipment } from '@/features/equipment/model'
import { isLive, type CompanyEvent } from '@/features/events/model'
import { isOpen, type Loan } from '@/features/loans/model'
import type { ShoppingItem } from '@/features/shopping/model'
import type { Task } from '@/features/tasks/model'
import { vehicleDeadlines, type Vehicle } from '@/features/vehicles/model'

// Kalendár je odvodený pohľad: nič sa doň nezapisuje, skladá sa z termínov ostatných modulov.

export const ENTRY_KINDS = ['event', 'loan', 'vehicle', 'task', 'service', 'shopping'] as const
export type EntryKind = (typeof ENTRY_KINDS)[number]

export const ENTRY_KIND_LABELS: Record<EntryKind, string> = {
  event: 'Eventy',
  loan: 'Výpožičky',
  vehicle: 'Vozidlá',
  task: 'Úlohy',
  service: 'Servis techniky',
  shopping: 'Nákupy',
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

  return entries.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'sk'))
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
