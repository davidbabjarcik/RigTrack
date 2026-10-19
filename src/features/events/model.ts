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

/** `caseId` je vyplnené, keď technika prišla na event ako súčasť celého case. */
export type EventEquipment = { equipmentId: string; quantity: number; caseId: string | null }
/** Odpoveď člena posádky: zatiaľ nič / môže / nemôže. */
export type CrewResponse = 'pending' | 'yes' | 'no'
export type EventCrew = { id: string; memberId: string | null; name: string; role: string; response: CrewResponse; responseNote: string }

/** Údaje eventu do tlače: organizátor, popis a časy prvého dňa („HH:MM“ alebo prázdne). */
export const EVENT_SETTINGS = ['indoor', 'outdoor', 'mixed'] as const
export type EventSetting = (typeof EVENT_SETTINGS)[number]
export const SETTING_LABELS: Record<EventSetting, string> = { indoor: 'Interiér', outdoor: 'Exteriér', mixed: 'Interiér aj exteriér' }

/** Elektrická prípojka na mieste. Zodpovedá check constraint v 0047. */
export const POWER_TYPES = ['schuko16', 'cee16', 'cee32', 'cee63', 'cee125', 'generator', 'none'] as const
export type PowerType = (typeof POWER_TYPES)[number]
export const POWER_LABELS: Record<PowerType, string> = {
  schuko16: 'Zásuvka 230 V (16 A)',
  cee16: 'CEE 16 A – 5 pin (400 V)',
  cee32: 'CEE 32 A – 5 pin (400 V)',
  cee63: 'CEE 63 A – 5 pin (400 V)',
  cee125: 'CEE 125 A – 5 pin (400 V)',
  generator: 'Generátor (zabezpečíme)',
  none: 'Bez prípojky',
}

export type EventDetails = {
  /** Interiér / exteriér; prázdne = nezadané. */
  setting: EventSetting | ''
  /** Prípojka elektriny; prázdne = ešte nevieme. */
  power: PowerType | ''
  powerCount: number | null
  powerNote: string
  /** Miesto pre počasie, ak sa líši od miesta konania. */
  weatherPlace: string
  organizer: string
  organizerPerson: string
  organizerPhone: string
  organizerEmail: string
  description: string
  getInTime: string
  showTime: string
  showEndTime: string
}

export const EMPTY_EVENT_DETAILS: EventDetails = {
  setting: '',
  power: '',
  powerCount: null,
  powerNote: '',
  weatherPlace: '',
  organizer: '',
  organizerPerson: '',
  organizerPhone: '',
  organizerEmail: '',
  description: '',
  getInTime: '',
  showTime: '',
  showEndTime: '',
}

export type CompanyEvent = EventDetails & {
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

/** Dokument eventu (rider, stage plot…) alebo fotka eventu. */
export type EventDocument = { id: string; name: string; path: string; sizeBytes: number; createdAt: string; isPhoto: boolean }

const text = (max: number) => z.string().trim().max(max, `Najviac ${max} znakov`)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Zadajte dátum')
const time = z.string().regex(/^(\d{2}:\d{2})?$/, 'Zadajte čas')

export const eventSchema = z
  .object({
    name: text(160).min(1, 'Zadajte názov eventu'),
    client: text(120),
    venue: text(200),
    startsOn: date,
    endsOn: date,
    status: z.enum(EVENT_STATUSES),
    note: text(4000),
    setting: z.enum([...EVENT_SETTINGS, '']),
    power: z.enum([...POWER_TYPES, '']),
    powerCount: z.number('Zadajte počet').int('Celé číslo').min(1, 'Aspoň 1').max(50).nullable(),
    powerNote: text(200),
    weatherPlace: text(120),
    organizer: text(120),
    organizerPerson: text(120),
    organizerPhone: text(40),
    organizerEmail: text(120).refine((email) => email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Neplatný e-mail'),
    description: text(8000),
    getInTime: time,
    showTime: time,
    showEndTime: time,
  })
  .superRefine((event, ctx) => {
    if (event.startsOn && event.endsOn && event.endsOn < event.startsOn) {
      ctx.addIssue({ code: 'custom', path: ['endsOn'], message: 'Koniec nemôže byť pred začiatkom' })
    }
  })
export type EventFormValues = z.infer<typeof eventSchema>

/** Časy eventu jedným riadkom: „príchod 14:00 · program 19:30 – 23:00“. */
export function describeTimes(event: Pick<EventDetails, 'getInTime' | 'showTime' | 'showEndTime'>) {
  const program = event.showTime && event.showEndTime ? `${event.showTime} – ${event.showEndTime}` : event.showTime || (event.showEndTime && `do ${event.showEndTime}`)
  return [event.getInTime && `príchod / stavba ${event.getInTime}`, program && `program ${program}`].filter(Boolean).join(' · ')
}

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

/** Koľko kusov techniky je v termíne od–do naplánovaných na živých eventoch. */
export function plannedOnEvents(events: CompanyEvent[], equipmentId: string, startsOn: string, endsOn: string) {
  return events
    .filter((event) => isLive(event) && event.startsOn <= endsOn && event.endsOn >= startsOn)
    .reduce((sum, event) => sum + (event.equipment.find((item) => item.equipmentId === equipmentId)?.quantity ?? 0), 0)
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
  const others = events.filter((other) => other.id !== event.id)
  return (
    plannedOnEvents(others, equipmentId, event.startsOn, event.endsOn) +
    busyQuantity(loans, equipmentId, event.startsOn, event.endsOn, today)
  )
}

/**
 * Na koľkých eventoch bol case od poslednej kontroly obsahu (bez zrušených a bez tohto eventu).
 * `checkedOn` je dátum poslednej kontroly; null = case ešte nikto nekontroloval.
 */
export function eventsSinceCheck(caseId: string, checkedOn: string | null, events: CompanyEvent[], currentEventId: string, today: string) {
  return events.filter(
    (event) =>
      event.id !== currentEventId &&
      event.status !== 'cancelled' &&
      event.startsOn <= today &&
      (checkedOn === null || event.startsOn > checkedOn) &&
      event.equipment.some((item) => item.caseId === caseId),
  ).length
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

/**
 * Kľúč opakovanej akcie: názov bez letopočtu, diakritiky a veľkých písmen.
 * „JESKO Medzilaborce 2025“ a „Jesko Medzilaborce 2026“ sú tá istá akcia.
 */
export function seriesKey(name: string) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\b(19|20)\d{2}\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Posledný skorší ročník tej istej akcie (podľa názvu); zrušené sa nerátajú. */
export function previousEdition(events: CompanyEvent[], event: { id?: string; name: string; startsOn: string }): CompanyEvent | null {
  const key = seriesKey(event.name)
  if (!key) return null
  const earlier = events
    .filter((other) => other.id !== event.id && other.status !== 'cancelled' && other.startsOn < event.startsOn && seriesKey(other.name) === key)
    .sort((a, b) => b.startsOn.localeCompare(a.startsOn))
  return earlier[0] ?? null
}

/** Názvy doterajších akcií na našepkávanie: každá akcia raz, podľa najnovšieho ročníka, najnovšie prvé. */
export function pastEventNames(events: CompanyEvent[]) {
  const latest = new Map<string, CompanyEvent>()
  for (const event of events) {
    const key = seriesKey(event.name)
    if (!key || event.status === 'cancelled') continue
    const known = latest.get(key)
    if (!known || event.startsOn > known.startsOn) latest.set(key, event)
  }
  return [...latest.values()].sort((a, b) => b.startsOn.localeCompare(a.startsOn)).map((event) => event.name)
}
