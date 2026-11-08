// Elektrika eventu po miestach: kde čo stojí (strecha, rampy, pódium, zvuk…), rozfázovanie,
// odporúčaný prívod ku každému miestu, externé dimmery a elektrocentrály (aj požičané od inej firmy).
import type { Equipment } from '@/features/equipment/model'
import type { EventEquipment } from './model'
import { unitWatts } from './eventPower'

export const ZONE_KINDS = ['light', 'sound', 'video', 'stage', 'other'] as const
export type ZoneKind = (typeof ZONE_KINDS)[number]
export const ZONE_KIND_LABELS: Record<ZoneKind, string> = { light: 'Svetlá', sound: 'Zvuk', video: 'Video', stage: 'Pódium / backline', other: 'Iné' }

/** Bežné miesta na evente – ťuknutím sa pridajú. */
export const ZONE_PRESETS: { name: string; kind: ZoneKind }[] = [
  { name: 'Strecha', kind: 'light' },
  { name: 'Predná rampa', kind: 'light' },
  { name: 'Zadná rampa', kind: 'light' },
  { name: 'Svetlá na pódiu', kind: 'light' },
  { name: 'Predné svietenie', kind: 'light' },
  { name: 'Hlavný zvuk (PA)', kind: 'sound' },
  { name: 'Odposluchy', kind: 'sound' },
  { name: 'Kapela (backline)', kind: 'stage' },
  { name: 'Réžia (FOH)', kind: 'other' },
  { name: 'Video / LED', kind: 'video' },
]

export type ZoneItem = { equipmentId: string; quantity: number }
export type PowerZone = { id: string; name: string; kind: ZoneKind; items: ZoneItem[]; /** Ďalší odber mimo techniky (kW), napr. bar. */ extraKw: number }
export type Generator = { id: string; name: string; kva: number; /** Firma, od ktorej je požičaná (prázdne = vlastná). */ supplier: string; partnerId: string | null; note: string }
export type PowerPlan = { zones: PowerZone[]; generators: Generator[] }

export const EMPTY_POWER_PLAN: PowerPlan = { zones: [], generators: [] }

/** Prívod: jednofázový (230 V) alebo trojfázový (400 V), ampéry na fázu. */
export type Feed = { id: string; label: string; phases: 1 | 3; amps: number }
export const FEEDS: Feed[] = [
  { id: 'schuko16', label: 'Zásuvka 230 V (16 A)', phases: 1, amps: 16 },
  { id: 'cee32_1f', label: 'CEE 32 A modrá (230 V)', phases: 1, amps: 32 },
  { id: 'cee16', label: 'CEE 16 A (400 V)', phases: 3, amps: 16 },
  { id: 'cee32', label: 'CEE 32 A (400 V)', phases: 3, amps: 32 },
  { id: 'cee63', label: 'CEE 63 A (400 V)', phases: 3, amps: 63 },
  { id: 'cee125', label: 'CEE 125 A (400 V)', phases: 3, amps: 125 },
  { id: 'powerlock', label: 'Powerlock 400 A (400 V)', phases: 3, amps: 400 },
]

/** Pri dlhodobom zaťažení sa prívod nemá ťahať nad 80 % – „optimálny“ prívod má túto rezervu. */
export const CONTINUOUS_LOAD = 0.8
const VOLTS = 230
/** Okruh Socapexu (6 okruhov po 16 A, 230 V). */
const SOCAPEX_CIRCUITS = 6
/** Kanál bežného dimmera (2,3 kW); väčšie svetlá potrebujú 5 kW kanál. */
const DIMMER_CHANNEL_W = 2300

const amps = (watts: number) => Math.round((watts / VOLTS) * 10) / 10

export type Load = { name: string; watts: number; dimmed: boolean }

/** Kusy techniky v mieste (každý kus zvlášť) + ďalší odber; technika bez príkonu sa vráti v `unknown`. */
export function zoneLoads(zone: Pick<PowerZone, 'items' | 'extraKw'>, equipment: Equipment[]) {
  const loads: Load[] = []
  const unknown: string[] = []
  for (const line of zone.items) {
    const item = equipment.find((candidate) => candidate.id === line.equipmentId)
    if (!item) continue
    const watts = unitWatts(item)
    if (watts <= 0) {
      unknown.push(item.name)
      continue
    }
    for (let n = 0; n < line.quantity; n++) loads.push({ name: item.name, watts, dimmed: Boolean(item.attributes.externalDimmer) })
  }
  // Ďalší odber (bar, catering…) sa rozloží na tri rovnaké časti, aby sa dal rozfázovať.
  if (zone.extraKw > 0) for (let n = 0; n < 3; n++) loads.push({ name: 'Ďalší odber', watts: (zone.extraKw * 1000) / 3, dimmed: false })
  return { loads, unknown: [...new Set(unknown)] }
}

/** Rozdelí záťaže na fázy (každá na najmenej zaťaženú, od najväčšej). */
export function splitPhases(loads: Pick<Load, 'watts'>[], phaseCount: 1 | 3) {
  const phases = Array.from({ length: phaseCount }, () => 0)
  for (const load of [...loads].sort((a, b) => b.watts - a.watts)) {
    const low = phases.indexOf(Math.min(...phases))
    phases[low] += load.watts
  }
  return phases
}

export type FeedChoice = { feed: Feed; usage: number } | null

/** Najmenší prívod daného typu, na ktorý sa záťaž zmestí (pri `limit` 1 = 100 %, 0,8 = s rezervou). */
function smallestFeed(loads: Load[], phases: 1 | 3, limit: number): FeedChoice {
  const split = splitPhases(loads, phases)
  const highest = amps(Math.max(...split))
  for (const feed of FEEDS.filter((candidate) => candidate.phases === phases)) {
    if (highest <= feed.amps * limit) return { feed, usage: Math.round((highest / feed.amps) * 100) }
  }
  return null
}

export type FeedAdvice = { onePhase: { minimum: FeedChoice; optimal: FeedChoice }; threePhase: { minimum: FeedChoice; optimal: FeedChoice; phases: number[] } }

/** Odporúčaný prívod: minimálny (do 100 %) a optimálny (do 80 %), jednofázový aj trojfázový. */
export function adviseFeed(loads: Load[]): FeedAdvice {
  return {
    onePhase: { minimum: smallestFeed(loads, 1, 1), optimal: smallestFeed(loads, 1, CONTINUOUS_LOAD) },
    threePhase: { minimum: smallestFeed(loads, 3, 1), optimal: smallestFeed(loads, 3, CONTINUOUS_LOAD), phases: splitPhases(loads, 3) },
  }
}

/** Koľko 16 A okruhov treba (s rezervou 80 %) a koľko Socapexov po 6 okruhoch. */
export function socapexAdvice(loads: Load[]) {
  const limit = 16 * VOLTS * CONTINUOUS_LOAD
  const circuits: number[] = []
  for (const load of [...loads].sort((a, b) => b.watts - a.watts)) {
    if (load.watts > limit) return null
    const fit = circuits.findIndex((used) => used + load.watts <= limit)
    if (fit === -1) circuits.push(load.watts)
    else circuits[fit] += load.watts
  }
  if (circuits.length === 0) return null
  return { circuits: circuits.length, cables: Math.ceil(circuits.length / SOCAPEX_CIRCUITS) }
}

export type DimmerAdvice = { channels: number; bigChannels: number; watts: number; voltage: 230 | 400; feed: Feed; usage: number }

/**
 * Dimmer pre svetlá bez DMX: kanál na kus (nad 2,3 kW 5 kW kanál), 230 V dimmer, kým sa zmestí
 * do jednofázového prívodu s rezervou, inak 400 V (trojfázový) s najmenším vhodným prívodom.
 */
export function dimmerAdvice(loads: Load[]): DimmerAdvice | null {
  const dimmed = loads.filter((load) => load.dimmed)
  if (dimmed.length === 0) return null
  const watts = dimmed.reduce((sum, load) => sum + load.watts, 0)
  const bigChannels = dimmed.filter((load) => load.watts > DIMMER_CHANNEL_W).length
  const single = smallestFeed(dimmed, 1, CONTINUOUS_LOAD)
  const choice = single ?? smallestFeed(dimmed, 3, CONTINUOUS_LOAD)
  if (!choice) return null
  return { channels: dimmed.length, bigChannels, watts, voltage: single ? 230 : 400, feed: choice.feed, usage: choice.usage }
}

/** Technika eventu, ktorá ešte nie je zaradená do žiadneho miesta (len s príkonom alebo svetlá / zvuk). */
export function unassigned(lines: EventEquipment[], zones: PowerZone[], equipment: Equipment[]): ZoneItem[] {
  const placed = new Map<string, number>()
  for (const zone of zones) for (const item of zone.items) placed.set(item.equipmentId, (placed.get(item.equipmentId) ?? 0) + item.quantity)
  return lines
    .filter((line) => {
      const item = equipment.find((candidate) => candidate.id === line.equipmentId)
      return item && (unitWatts(item) > 0 || ['light', 'audio', 'video', 'dj'].includes(item.kind))
    })
    .map((line) => ({ equipmentId: line.equipmentId, quantity: line.quantity - (placed.get(line.equipmentId) ?? 0) }))
    .filter((line) => line.quantity > 0)
}

/** Technika zaradená viackrát, než koľko kusov je na evente (napr. po zmenšení počtu). */
export function overAssigned(lines: EventEquipment[], zones: PowerZone[]) {
  const placed = new Map<string, number>()
  for (const zone of zones) for (const item of zone.items) placed.set(item.equipmentId, (placed.get(item.equipmentId) ?? 0) + item.quantity)
  return [...placed].filter(([id, count]) => count > (lines.find((line) => line.equipmentId === id)?.quantity ?? 0)).map(([id]) => id)
}

/** Bežné veľkosti elektrocentrál (kVA). */
export const GENERATOR_SIZES = [6, 10, 15, 20, 30, 45, 60, 80, 100, 150, 200, 250, 300, 400, 500, 650, 800, 1000]
/** Účinník záťaže pri prepočte kW → kVA. */
const POWER_FACTOR = 0.8

/**
 * Elektrocentrála: výkon sa ráta z najviac zaťaženej fázy × 3 (centrála musí utiahnuť každú fázu),
 * minimum bez rezervy, optimum s rezervou 25 %. Vráti aj najbližšiu bežnú veľkosť.
 */
export function generatorAdvice(phases: number[]) {
  const highest = Math.max(0, ...phases)
  if (highest <= 0) return null
  const minimumKva = (highest * 3) / 1000 / POWER_FACTOR
  const optimalKva = minimumKva / CONTINUOUS_LOAD
  const size = (kva: number) => GENERATOR_SIZES.find((candidate) => candidate >= kva) ?? Math.ceil(kva)
  return { minimumKva: Math.round(minimumKva * 10) / 10, optimalKva: Math.round(optimalKva * 10) / 10, minimumSize: size(minimumKva), optimalSize: size(optimalKva) }
}

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : '')
const num = (value: unknown, max: number) => (typeof value === 'number' && Number.isFinite(value) ? Math.min(Math.max(value, 0), max) : 0)

/** Uložený plán z databázy (jsonb) – čo nesedí, zahodí. */
export function readPowerPlan(raw: unknown): PowerPlan {
  if (!raw || typeof raw !== 'object') return EMPTY_POWER_PLAN
  const value = raw as { zones?: unknown; generators?: unknown }
  const zones = (Array.isArray(value.zones) ? value.zones : []).slice(0, 40).flatMap((zone): PowerZone[] => {
    if (!zone || typeof zone !== 'object') return []
    const z = zone as Record<string, unknown>
    const kind = ZONE_KINDS.includes(z.kind as ZoneKind) ? (z.kind as ZoneKind) : 'other'
    const items = (Array.isArray(z.items) ? z.items : []).slice(0, 200).flatMap((item): ZoneItem[] => {
      const i = item as Record<string, unknown>
      return item && typeof i.equipmentId === 'string' && num(i.quantity, 10000) >= 1 ? [{ equipmentId: i.equipmentId, quantity: Math.floor(num(i.quantity, 10000)) }] : []
    })
    return [{ id: text(z.id, 40) || crypto.randomUUID(), name: text(z.name, 80), kind, items, extraKw: num(z.extraKw, 2000) }]
  })
  const generators = (Array.isArray(value.generators) ? value.generators : []).slice(0, 20).flatMap((generator): Generator[] => {
    if (!generator || typeof generator !== 'object') return []
    const g = generator as Record<string, unknown>
    return [{ id: text(g.id, 40) || crypto.randomUUID(), name: text(g.name, 80), kva: num(g.kva, 5000), supplier: text(g.supplier, 120), partnerId: typeof g.partnerId === 'string' ? g.partnerId : null, note: text(g.note, 200) }]
  })
  return { zones, generators }
}
