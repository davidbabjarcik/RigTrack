// Synoptika akcie: blokové zapojenie signálu. Uzly sú obdĺžniky na plátne (súradnice v bodoch, ľavý horný roh),
// prepojenia vedú medzi uzlami a nesú druh signálu, kábel, dĺžku a počet.

export const NODE_KINDS = ['console', 'stagebox', 'rack', 'amp', 'speaker', 'processor', 'source', 'network', 'power', 'video', 'light', 'other'] as const
export type NodeKind = (typeof NODE_KINDS)[number]
export const NODE_KIND_LABELS: Record<NodeKind, string> = {
  console: 'Pult',
  stagebox: 'Stagebox',
  rack: 'Rack',
  amp: 'Zosilňovač',
  speaker: 'Reproduktor',
  processor: 'Procesor',
  source: 'Zdroj (mikrofón, prehrávač)',
  network: 'Sieť / switch',
  power: 'Elektrina',
  video: 'Video',
  light: 'Svetlo',
  other: 'Iné',
}

export const SIGNALS = ['analog', 'aes50', 'dante', 'madi', 'aes', 'ethernet', 'fiber', 'dmx', 'video', 'power', 'other'] as const
export type Signal = (typeof SIGNALS)[number]
export const SIGNAL_LABELS: Record<Signal, string> = {
  analog: 'Analóg',
  aes50: 'AES50',
  dante: 'Dante',
  madi: 'MADI',
  aes: 'AES/EBU',
  ethernet: 'Ethernet',
  fiber: 'Optika',
  dmx: 'DMX',
  video: 'Video',
  power: 'Elektrina',
  other: 'Iné',
}
/** Čiara podľa signálu – čitateľné aj čiernobielo (plná, čiarkovaná, bodkovaná…). */
export const SIGNAL_DASH: Record<Signal, string> = {
  analog: '',
  aes50: '12 4',
  dante: '12 4 3 4',
  madi: '6 3',
  aes: '3 3',
  ethernet: '12 4',
  fiber: '18 5',
  dmx: '2 4',
  video: '8 3 2 3',
  power: '1 5',
  other: '',
}

export const NODE_W = 180
export const NODE_H = 64

export type SynNode = { id: string; kind: NodeKind; label: string; detail: string; x: number; y: number; equipment_id: string | null; rack_id: string | null }
export type SynLink = { id: string; from: string; to: string; signal: Signal; cable: string; length_m: number | null; count: number; label: string }
export type Synoptic = { nodes: SynNode[]; links: SynLink[]; note: string; version: number; updatedAt: string | null }

export const EMPTY_SYNOPTIC: Synoptic = { nodes: [], links: [], note: '', version: 0, updatedAt: null }

const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
export const grid = (value: number) => Math.round(value / 10) * 10

/** Nový uzol na voľnom mieste (po stĺpcoch zľava doprava). */
export function newNode(kind: NodeKind, existing: SynNode[], fields: Partial<SynNode> = {}): SynNode {
  const index = existing.length
  return { id: uid('n'), kind, label: fields.label ?? NODE_KIND_LABELS[kind], detail: '', x: 40 + (index % 5) * 240, y: 40 + Math.floor(index / 5) * 130, equipment_id: null, rack_id: null, ...fields }
}

export function newLink(from: string, to: string, signal: Signal = 'analog'): SynLink {
  return { id: uid('l'), from, to, signal, cable: '', length_m: null, count: 1, label: '' }
}

/** Body čiary medzi okrajmi dvoch uzlov (nie stredmi – šípka končí na hrane). */
export function linkEnds(a: SynNode, b: SynNode) {
  const ca = { x: a.x + NODE_W / 2, y: a.y + NODE_H / 2 }
  const cb = { x: b.x + NODE_W / 2, y: b.y + NODE_H / 2 }
  const edge = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    if (dx === 0 && dy === 0) return from
    const scale = Math.min(Math.abs(NODE_W / 2 / (dx || 1e-9)), Math.abs(NODE_H / 2 / (dy || 1e-9)))
    return { x: from.x + dx * scale, y: from.y + dy * scale }
  }
  return { start: edge(ca, cb), end: edge(cb, ca) }
}

/** Text pri prepojení: kábel / signál, dĺžka, počet. */
export function linkText(link: SynLink) {
  const length = link.length_m ? `${link.length_m.toLocaleString('sk-SK')} m` : ''
  return [(link.count > 1 ? `${link.count}× ` : '') + (link.cable || SIGNAL_LABELS[link.signal]), length, link.label].filter(Boolean).join(' · ')
}

/** Súhrn káblov podľa typu (kábel, inak signál): počet kusov a celková dĺžka – na prípravu a pack list. */
export function cableSummary(links: SynLink[]) {
  const rows = new Map<string, { cable: string; pieces: number; meters: number; missing: number }>()
  for (const link of links) {
    const cable = link.cable.trim() || SIGNAL_LABELS[link.signal]
    const row = rows.get(cable) ?? { cable, pieces: 0, meters: 0, missing: 0 }
    row.pieces += link.count
    if (link.length_m) row.meters += link.length_m * link.count
    else row.missing += link.count
    rows.set(cable, row)
  }
  return [...rows.values()].sort((a, b) => a.cable.localeCompare(b.cable, 'sk'))
}

/** Upozornenia: prepojenie bez dĺžky, uzol bez prepojenia, prepojenie na neexistujúci uzol. */
export function synopticWarnings(synoptic: Pick<Synoptic, 'nodes' | 'links'>) {
  const ids = new Set(synoptic.nodes.map((node) => node.id))
  const warnings: string[] = []
  const broken = synoptic.links.filter((link) => !ids.has(link.from) || !ids.has(link.to))
  if (broken.length > 0) warnings.push(`${broken.length} prepojení vedie na zmazaný uzol`)
  const noLength = synoptic.links.filter((link) => !link.length_m && link.signal !== 'power').length
  if (noLength > 0) warnings.push(`${noLength} prepojení nemá dĺžku kábla`)
  const used = new Set(synoptic.links.flatMap((link) => [link.from, link.to]))
  const lonely = synoptic.nodes.filter((node) => !used.has(node.id))
  if (lonely.length > 0 && synoptic.nodes.length > 1) warnings.push(`Bez prepojenia: ${lonely.map((node) => node.label || NODE_KIND_LABELS[node.kind]).join(', ')}`)
  return warnings
}

/** Rozmery kresby (na prispôsobenie veľkosti SVG / PDF). */
export function bounds(nodes: SynNode[]) {
  if (nodes.length === 0) return { x: 0, y: 0, width: 800, height: 400 }
  const minX = Math.min(...nodes.map((node) => node.x)) - 30
  const minY = Math.min(...nodes.map((node) => node.y)) - 30
  const maxX = Math.max(...nodes.map((node) => node.x + NODE_W)) + 30
  const maxY = Math.max(...nodes.map((node) => node.y + NODE_H)) + 30
  return { x: minX, y: minY, width: Math.max(400, maxX - minX), height: Math.max(200, maxY - minY) }
}
