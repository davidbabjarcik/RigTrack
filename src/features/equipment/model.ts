import { z } from 'zod'

export const EQUIPMENT_STATUSES = ['available', 'loaned', 'in_service', 'damaged', 'retired'] as const
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number]

export const STATUS_LABELS: Record<EquipmentStatus, string> = {
  available: 'Dostupná',
  loaned: 'Vypožičaná',
  in_service: 'V servise',
  damaged: 'Poškodená',
  retired: 'Vyradená',
}

// Druh určuje, na čo sa formulár pýta. Zodpovedá check constraint v 0007_equipment_details.sql.
export const EQUIPMENT_KINDS = ['general', 'cable', 'light', 'audio', 'consumable'] as const
export type EquipmentKind = (typeof EQUIPMENT_KINDS)[number]

export const KIND_LABELS: Record<EquipmentKind, string> = {
  general: 'Všeobecné',
  cable: 'Kábel',
  light: 'Svetlo',
  audio: 'Zvuk',
  consumable: 'Spotrebný materiál',
}

export const LIGHT_SOURCES = ['led', 'discharge', 'halogen', 'laser', 'other'] as const
export type LightSource = (typeof LIGHT_SOURCES)[number]

export const LIGHT_SOURCE_LABELS: Record<LightSource, string> = {
  led: 'LED',
  discharge: 'Výbojka',
  halogen: 'Halogén',
  laser: 'Laser',
  other: 'Iné',
}

export const COMMON_CONNECTORS = [
  'XLR',
  'DMX 3-pin',
  'DMX 5-pin',
  'powerCON napájací',
  'powerCON prepojovací',
  'powerCON TRUE1',
  'Schuko',
  'CEE 16A',
  'CEE 32A',
  'speakON',
  'Jack 6,3 mm',
  'RJ45 / etherCON',
  'SDI (BNC)',
  'HDMI',
]

/** Údaje špecifické pre druh techniky (stĺpec equipment.attributes). */
export type EquipmentAttributes = {
  connector?: string
  lengthM?: number
  powerW?: number
  lightSource?: LightSource
}

export type LabelRole = 'main' | 'secondary'

export type Lookup = { id: string; name: string; consumable?: boolean }

export type Equipment = {
  id: string
  name: string
  kind: EquipmentKind
  attributes: EquipmentAttributes
  categoryId: string | null
  locationId: string | null
  caseId: string | null
  /** Rola na flight case štítku: jeden hlavný prvok case (s fotkou) a vedľajšie prvky. */
  labelRole: LabelRole | null
  /** Pri tomto počte kusov (a menej) sa položka objaví v zozname „treba kúpiť“. */
  minQuantity: number | null
  quantity: number
  manufacturer: string
  model: string
  serialNumber: string
  inventoryNumber: string
  macAddress: string
  ipAddress: string
  serviceIntervalMonths: number | null
  lastServiceOn: string | null
  /** Cesta fotky v Storage; prázdna = bez fotky. */
  photoPath: string
  status: EquipmentStatus
  note: string
  updatedAt: string
}

const text = (max: number) => z.string().trim().max(max, `Najviac ${max} znakov`)
const optionalNumber = (max: number) => z.number('Zadajte číslo').positive('Musí byť viac ako 0').max(max).optional()

/** Pre register(): prázdne pole = nevyplnené, inak číslo. */
export const asOptionalNumber = {
  setValueAs: (value: unknown) => (value === '' || value == null ? undefined : Number(value)),
}

const MAC = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/

/** „00-1a-2b-3c-4d-5e“ aj „001a2b3c4d5e“ → „00:1A:2B:3C:4D:5E“. Iný vstup vráti len orezaný a veľkými písmenami. */
export function normalizeMac(value: string) {
  const hex = value.trim().toUpperCase().replace(/[-:.\s]/g, '')
  if (!/^[0-9A-F]{12}$/.test(hex)) return value.trim().toUpperCase()
  return hex.match(/.{2}/g)!.join(':')
}

export function isValidIp(value: string) {
  const parts = value.split('.')
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

// Limity zodpovedajú check constraints v migráciách 0002 a 0007.
export const equipmentSchema = z.object({
  name: text(120).min(1, 'Zadajte názov'),
  kind: z.enum(EQUIPMENT_KINDS),
  category: text(80),
  location: text(80),
  caseId: z.string(),
  manufacturer: text(80),
  model: text(80),
  serialNumber: text(80),
  inventoryNumber: text(40),
  quantity: z.number('Zadajte počet kusov').int('Zadajte celé číslo').min(0, 'Počet nemôže byť záporný').max(100000),
  minQuantity: z.number('Zadajte číslo').int('Zadajte celé číslo').min(0, 'Nemôže byť záporné').max(100000).optional(),
  status: z.enum(EQUIPMENT_STATUSES),
  connector: text(60),
  lengthM: optionalNumber(1000),
  powerW: optionalNumber(100000),
  lightSource: z.enum([...LIGHT_SOURCES, '']),
  macAddress: z
    .string()
    .trim()
    .refine((value) => value === '' || MAC.test(normalizeMac(value)), 'MAC adresa má tvar 00:1A:2B:3C:4D:5E'),
  ipAddress: z
    .string()
    .trim()
    .refine((value) => value === '' || isValidIp(value), 'IP adresa má tvar 192.168.1.10'),
  serviceIntervalMonths: z.number('Zadajte číslo').int('Celé mesiace').min(1, 'Aspoň 1 mesiac').max(120).optional(),
  lastServiceOn: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Zadajte dátum'),
  note: text(2000),
})

export type EquipmentFormValues = z.infer<typeof equipmentSchema>

/** Káble a spotrebný materiál nemajú sériové číslo, sieť ani servis — formulár sa na to nepýta. */
export function isSimpleKind(kind: EquipmentKind) {
  return kind === 'cable' || kind === 'consumable'
}

/** Zásoba klesla na nastavenú hranicu: treba dokúpiť. */
export function needsRestock(item: Pick<Equipment, 'quantity' | 'minQuantity'>) {
  return item.minQuantity !== null && item.quantity <= item.minQuantity
}

/** Z formulára vyberie iba údaje, ktoré k zvolenému druhu patria. */
export function attributesFor(values: Pick<EquipmentFormValues, 'kind' | 'connector' | 'lengthM' | 'powerW' | 'lightSource'>) {
  const attributes: EquipmentAttributes = {}
  if (values.kind === 'cable') {
    if (values.connector) attributes.connector = values.connector
    if (values.lengthM !== undefined) attributes.lengthM = values.lengthM
  }
  if (values.kind === 'light' || values.kind === 'audio') {
    if (values.powerW !== undefined) attributes.powerW = values.powerW
  }
  if (values.kind === 'light' && values.lightSource) attributes.lightSource = values.lightSource
  return attributes
}

/** 1.5 → „1,5“ */
export function formatNumber(value: number) {
  return String(value).replace('.', ',')
}

/** Krátky popis údajov druhu do zoznamu a detailu, napr. „XLR · 5 m“ alebo „200 W · LED“. */
export function describeAttributes(item: Pick<Equipment, 'attributes'>) {
  const a = item.attributes
  return [
    a.connector,
    a.lengthM !== undefined && `${formatNumber(a.lengthM)} m`,
    a.powerW !== undefined && `${formatNumber(a.powerW)} W`,
    a.lightSource && LIGHT_SOURCE_LABELS[a.lightSource],
  ].filter(Boolean) as string[]
}

// ---------------------------------------------------------------------------
// Servis
// ---------------------------------------------------------------------------

function addMonths(isoDate: string, months: number) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const target = new Date(Date.UTC(year, month - 1 + months, 1))
  // 31. 1. + 1 mesiac = posledný deň februára, nie začiatok marca.
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return target.toISOString().slice(0, 10)
}

export type ServiceState = { state: 'none' } | { state: 'unknown' } | { state: 'ok' | 'soon' | 'overdue'; dueOn: string }

const SOON_DAYS = 30

/** Stav servisu k dnešnému dňu: po termíne, do 30 dní, v poriadku, alebo interval bez zapísaného servisu. */
export function serviceState(item: Pick<Equipment, 'serviceIntervalMonths' | 'lastServiceOn'>, today: string): ServiceState {
  if (!item.serviceIntervalMonths) return { state: 'none' }
  if (!item.lastServiceOn) return { state: 'unknown' }
  const dueOn = addMonths(item.lastServiceOn, item.serviceIntervalMonths)
  if (dueOn < today) return { state: 'overdue', dueOn }
  const daysLeft = (Date.parse(dueOn) - Date.parse(today)) / 86_400_000
  return { state: daysLeft <= SOON_DAYS ? 'soon' : 'ok', dueOn }
}

// ---------------------------------------------------------------------------
// Filter zoznamu
// ---------------------------------------------------------------------------

export type EquipmentFilter = {
  search: string
  status: EquipmentStatus | ''
  categoryId: string
  locationId: string
  /** Prázdne = všetko, NO_CASE = technika mimo cases, inak id konkrétneho case. */
  caseId: string
}

export const NO_CASE = 'none'

/** Bez diakritiky a veľkosti písmen, aby „mikrofon“ našlo „Mikrofón“. */
function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export function filterEquipment(items: Equipment[], filter: EquipmentFilter) {
  const words = normalize(filter.search).split(/\s+/).filter(Boolean)
  return items.filter((item) => {
    if (filter.status && item.status !== filter.status) return false
    if (filter.categoryId && item.categoryId !== filter.categoryId) return false
    if (filter.locationId && item.locationId !== filter.locationId) return false
    if (filter.caseId === NO_CASE ? item.caseId !== null : filter.caseId && item.caseId !== filter.caseId) return false
    if (words.length === 0) return true
    const haystack = normalize(
      [
        item.name,
        item.manufacturer,
        item.model,
        item.serialNumber,
        item.inventoryNumber,
        item.macAddress,
        item.ipAddress,
        item.attributes.connector,
      ].join(' '),
    )
    return words.every((word) => haystack.includes(word))
  })
}

/** Technika, ktorá by mala byť v nejakom case, ale nie je. Vyradená a spotrebný materiál sa nerátajú. */
export function unpackedEquipment(items: Equipment[]) {
  return items.filter((item) => item.caseId === null && item.status !== 'retired' && item.kind !== 'consumable')
}

// ---------------------------------------------------------------------------
// Sada káblov: jeden typ vo viacerých dĺžkach naraz
// ---------------------------------------------------------------------------

export const cableSetSchema = z.object({
  namePrefix: text(100).min(1, 'Zadajte názov, napr. XLR kábel'),
  connector: text(60),
  category: text(80),
  location: text(80),
  rows: z
    .array(
      z.object({
        lengthM: z.number('Zadajte dĺžku').positive('Musí byť viac ako 0').max(1000),
        quantity: z.number('Zadajte počet').int('Celé číslo').min(1, 'Aspoň 1').max(100000),
      }),
    )
    .min(1, 'Pridajte aspoň jednu dĺžku')
    .superRefine((rows, ctx) => {
      rows.forEach((row, index) => {
        if (rows.findIndex((other) => other.lengthM === row.lengthM) !== index) {
          ctx.addIssue({ code: 'custom', path: [index, 'lengthM'], message: 'Táto dĺžka je tu dvakrát' })
        }
      })
    }),
})

export type CableSetValues = z.infer<typeof cableSetSchema>

export function cableName(namePrefix: string, lengthM: number) {
  return `${namePrefix} ${formatNumber(lengthM)} m`
}
