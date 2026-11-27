import type { Equipment, EquipmentAttributes } from '@/features/equipment/model'
import { catalogMatch, withCatalog } from './library'
import { ACCESSORY_LABELS, type Accessory, type RackDesign, type RackSlot, type SlotWidth } from './model'

// Osadenie racku: polohy v mriežke, údaje zariadení (z techniky / katalógu / ručne), varovania a súhrn.
// Šírka racku je rozdelená na 6 dielov: celá = 0–5, polovica = 3 diely, tretina = 2 diely.

export type FitSlot = Omit<RackSlot, 'id'> & { key: string }

type CatalogLike = { id: string; kind?: string; manufacturer: string; model: string; attributes: EquipmentAttributes }
export type Sources = { equipment: Pick<Equipment, 'id' | 'name' | 'manufacturer' | 'model' | 'kind' | 'attributes'>[]; catalog: CatalogLike[] }

export const columnsOf = (width: SlotWidth) => (width === 'full' ? 1 : width === 'half' ? 2 : 3)
/** Diely šírky (0–5), ktoré slot zaberá. */
export function partsOf(slot: Pick<FitSlot, 'width' | 'col'>): [number, number] {
  const size = 6 / columnsOf(slot.width)
  const col = Math.min(Math.max(0, slot.col), columnsOf(slot.width) - 1)
  return [col * size, col * size + size - 1]
}
export const topU = (slot: Pick<FitSlot, 'bottomU' | 'heightU'>) => slot.bottomU + slot.heightU - 1

/** Prekrývajú sa dva sloty (rovnaká strana, spoločné U aj diel šírky)? */
export function overlaps(a: FitSlot, b: FitSlot) {
  if (a.key === b.key || a.side !== b.side) return false
  if (topU(a) < b.bottomU || topU(b) < a.bottomU) return false
  const [a0, a1] = partsOf(a)
  const [b0, b1] = partsOf(b)
  return a0 <= b1 && b0 <= a1
}

/** Údaje zariadenia v slote: ručne zadané majú prednosť pred technikou a katalógom. */
export function slotInfo(slot: FitSlot, sources: Sources) {
  const item = slot.equipmentId ? sources.equipment.find((piece) => piece.id === slot.equipmentId) : undefined
  const entry = slot.catalogId ? sources.catalog.find((model) => model.id === slot.catalogId) : undefined
  // Technika firmy bez hmotnosti / príkonu / hĺbky: doplní ich rovnaký model z databázy techniky.
  const attributes = item ? withCatalog(item.attributes, catalogMatch(item, sources.catalog)) : entry?.attributes ?? {}
  const name = slot.label
    || (slot.accessory ? ACCESSORY_LABELS[slot.accessory] : '')
    || (item ? `${item.name}${slot.unit ? ` #${slot.unit}` : ''}` : '')
    || (entry ? [entry.manufacturer, entry.model].filter(Boolean).join(' ') : '')
    || 'Zariadenie'
  const subtitle = item ? [item.manufacturer, item.model].filter(Boolean).join(' ') : ''
  return {
    name,
    subtitle: subtitle && subtitle !== name ? subtitle : '',
    kind: item?.kind ?? (entry ? entry.kind ?? 'audio' : slot.accessory ? 'accessory' : 'general'),
    weightKg: slot.weightKg ?? attributes.weightKg ?? null,
    powerW: slot.powerW ?? attributes.powerW ?? null,
    depthMm: slot.depthMm ?? attributes.depthMm ?? null,
    rearSupport: slot.rearSupport ?? attributes.rearSupport ?? false,
  }
}

/** Nový slot z techniky / katalógu / doplnku s výškou a šírkou z údajov. */
export function newSlot(key: string, source: { equipmentId?: string; unit?: number | null; catalogId?: string; accessory?: Accessory }, attributes: EquipmentAttributes, at: { side: 'front' | 'rear'; bottomU: number; col?: number }): FitSlot {
  const width: SlotWidth = attributes.rackWidth ?? 'full'
  return {
    key,
    side: at.side,
    bottomU: at.bottomU,
    heightU: Math.min(48, Math.max(1, attributes.rackU ?? 1)),
    width,
    col: Math.min(at.col ?? 0, columnsOf(width) - 1),
    equipmentId: source.equipmentId ?? null,
    unit: source.unit ?? null,
    catalogId: source.catalogId ?? null,
    accessory: source.accessory ?? null,
    label: '',
    depthMm: null,
    weightKg: null,
    powerW: null,
    rearSupport: null,
  }
}

/** Najnižšie miesto, kam sa slot zmestí bez prekrytia (aj iný stĺpec pri polovičných / tretinových); null = nikam. */
export function freePlace(slot: FitSlot, slots: FitSlot[], units: number): { bottomU: number; col: number } | null {
  for (let bottom = 1; bottom + slot.heightU - 1 <= units; bottom++) {
    for (let col = 0; col < columnsOf(slot.width); col++) {
      const candidate = { ...slot, bottomU: bottom, col }
      if (!slots.some((other) => overlaps(candidate, other))) return { bottomU: bottom, col }
    }
  }
  return null
}

export type Warning = { level: 'warn' | 'info'; text: string; keys: string[] }

const HEAVY_KG = 10
const PDU_W = 3680 // 16 A × 230 V

/** Varovania k osadeniu (nič neblokujú). */
export function rackWarnings(rack: Pick<RackDesign, 'units' | 'depthMm' | 'rails' | 'maxLoadKg'>, slots: FitSlot[], sources: Sources): Warning[] {
  const warnings: Warning[] = []
  const info = new Map(slots.map((slot) => [slot.key, slotInfo(slot, sources)]))
  const nameOf = (slot: FitSlot) => info.get(slot.key)!.name

  // Prekrytie a presah.
  const seen = new Set<string>()
  for (const a of slots) {
    for (const b of slots) {
      const pair = [a.key, b.key].sort().join('|')
      if (seen.has(pair) || !overlaps(a, b)) continue
      seen.add(pair)
      warnings.push({ level: 'warn', text: `Prekrytie: ${nameOf(a)} a ${nameOf(b)} (${a.side === 'front' ? 'predok' : 'zadok'}, U ${Math.max(a.bottomU, b.bottomU)})`, keys: [a.key, b.key] })
    }
    if (a.bottomU < 1 || topU(a) > rack.units) warnings.push({ level: 'warn', text: `${nameOf(a)} presahuje mimo rack (${rack.units} U)`, keys: [a.key] })
  }

  // Hĺbka: zariadenie hlbšie ako rack; predok a zadok v rovnakých U spolu hlbšie ako rack.
  if (rack.depthMm) {
    for (const slot of slots) {
      const depth = info.get(slot.key)!.depthMm
      if (depth && depth > rack.depthMm) warnings.push({ level: 'warn', text: `${nameOf(slot)} je hlboké ${depth} mm, rack má ${rack.depthMm} mm`, keys: [slot.key] })
    }
    for (const front of slots.filter((slot) => slot.side === 'front')) {
      for (const rear of slots.filter((slot) => slot.side === 'rear')) {
        if (topU(front) < rear.bottomU || topU(rear) < front.bottomU) continue
        const [f0, f1] = partsOf(front)
        const [r0, r1] = partsOf(rear)
        if (f1 < r0 || r1 < f0) continue
        const sum = (info.get(front.key)!.depthMm ?? 0) + (info.get(rear.key)!.depthMm ?? 0)
        if (sum > rack.depthMm) warnings.push({ level: 'warn', text: `Predok ${nameOf(front)} a zadok ${nameOf(rear)} spolu ${sum} mm – nezmestia sa do hĺbky ${rack.depthMm} mm`, keys: [front.key, rear.key] })
      }
    }
  }

  // Hmotnosť: nad nosnosť a ťažké kusy vysoko (ťažisko).
  const load = slots.reduce((sum, slot) => sum + (info.get(slot.key)!.weightKg ?? 0), 0)
  if (rack.maxLoadKg && load > rack.maxLoadKg) warnings.push({ level: 'warn', text: `Obsah váži ${round(load)} kg, nosnosť racku je ${rack.maxLoadKg} kg`, keys: [] })
  const half = rack.units / 2
  const heavyHigh = slots.filter((slot) => (info.get(slot.key)!.weightKg ?? 0) >= HEAVY_KG && slot.bottomU > half)
  if (heavyHigh.length > 0) {
    const lowFree = Array.from({ length: Math.floor(half) }, (_, index) => index + 1).some((u) => !slots.some((slot) => slot.side === 'front' && slot.bottomU <= u && topU(slot) >= u))
    if (lowFree) warnings.push({ level: 'warn', text: `Ťažké kusy vysoko (${heavyHigh.map(nameOf).join(', ')}) – dole je voľné miesto, ťažisko bude hore`, keys: heavyHigh.map((slot) => slot.key) })
  }
  // Ťažké / hlboké zariadenie, ktoré potrebuje zadné uchytenie.
  for (const slot of slots) {
    const data = info.get(slot.key)!
    if (data.rearSupport && rack.rails === 'front') warnings.push({ level: 'warn', text: `${nameOf(slot)} potrebuje zadné uchytenie, rack má len predné lišty`, keys: [slot.key] })
    else if (!data.rearSupport && (data.weightKg ?? 0) >= 15) warnings.push({ level: 'warn', text: `${nameOf(slot)} váži ${data.weightKg} kg – skontrolujte zadné uchytenie`, keys: [slot.key] })
  }

  // Príkon vs. PDU.
  const power = slots.reduce((sum, slot) => sum + (info.get(slot.key)!.powerW ?? 0), 0)
  const pdus = slots.filter((slot) => slot.accessory === 'pdu').length
  if (power > 0 && pdus === 0) warnings.push({ level: 'info', text: `Príkon ${power} W a v racku nie je PDU`, keys: [] })
  if (pdus > 0 && power > pdus * PDU_W) warnings.push({ level: 'warn', text: `Príkon ${power} W je nad ${pdus * PDU_W} W (${pdus}× PDU 16 A)`, keys: [] })

  // Prázdne U spredu bez záslepky (len info).
  const empty = Array.from({ length: rack.units }, (_, index) => index + 1).filter((u) => !slots.some((slot) => slot.side === 'front' && slot.bottomU <= u && topU(slot) >= u))
  if (empty.length > 0 && slots.length > 0) warnings.push({ level: 'info', text: `Spredu ${empty.length} U bez záslepky (U ${compactRanges(empty)})`, keys: [] })
  return warnings
}

const round = (value: number) => Math.round(value * 10) / 10

/** „1–3, 7, 9–10“ */
export function compactRanges(values: number[]) {
  const parts: string[] = []
  for (let index = 0; index < values.length; index++) {
    const start = values[index]
    while (index + 1 < values.length && values[index + 1] === values[index] + 1) index++
    parts.push(start === values[index] ? String(start) : `${start}–${values[index]}`)
  }
  return parts.join(', ')
}

/** Prúd pri 230 V z príkonu vo W (na 1 desatinné miesto). */
export const ampsAt230 = (watts: number) => Math.round((watts / 230) * 10) / 10

/**
 * Súhrn: obsadené / voľné U (predok), hmotnosť racku s obsahom, príkon a prúd pri 230 V, počet položiek
 * a prístrojov (bez doplnkov) a koľko prístrojov nemá zadanú hmotnosť.
 */
export function rackSummary(rack: Pick<RackDesign, 'units' | 'ownWeightKg'>, slots: FitSlot[], sources: Sources) {
  const used = new Set<number>()
  for (const slot of slots.filter((item) => item.side === 'front')) for (let u = slot.bottomU; u <= topU(slot); u++) if (u >= 1 && u <= rack.units) used.add(u)
  const contents = slots.reduce((sum, slot) => sum + (slotInfo(slot, sources).weightKg ?? 0), 0)
  const devices = slots.filter((slot) => !slot.accessory)
  const powerW = slots.reduce((sum, slot) => sum + (slotInfo(slot, sources).powerW ?? 0), 0)
  return {
    usedU: used.size,
    freeU: rack.units - used.size,
    units: rack.units,
    contentsKg: round(contents),
    totalKg: round(contents + (rack.ownWeightKg ?? 0)),
    powerW,
    amps: ampsAt230(powerW),
    items: slots.filter((slot) => slot.accessory !== 'blank').length,
    devices: devices.length,
    noWeight: devices.filter((slot) => slotInfo(slot, sources).weightKg == null).length,
  }
}
