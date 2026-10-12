import { z } from 'zod'
import { busyQuantity, type Loan } from '@/features/loans/model'

// Zodpovedá check constraint v 0018_events.sql.
export const EVENT_STATUSES = ['planned', 'confirmed', 'done', 'cancelled'] as const
export type EventStatus = (typeof EVENT_STATUSES)[number]

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  planned: 'Plánovaný',
  confirmed: 'Potvrdený',
  done: 'Odohraný',
  cancelled: 'Zrušený',
}

export type EventEquipment = { equipmentId: string; quantity: number }
export type EventCrew = { id: string; memberId: string | null; name: string; role: string }

export type CompanyEvent = {
  id: string
  name: string
  client: string
  venue: string
  startsOn: string
  endsOn: string
  status: EventStatus
  note: string
  equipment: EventEquipment[]
  crew: EventCrew[]
}

export type EventDocument = { id: string; name: string; path: string; sizeBytes: number; createdAt: string }

const text = (max: number) => z.string().trim().max(max, `Najviac ${max} znakov`)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Zadajte dátum')

export const eventSchema = z
  .object({
    name: text(160).min(1, 'Zadajte názov eventu'),
    client: text(120),
    venue: text(200),
    startsOn: date,
    endsOn: date,
    status: z.enum(EVENT_STATUSES),
    note: text(4000),
  })
  .superRefine((event, ctx) => {
    if (event.startsOn && event.endsOn && event.endsOn < event.startsOn) {
      ctx.addIssue({ code: 'custom', path: ['endsOn'], message: 'Koniec nemôže byť pred začiatkom' })
    }
  })
export type EventFormValues = z.infer<typeof eventSchema>

/** Event, ktorý ešte drží techniku: plánovaný alebo potvrdený. */
export function isLive(event: Pick<CompanyEvent, 'status'>) {
  return event.status === 'planned' || event.status === 'confirmed'
}

/** Nadchádzajúce a prebiehajúce eventy od najbližšieho, potom minulé a zrušené od najnovších. */
export function sortEvents(events: CompanyEvent[], today: string) {
  const upcoming = (event: CompanyEvent) => isLive(event) && event.endsOn >= today
  return [...events].sort((a, b) => {
    const rank = Number(upcoming(b)) - Number(upcoming(a))
    if (rank !== 0) return rank
    return upcoming(a) ? a.startsOn.localeCompare(b.startsOn) : b.startsOn.localeCompare(a.startsOn)
  })
}

/**
 * Koľko kusov techniky je v termíne eventu obsadených inde: na iných živých eventoch
 * a na otvorených výpožičkách.
 */
export function busyElsewhere(
  event: Pick<CompanyEvent, 'id' | 'startsOn' | 'endsOn'>,
  equipmentId: string,
  events: CompanyEvent[],
  loans: Loan[],
  today: string,
) {
  const onEvents = events
    .filter((other) => other.id !== event.id && isLive(other) && other.startsOn <= event.endsOn && other.endsOn >= event.startsOn)
    .reduce((sum, other) => sum + (other.equipment.find((item) => item.equipmentId === equipmentId)?.quantity ?? 0), 0)
  return onEvents + busyQuantity(loans, equipmentId, event.startsOn, event.endsOn, today)
}

/** 1536 → „1,5 kB“ */
export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['kB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${String(Math.round(value * 10) / 10).replace('.', ',')} ${units[unit]}`
}

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
