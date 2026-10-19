import type { Equipment } from '@/features/equipment/model'
import { purchaseDates } from '@/features/equipment/model'
import type { CompanyEvent } from '@/features/events/model'
import type { Incident } from '@/features/incidents/api'
import type { OfficePurchase } from '@/features/office/api'
import type { OrderSummary } from '@/features/orders/model'
import type { ServiceRecord } from '@/features/service/model'
import type { Task } from '@/features/tasks/model'

/** Dni eventu (od – do vrátane). */
function eventDays(event: Pick<CompanyEvent, 'startsOn' | 'endsOn'>) {
  return Math.round((Date.parse(event.endsOn) - Date.parse(event.startsOn)) / 86_400_000) + 1
}

export type ReportInput = {
  year: string
  events?: CompanyEvent[]
  equipment?: Equipment[]
  service?: ServiceRecord[]
  incidents?: Incident[]
  tasks?: Task[]
  orders?: OrderSummary[]
  office?: OfficePurchase[]
  income?: { amount: number; receivedOn: string }[]
  payouts?: { amount: number; happenedOn: string }[]
}

const round = (value: number) => Math.round(value * 100) / 100

/** Ročná správa: čo sa za rok udialo. Časti bez dát (nie sú oprávnenia) sú undefined. */
export function yearReport(input: ReportInput) {
  const inYear = (date: string | null | undefined) => Boolean(date && date.startsWith(input.year))
  const events = input.events?.filter((event) => event.status !== 'cancelled' && inYear(event.startsOn))
  const months = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, events: 0, days: 0 }))
  const crew = new Map<string, { key: string; memberId: string | null; name: string; events: number; days: number }>()
  const clients = new Map<string, number>()
  for (const event of events ?? []) {
    const month = months[Number(event.startsOn.slice(5, 7)) - 1]
    month.events += 1
    month.days += eventDays(event)
    if (event.client.trim()) clients.set(event.client.trim(), (clients.get(event.client.trim()) ?? 0) + 1)
    for (const person of event.crew) {
      if (person.response === 'no') continue
      const key = person.memberId ?? `name:${person.name}`
      const row = crew.get(key) ?? { key, memberId: person.memberId, name: person.name, events: 0, days: 0 }
      row.events += 1
      row.days += eventDays(event)
      crew.set(key, row)
    }
  }
  const service = input.service?.filter((record) => inYear(record.happenedOn))
  const incidents = input.incidents?.filter((item) => inYear(item.occurredOn))
  const doneTasks = input.tasks?.filter((task) => task.status === 'done' && inYear(task.dueOn ?? task.createdAt ?? ''))
  const ordersForUs = input.orders?.filter((order) => order.forUs !== false && inYear(order.orderedAt))
  const categories = new Map<string, number>()
  for (const task of doneTasks ?? []) categories.set(task.category || 'bez kategórie', (categories.get(task.category || 'bez kategórie') ?? 0) + 1)

  return {
    events: events && {
      count: events.length,
      days: events.reduce((sum, event) => sum + eventDays(event), 0),
      months,
      crew: [...crew.values()].sort((a, b) => b.events - a.events || b.days - a.days),
      clients: [...clients.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
    },
    equipment: input.equipment && {
      bought: input.equipment.filter((item) => purchaseDates(item).some(inYear)).length,
      total: input.equipment.filter((item) => item.status !== 'retired').length,
    },
    service: service && { count: service.length, cost: round(service.reduce((sum, record) => sum + (record.cost ?? 0), 0)), hours: round(service.reduce((sum, record) => sum + (record.hours ?? 0), 0)) },
    incidents: incidents && {
      damages: incidents.filter((item) => item.kind === 'damage').length,
      injuries: incidents.filter((item) => item.kind === 'injury').length,
      cost: round(incidents.reduce((sum, item) => sum + (item.cost ?? 0), 0)),
    },
    tasks: doneTasks && { done: doneTasks.length, categories: [...categories.entries()].sort((a, b) => b[1] - a[1]) },
    money: {
      income: input.income && round(input.income.filter((item) => inYear(item.receivedOn)).reduce((sum, item) => sum + item.amount, 0)),
      orders: ordersForUs && round(ordersForUs.filter((order) => order.currency === 'EUR').reduce((sum, order) => sum + order.total, 0)),
      office: input.office && round(input.office.filter((item) => inYear(item.boughtOn)).reduce((sum, item) => sum + item.price, 0)),
      payouts: input.payouts && round(input.payouts.filter((item) => inYear(item.happenedOn)).reduce((sum, item) => sum + item.amount, 0)),
    },
  }
}

export type YearReport = ReturnType<typeof yearReport>

/** Za ktorý rok ukázať ročnú správu hore: 31. 12. tento rok, 1. 1. minulý; inak žiadny. */
export function yearReportYear(today: string) {
  const monthDay = today.slice(5)
  if (monthDay === '12-31') return today.slice(0, 4)
  if (monthDay === '01-01') return String(Number(today.slice(0, 4)) - 1)
  return null
}
