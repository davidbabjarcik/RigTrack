import type { EquipmentAttributes } from '@/features/equipment/model'
import { channelCount } from './faces'
import { topU, type FitSlot, type slotInfo } from './fit'
import type { RackCategory } from './library'
import type { Accessory } from './model'

// Prepojenia v racku: porty prístrojov (podľa kategórie), káble medzi nimi, dĺžky a súhrn káblov.

export type PortKind = 'audio' | 'speaker' | 'power' | 'network' | 'rf' | 'dmx' | 'video' | 'patch'
export type Port = { id: string; label: string; kind: PortKind; dir: 'in' | 'out' | 'io' }

export const CABLES = ['XLR', 'NL4', 'power', 'CAT', 'BNC', 'DMX', 'video', 'other'] as const
export type Cable = (typeof CABLES)[number]
export const CABLE_LABELS: Record<Cable, string> = {
  XLR: 'XLR (signálový)',
  NL4: 'speakON NL4',
  power: 'Napájací',
  CAT: 'Sieťový (CAT / etherCON)',
  BNC: 'Anténny BNC',
  DMX: 'DMX (5-pin)',
  video: 'Video BNC (SDI)',
  other: 'Iný',
}
/** Farba kábla v kresbe. */
export const CABLE_COLORS: Record<Cable, string> = { XLR: '#38bdf8', NL4: '#a78bfa', power: '#ef4444', CAT: '#22c55e', BNC: '#facc15', DMX: '#fb923c', video: '#f472b6', other: '#a3a3a3' }

/** Prepojenie v editore (sloty podľa kľúča). */
export type RackLink = { key: string; from: string; fromPort: string; to: string; toPort: string; cable: Cable; lengthM: number | null; label: string }
/** Uložené prepojenie (sloty podľa poradia v osadení, od 1). */
export type StoredLink = { from: number; fromPort: string; to: number; toPort: string; cable: Cable; lengthM: number | null; label: string }

type PortInput = { category: RackCategory | null; accessory: Accessory | null; name: string; width: FitSlot['width']; attributes?: EquipmentAttributes }

const many = (count: number, id: (i: number) => string, label: (i: number) => string, kind: PortKind, dir: Port['dir']): Port[] =>
  Array.from({ length: count }, (_, index) => ({ id: id(index + 1), label: label(index + 1), kind, dir }))
const power: Port = { id: 'power', label: 'Napájanie', kind: 'power', dir: 'in' }
const net = (id = 'net', label = 'Sieť'): Port => ({ id, label, kind: 'network', dir: 'io' })

/** Porty prístroja (zjednodušene podľa kategórie, počtu kanálov a šírky). */
export function portsOf(input: PortInput): Port[] {
  const narrow = input.width !== 'full'
  if (input.accessory === 'pdu') return [{ id: 'in', label: 'Vstup', kind: 'power', dir: 'in' }, ...many(narrow ? 3 : 8, (i) => `out-${i}`, (i) => `Zásuvka ${i}`, 'power', 'out')]
  if (input.accessory === 'patch') return many(narrow ? 8 : 16, (i) => `p-${i}`, (i) => `Patch ${i}`, 'patch', 'io')
  if (input.accessory) return []
  const connectors = String(input.attributes?.connectors ?? '')
  const ampChannels = Number(connectors.match(/(\d+)\s*kan/)?.[1] ?? 0) || 4
  const channels = channelCount(input.name, input.width)
  const name = input.name.toLowerCase()
  switch (input.category) {
    case 'amp':
      return [
        ...many(ampChannels, (i) => `in-${i}`, (i) => `Vstup ${String.fromCharCode(64 + i)}`, 'audio', 'in'),
        ...many(ampChannels, (i) => `out-${i}`, (i) => `Výstup ${i} (NL4)`, 'speaker', 'out'),
        net(),
        power,
      ]
    case 'wireless':
      return [
        { id: 'ant-a', label: 'Anténa A', kind: 'rf', dir: 'in' },
        { id: 'ant-b', label: 'Anténa B', kind: 'rf', dir: 'in' },
        ...many(channels, (i) => `out-${i}`, (i) => `Výstup ${i}`, 'audio', 'out'),
        ...(narrow ? [] : [net()]),
        power,
      ]
    case 'iem':
      return [
        ...many(channels, (i) => `in-${i}`, (i) => `Vstup ${i}`, 'audio', 'in'),
        ...many(channels, (i) => `rf-${i}`, (i) => `Anténa ${i}`, 'rf', 'out'),
        power,
      ]
    case 'stagebox':
      return [
        ...many(16, (i) => `in-${i}`, (i) => `Vstup ${i}`, 'audio', 'in'),
        ...many(8, (i) => `out-${i}`, (i) => `Výstup ${i}`, 'audio', 'out'),
        net('net-a', 'Sieť A'),
        net('net-b', 'Sieť B'),
        power,
      ]
    case 'mixer':
      return [
        ...many(16, (i) => `in-${i}`, (i) => `Vstup ${i}`, 'audio', 'in'),
        ...many(8, (i) => `out-${i}`, (i) => `Výstup ${i}`, 'audio', 'out'),
        net('net-a', 'Sieť A'),
        net('net-b', 'Sieť B'),
        power,
      ]
    case 'processor':
      return [...many(3, (i) => `in-${i}`, (i) => `Vstup ${String.fromCharCode(64 + i)}`, 'audio', 'in'), ...many(6, (i) => `out-${i}`, (i) => `Výstup ${i}`, 'audio', 'out'), net(), power]
    case 'antenna':
      // Kombinér (in-ear) zlučuje vysielače do jednej antény; rozbočovač delí antény A/B pre prijímače.
      if (/pa821|ac 3|combin|kombin/.test(name)) return [...many(narrow ? 4 : 8, (i) => `in-${i}`, (i) => `Vstup ${i}`, 'rf', 'in'), { id: 'ant', label: 'Anténa', kind: 'rf', dir: 'out' }, power]
      return [
        { id: 'ant-a', label: 'Anténa A', kind: 'rf', dir: 'in' },
        { id: 'ant-b', label: 'Anténa B', kind: 'rf', dir: 'in' },
        ...many(narrow ? 2 : 4, (i) => `a-${i}`, (i) => `Výstup A${i}`, 'rf', 'out'),
        ...many(narrow ? 2 : 4, (i) => `b-${i}`, (i) => `Výstup B${i}`, 'rf', 'out'),
        power,
      ]
    case 'charger':
      return [net(), power]
    case 'power':
      return [{ id: 'in', label: 'Vstup', kind: 'power', dir: 'in' }, ...many(6, (i) => `out-${i}`, (i) => `Výstup ${i}`, 'power', 'out')]
    case 'network':
      return [...many(narrow ? 8 : 16, (i) => `port-${i}`, (i) => `Port ${i}`, 'network', 'io'), power]
    case 'light':
      return [{ id: 'dmx-in', label: 'DMX vstup', kind: 'dmx', dir: 'in' }, ...many(narrow ? 2 : 4, (i) => `dmx-${i}`, (i) => `DMX ${i}`, 'dmx', 'out'), net(), power]
    case 'video':
      return [...many(2, (i) => `in-${i}`, (i) => `Vstup ${i}`, 'video', 'in'), ...many(2, (i) => `out-${i}`, (i) => `Výstup ${i}`, 'video', 'out'), net(), power]
    default:
      return [power]
  }
}

/** Dajú sa dva porty spojiť (rovnaký druh, výstup do vstupu; patch a sieť oboma smermi)? */
export function compatible(a: Port, b: Port) {
  const signal = (kind: PortKind) => kind === 'audio' || kind === 'speaker'
  const kindOk = a.kind === b.kind || (a.kind === 'patch' && signal(b.kind)) || (b.kind === 'patch' && signal(a.kind))
  if (!kindOk) return false
  if (a.dir === 'io' || b.dir === 'io') return true
  return a.dir !== b.dir
}

/** Kábel podľa portov. */
export function cableFor(a: Port, b: Port): Cable {
  const kind = a.kind === 'patch' ? b.kind : a.kind
  return ({ audio: 'XLR', speaker: 'NL4', power: 'power', network: 'CAT', rf: 'BNC', dmx: 'DMX', video: 'video', patch: 'XLR' } as const)[kind]
}

const LENGTHS = [0.3, 0.5, 1, 1.5, 2, 3, 5, 10]
/** Odhad dĺžky kábla v racku: výškový rozdiel + rezerva na vedenie, zaokrúhlené na bežnú dĺžku. */
export function estimateLength(a: Pick<FitSlot, 'bottomU' | 'heightU'>, b: Pick<FitSlot, 'bottomU' | 'heightU'>) {
  const gapU = Math.max(0, Math.max(a.bottomU, b.bottomU) - Math.min(topU(a), topU(b)))
  const meters = gapU * 0.04445 + 0.4
  return LENGTHS.find((length) => length >= meters) ?? Math.ceil(meters)
}

/** Kľúče slotov → poradie v osadení (od 1) pri uložení; zahodí prepojenia na neexistujúce sloty. */
export function toStored(links: RackLink[], slots: Pick<FitSlot, 'key'>[]): StoredLink[] {
  const index = new Map(slots.map((slot, position) => [slot.key, position + 1]))
  return links.flatMap((link) => {
    const from = index.get(link.from)
    const to = index.get(link.to)
    return from && to && from !== to ? [{ from, fromPort: link.fromPort, to, toPort: link.toPort, cable: link.cable, lengthM: link.lengthM, label: link.label }] : []
  })
}

/** Uložené prepojenia → kľúče slotov (v poradí osadenia). */
export function fromStored(stored: StoredLink[], slots: Pick<FitSlot, 'key'>[], key: (index: number) => string): RackLink[] {
  return stored.flatMap((link, index) => {
    const from = slots[link.from - 1]?.key
    const to = slots[link.to - 1]?.key
    return from && to ? [{ key: key(index), from, fromPort: link.fromPort, to, toPort: link.toPort, cable: CABLES.includes(link.cable) ? link.cable : 'other', lengthM: link.lengthM === null || link.lengthM === undefined ? null : Number(link.lengthM), label: link.label ?? '' }] : []
  })
}

/** Súhrn káblov: typ a dĺžka → počet (pre balenie). */
export function cableSummary(links: Pick<RackLink, 'cable' | 'lengthM'>[]) {
  const counts = new Map<string, { cable: Cable; lengthM: number | null; count: number }>()
  for (const link of links) {
    const id = `${link.cable}|${link.lengthM ?? ''}`
    const current = counts.get(id) ?? { cable: link.cable, lengthM: link.lengthM, count: 0 }
    current.count++
    counts.set(id, current)
  }
  return [...counts.values()].sort((a, b) => CABLES.indexOf(a.cable) - CABLES.indexOf(b.cable) || (a.lengthM ?? 0) - (b.lengthM ?? 0))
}

/** „3× XLR (signálový) 1 m“ */
export const summaryText = (row: ReturnType<typeof cableSummary>[number], label: (text: string) => string = (text) => text) =>
  `${row.count}× ${label(CABLE_LABELS[row.cable])}${row.lengthM !== null ? ` ${String(row.lengthM).replace('.', ',')} m` : ''}`

export type SlotPorts = (slot: FitSlot) => { name: string; ports: Port[] }

/** Popis konca prepojenia: „Zosilňovač · Výstup 1 (NL4)“. */
export function endText(slots: FitSlot[], resolve: SlotPorts, key: string, portId: string) {
  const slot = slots.find((item) => item.key === key)
  if (!slot) return '?'
  const { name, ports } = resolve(slot)
  return `${name} · ${ports.find((port) => port.id === portId)?.label ?? portId}`
}

/** Porty slotov podľa údajov zariadenia (slotInfo). */
export const portsResolver =
  (describe: (slot: FitSlot) => ReturnType<typeof slotInfo>): SlotPorts =>
  (slot) => {
    const info = describe(slot)
    return { name: info.name, ports: portsOf({ category: info.category, accessory: slot.accessory, name: `${info.name} ${info.subtitle}`, width: slot.width, attributes: info.attributes }) }
  }
