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

const PORT_WORDS = /^(DMX vstup|Napájanie|Výstup|Vstup|Zásuvka|Anténa|Sieť)(.*)$/
/** Názov portu v jazyku rozhrania (prekladá sa len úvodné slovo: „Výstup 3 (NL4)“ → „Output 3 (NL4)“). */
export const portLabel = (label: string, translate: (text: string) => string = (text) => text) => {
  const match = label.match(PORT_WORDS)
  return match ? `${translate(match[1])}${match[2]}` : label
}

/** Názov portu len podľa jeho id (zdieľaný rack nemá údaje o prístrojoch): „out-3“ → „Výstup 3“. */
export function portLabelFromId(id: string, accessory?: string | null) {
  if (accessory === 'pdu' && /^out-\d+$/.test(id)) return `Zásuvka ${id.slice(4)}`
  const fixed: Record<string, string> = { power: 'Napájanie', net: 'Sieť', 'net-a': 'Sieť A', 'net-b': 'Sieť B', in: 'Vstup', ant: 'Anténa', 'ant-a': 'Anténa A', 'ant-b': 'Anténa B', 'dmx-in': 'DMX vstup' }
  if (fixed[id]) return fixed[id]
  const match = id.match(/^(in|out|rf|a|b|p|port|dmx)-(\d+)$/)
  if (!match) return id
  const words: Record<string, string> = { in: 'Vstup ', out: 'Výstup ', rf: 'Anténa ', a: 'Výstup A', b: 'Výstup B', p: 'Patch ', port: 'Port ', dmx: 'DMX ' }
  return `${words[match[1]]}${match[2]}`
}

/** Popis konca prepojenia: „Zosilňovač · Výstup 1 (NL4)“. */
export function endText(slots: FitSlot[], resolve: SlotPorts, key: string, portId: string, translate?: (text: string) => string) {
  const slot = slots.find((item) => item.key === key)
  if (!slot) return '?'
  const { name, ports } = resolve(slot)
  return `${name} · ${portLabel(ports.find((port) => port.id === portId)?.label ?? portId, translate)}`
}

/** Porty slotov podľa údajov zariadenia (slotInfo). */
export const portsResolver =
  (describe: (slot: FitSlot) => ReturnType<typeof slotInfo>): SlotPorts =>
  (slot) => {
    const info = describe(slot)
    return { name: info.name, ports: portsOf({ category: info.category, accessory: slot.accessory, name: `${info.name} ${info.subtitle}`, width: slot.width, attributes: info.attributes }) }
  }

type End = { slot: FitSlot; port: Port }

/**
 * Automatické zapojenie voľných portov podľa bežnej praxe:
 * napájanie do najbližšej zásuvky PDU / rozvádzača, anténny rozbočovač do HF prijímačov (A → A, B → B),
 * in-ear vysielače do kombinéra, HF prijímače do vstupov mixu / stageboxu, výstupy mixu / stageboxu do procesora
 * a z procesora do zosilňovačov (bez procesora rovno do zosilňovačov), zvyšné výstupy do in-ear vysielačov
 * a sieť do switchu. Existujúce prepojenia ostanú; vráti len nové.
 */
export function autoWire(slots: FitSlot[], links: RackLink[], resolve: SlotPorts, key: () => string, categoryOf: (slot: FitSlot) => RackCategory | null): RackLink[] {
  const used = new Set(links.flatMap((link) => [`${link.from}|${link.fromPort}`, `${link.to}|${link.toPort}`]))
  const added: RackLink[] = []
  const ordered = [...slots].sort((a, b) => b.bottomU + b.heightU - (a.bottomU + a.heightU) || a.col - b.col)
  const ends = (filter: (slot: FitSlot) => boolean, port: (port: Port) => boolean): End[] =>
    ordered.filter(filter).flatMap((slot) => resolve(slot).ports.filter((item) => port(item) && !used.has(`${slot.key}|${item.id}`)).map((item) => ({ slot, port: item })))
  const link = (from: End, to: End) => {
    used.add(`${from.slot.key}|${from.port.id}`)
    used.add(`${to.slot.key}|${to.port.id}`)
    added.push({ key: key(), from: from.slot.key, fromPort: from.port.id, to: to.slot.key, toPort: to.port.id, cable: cableFor(from.port, to.port), lengthM: estimateLength(from.slot, to.slot), label: '' })
  }
  /** Spáruje zdroje a ciele v poradí (každý port najviac raz). */
  const pair = (sources: End[], targets: End[]) => {
    const free = targets.filter((target) => !used.has(`${target.slot.key}|${target.port.id}`))
    for (const source of sources) {
      if (used.has(`${source.slot.key}|${source.port.id}`)) continue
      const index = free.findIndex((target) => target.slot.key !== source.slot.key && compatible(source.port, target.port))
      if (index < 0) continue
      link(source, free[index])
      free.splice(index, 1)
    }
  }
  const is = (...categories: RackCategory[]) => (slot: FitSlot) => categories.includes(categoryOf(slot) as RackCategory)
  const prefix = (text: string) => (port: Port) => port.id.startsWith(text)

  // Napájanie: každé zariadenie do najbližšej voľnej zásuvky.
  const outlets = (): End[] => ends((slot) => slot.accessory === 'pdu' || categoryOf(slot) === 'power', (port) => port.kind === 'power' && port.dir === 'out')
  for (const device of ends((slot) => slot.accessory !== 'pdu' && categoryOf(slot) !== 'power', (port) => port.id === 'power')) {
    const nearest = outlets().sort((a, b) => Math.abs(a.slot.bottomU - device.slot.bottomU) - Math.abs(b.slot.bottomU - device.slot.bottomU))[0]
    if (nearest) link(nearest, device)
  }

  // Antény: rozbočovač → prijímače (A do A, B do B); in-ear vysielače → kombinér.
  const isCombiner = (slot: FitSlot) => resolve(slot).ports.some((port) => port.id === 'ant' && port.dir === 'out')
  const splitters = (slot: FitSlot) => is('antenna')(slot) && !isCombiner(slot)
  pair(ends(splitters, prefix('a-')), ends(is('wireless'), (port) => port.id === 'ant-a'))
  pair(ends(splitters, prefix('b-')), ends(is('wireless'), (port) => port.id === 'ant-b'))
  pair(ends(is('iem'), prefix('rf-')), ends((slot) => is('antenna')(slot) && isCombiner(slot), prefix('in-')))

  // Signál: prijímače do mixu / stageboxu, mix / stagebox do procesora, procesor do zosilňovačov.
  const consoles = is('mixer', 'stagebox')
  pair(ends(is('wireless'), (port) => port.kind === 'audio' && port.dir === 'out'), ends(consoles, (port) => port.kind === 'audio' && port.dir === 'in'))
  const audioIn = (port: Port) => port.kind === 'audio' && port.dir === 'in'
  const audioOut = (port: Port) => port.kind === 'audio' && port.dir === 'out'
  if (ordered.some(is('processor'))) {
    pair(ends(consoles, audioOut).slice(0, ends(is('processor'), audioIn).length), ends(is('processor'), audioIn))
    pair(ends(is('processor'), audioOut), ends(is('amp'), audioIn))
  } else {
    pair(ends(consoles, audioOut), ends(is('amp'), audioIn))
  }
  pair(ends(consoles, audioOut), ends(is('iem'), audioIn))

  // Sieť: všetko so sieťovým portom do switchu.
  const firstPerSlot = (list: End[]) => list.filter((end, index) => list.findIndex((other) => other.slot.key === end.slot.key) === index)
  const switched = new Set(links.filter((item) => [item.from, item.to].some((key) => slots.some((slot) => slot.key === key && is('network')(slot)))).flatMap((item) => [item.from, item.to]))
  pair(firstPerSlot(ends((slot) => !is('network')(slot) && !switched.has(slot.key), (port) => port.kind === 'network')), ends(is('network'), (port) => port.kind === 'network'))
  return added
}
