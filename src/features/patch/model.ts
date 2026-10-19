/** Patch list zvuku pri evente: kanál, čo na ňom ide, stagebox a zdroj. */

export const PATCH_SOURCES = ['mic', 'wireless', 'di', 'port', 'other'] as const
export type PatchSource = (typeof PATCH_SOURCES)[number]
export const PATCH_SOURCE_LABELS: Record<PatchSource, string> = {
  mic: 'Mikrofón',
  wireless: 'Bezdrôtový mikrofón',
  di: 'DI box',
  port: 'Port (kábel)',
  other: 'Iné',
}

export const CONNECTORS = ['xlr', 'jack', 'other'] as const
export type Connector = (typeof CONNECTORS)[number]
export const CONNECTOR_LABELS: Record<Connector, string> = { xlr: 'XLR (madona)', jack: 'Jack', other: 'Iné' }

export const STANDS = ['short', 'tall', 'clamp', 'none'] as const
export type Stand = (typeof STANDS)[number]
export const STAND_LABELS: Record<Stand, string> = { short: 'Nízky stojan', tall: 'Vysoký stojan', clamp: 'Klipsa', none: 'Bez stojana' }

export type PatchLine = {
  id: string
  channel: number
  name: string
  stagebox: string
  stageboxInput: number | null
  source: PatchSource
  equipmentId: string | null
  capsuleId: string | null
  connector: Connector | ''
  stand: Stand | ''
  phantom: boolean
  note: string
}

export type PatchFields = Omit<PatchLine, 'id'>

export const EMPTY_LINE: PatchFields = {
  channel: 1,
  name: '',
  stagebox: '',
  stageboxInput: null,
  source: 'mic',
  equipmentId: null,
  capsuleId: null,
  connector: '',
  stand: '',
  phantom: false,
  note: '',
}

/** Ďalší voľný kanál a ďalší vstup na tom istom stageboxe ako posledný riadok. */
export function nextLine(lines: PatchLine[]): PatchFields {
  const last = [...lines].sort((a, b) => a.channel - b.channel).at(-1)
  if (!last) return { ...EMPTY_LINE, stagebox: 'SB1', stageboxInput: 1 }
  return {
    ...EMPTY_LINE,
    channel: Math.min(512, Math.max(...lines.map((line) => line.channel)) + 1),
    stagebox: last.stagebox,
    stageboxInput: last.stageboxInput ? Math.min(512, last.stageboxInput + 1) : null,
    stand: last.stand,
  }
}

/** Zdroj riadku slovami: „Shure SM58“, „ULX-D + Beta 58A“, „DI box“, „Jack“. */
export function describeSource(line: Pick<PatchLine, 'source' | 'equipmentId' | 'capsuleId' | 'connector'>, equipmentName: (id: string) => string | undefined, capsuleName: (id: string) => string | undefined) {
  const item = line.equipmentId ? equipmentName(line.equipmentId) : undefined
  if (line.source === 'port') return line.connector ? CONNECTOR_LABELS[line.connector] : 'Port'
  if (line.source === 'wireless') return [item ?? 'Bezdrôtový', line.capsuleId && capsuleName(line.capsuleId)].filter(Boolean).join(' + ')
  return item ?? PATCH_SOURCE_LABELS[line.source]
}

/** Súhrn na prípravu: koľko ktorých mikrofónov, kapsúl, DI, stojanov a portov treba. */
export function patchSummary(lines: PatchLine[], equipmentName: (id: string) => string | undefined, capsuleName: (id: string) => string | undefined) {
  const counts = new Map<string, number>()
  const add = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1)
  for (const line of lines) {
    if ((line.source === 'mic' || line.source === 'di' || line.source === 'wireless') && line.equipmentId) add(equipmentName(line.equipmentId) ?? PATCH_SOURCE_LABELS[line.source])
    else if (line.source === 'di') add('DI box')
    if (line.source === 'wireless' && line.capsuleId) add(`kapsula ${capsuleName(line.capsuleId) ?? ''}`.trim())
    if (line.source === 'port') add(`kábel ${line.connector ? CONNECTOR_LABELS[line.connector] : ''}`.trim())
    if (line.stand && line.stand !== 'none') add(STAND_LABELS[line.stand])
  }
  return {
    items: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'sk')),
    phantom: lines.filter((line) => line.phantom).length,
    stageboxes: [...new Set(lines.map((line) => line.stagebox).filter(Boolean))],
  }
}

/** Kanály, ktoré sú v patch liste dvakrát (chyba pri zadávaní). */
export function duplicateChannels(lines: PatchLine[]) {
  const seen = new Set<number>()
  const dup = new Set<number>()
  for (const line of lines) {
    if (seen.has(line.channel)) dup.add(line.channel)
    seen.add(line.channel)
  }
  return dup
}
