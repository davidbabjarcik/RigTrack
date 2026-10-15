import { z } from 'zod'
import type { CategoryColor } from './categoryColors'

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
export const EQUIPMENT_KINDS = ['general', 'cable', 'light', 'audio', 'truss', 'stage', 'consumable'] as const
export type EquipmentKind = (typeof EQUIPMENT_KINDS)[number]

export const KIND_LABELS: Record<EquipmentKind, string> = {
  general: 'Všeobecné',
  cable: 'Kábel',
  light: 'Svetlo',
  audio: 'Zvuk',
  truss: 'Hliník / truss',
  stage: 'Pódium (Nivtec a príslušenstvo)',
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

/** Čo je to za zvukovú techniku; podľa toho sa dá v zozname hľadať aj triediť. */
export const AUDIO_TYPES = ['mixer', 'microphone', 'speaker', 'subwoofer', 'monitor', 'amplifier', 'processor', 'di', 'stagebox', 'wireless', 'iem', 'other'] as const
export type AudioType = (typeof AUDIO_TYPES)[number]

export const AUDIO_TYPE_LABELS: Record<AudioType, string> = {
  mixer: 'Mixpult',
  microphone: 'Mikrofón',
  speaker: 'Reprobox',
  subwoofer: 'Subwoofer',
  monitor: 'Odposluch',
  amplifier: 'Zosilňovač',
  processor: 'Procesor / DSP',
  di: 'DI box',
  stagebox: 'Stagebox',
  wireless: 'Bezdrôtový systém',
  iem: 'In-ear',
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
  /** Typ zvukovej techniky (mixpult, mikrofón…). */
  audioType?: AudioType
  /** DMX módy svetla: názov a počet kanálov, napr. Standard 16 ch. */
  dmxModes?: DmxMode[]
}

export type DmxMode = { name: string; channels: number }

export type LabelRole = 'main' | 'secondary'

export type Lookup = { id: string; name: string; consumable?: boolean; color?: CategoryColor | null }

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
  /** Každý kus má číslo (#1..počet) a vlastnú históriu; inak sa technika ráta len na počet. */
  trackUnits: boolean
  /** Vlastné čísla kusov (napr. 1, 4, 8); prázdne = kusy 1..počet. */
  unitIds: number[]
  /** Cena prenájmu za kus a deň; bez nej sa do kalkulácie výpožičky nepočíta. */
  rentalPrice: number | null
  manufacturer: string
  model: string
  serialNumber: string
  inventoryNumber: string
  macAddress: string
  ipAddress: string
  serviceIntervalMonths: number | null
  lastServiceOn: string | null
  /** Ako často treba odčítať počítadlo prevádzkových hodín zariadenia. */
  hoursIntervalMonths: number | null
  /** Posledný odčítaný stav počítadla a kedy sa odčítal. */
  operatingHours: number | null
  hoursReadOn: string | null
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
  trackUnits: z.boolean(),
  /** Čísla kusov oddelené čiarkou alebo medzerou; prázdne = 1..počet. */
  unitIds: z
    .string()
    .trim()
    .max(2000, 'Príliš veľa čísel')
    .regex(/^[\d\s,;]*$/, 'Len čísla oddelené čiarkou')
    .refine((text) => parseUnitIds(text).every((id) => id >= 1 && id <= 100000), 'Čísla od 1 do 100000'),
  rentalPrice: z.number('Zadajte číslo').min(0, 'Nemôže byť záporné').max(1_000_000).optional(),
  status: z.enum(EQUIPMENT_STATUSES),
  connector: text(60),
  lengthM: optionalNumber(1000),
  powerW: optionalNumber(100000),
  lightSource: z.enum([...LIGHT_SOURCES, '']),
  audioType: z.enum([...AUDIO_TYPES, '']),
  dmxModes: z
    .array(
      z.object({
        name: text(40).min(1, 'Zadajte názov módu'),
        channels: z.number('Zadajte počet kanálov').int('Celé číslo').min(1, 'Aspoň 1 kanál').max(512, 'Najviac 512 kanálov'),
      }),
    )
    .max(20, 'Najviac 20 módov'),
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
  hoursIntervalMonths: z.number('Zadajte číslo').int('Celé mesiace').min(1, 'Aspoň 1 mesiac').max(120).optional(),
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

/**
 * Je to svetlo? Podľa druhu, alebo podľa kategórie, ktorej názov hovorí o svetlách
 * („Svetlá“, „Svetlo – hlavy“, „Light“). Vtedy sa formulár pýta aj na zdroj a DMX módy.
 */
export function isLighting(kind: EquipmentKind, category: string) {
  const plain = category.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  return kind === 'light' || /svetl|light/.test(plain)
}

/** Je to zvuk? Podľa druhu, alebo podľa kategórie („Zvuk“, „Audio“, „Sound“). */
export function isAudio(kind: EquipmentKind, category: string) {
  const plain = category.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  return kind === 'audio' || /zvuk|audio|sound/.test(plain)
}

/** Z formulára vyberie iba údaje, ktoré k zvolenému druhu patria. */
export function attributesFor(
  values: Pick<EquipmentFormValues, 'kind' | 'connector' | 'lengthM' | 'powerW' | 'lightSource'> &
    Partial<Pick<EquipmentFormValues, 'category' | 'dmxModes' | 'audioType'>>,
) {
  const attributes: EquipmentAttributes = {}
  const lighting = isLighting(values.kind, values.category ?? '')
  const audio = isAudio(values.kind, values.category ?? '')
  if (values.kind === 'cable') {
    if (values.connector) attributes.connector = values.connector
    if (values.lengthM !== undefined) attributes.lengthM = values.lengthM
  }
  // Truss sa delí podľa dĺžky dielu (0,5 / 1 / 2 / 3 m).
  if (values.kind === 'truss' && values.lengthM !== undefined) attributes.lengthM = values.lengthM
  if (lighting || audio) {
    if (values.powerW !== undefined) attributes.powerW = values.powerW
  }
  if (lighting && values.lightSource) attributes.lightSource = values.lightSource
  if (audio && values.audioType) attributes.audioType = values.audioType
  if (lighting && values.dmxModes?.length) attributes.dmxModes = values.dmxModes.map((mode) => ({ name: mode.name.trim(), channels: mode.channels }))
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
    a.audioType && AUDIO_TYPE_LABELS[a.audioType],
    a.connector,
    a.lengthM !== undefined && `${formatNumber(a.lengthM)} m`,
    a.powerW !== undefined && `${formatNumber(a.powerW)} W`,
    a.lightSource && LIGHT_SOURCE_LABELS[a.lightSource],
    a.dmxModes?.length && `DMX ${a.dmxModes.map((mode) => mode.channels).join('/')} ch`,
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
  return intervalState(item.serviceIntervalMonths, item.lastServiceOn, today)
}

/** Stav odčítania prevádzkových hodín: rovnaká logika ako pri servise, len s vlastným intervalom. */
export function hoursState(item: Pick<Equipment, 'hoursIntervalMonths' | 'hoursReadOn'>, today: string): ServiceState {
  return intervalState(item.hoursIntervalMonths, item.hoursReadOn, today)
}

function intervalState(intervalMonths: number | null, lastOn: string | null, today: string): ServiceState {
  if (!intervalMonths) return { state: 'none' }
  if (!lastOn) return { state: 'unknown' }
  const dueOn = addMonths(lastOn, intervalMonths)
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
        item.attributes.audioType && AUDIO_TYPE_LABELS[item.attributes.audioType],
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

/** Čísla kusov 1..count. */
export const unitRange = (count: number) => Array.from({ length: Math.max(count, 0) }, (_, index) => index + 1)

/** Platné čísla kusov techniky: vlastný zoznam, alebo 1..počet, ak ho nemá. */
export function unitIdsOf(item: Pick<Equipment, 'quantity' | 'unitIds'>) {
  return item.unitIds.length > 0 ? item.unitIds : unitRange(item.quantity)
}

/** „1, 4 8;4“ → [1, 4, 8]: bez duplicít, vzostupne. */
export function parseUnitIds(text: string) {
  const ids = text.split(/[\s,;]+/).filter(Boolean).map(Number).filter(Number.isInteger)
  return [...new Set(ids)].sort((a, b) => a - b)
}

/** [1, 4, 8] → „#1, #4, #8“; súvislý rad skráti na „#1 – #16“. */
export function describeUnitIds(ids: number[]) {
  if (ids.length === 0) return ''
  const consecutive = ids.length > 2 && ids.every((id, index) => index === 0 || id === ids[index - 1] + 1)
  return consecutive ? `#${ids[0]} – #${ids[ids.length - 1]}` : ids.map((id) => `#${id}`).join(', ')
}
