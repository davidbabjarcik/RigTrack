import type { Equipment } from '@/features/equipment/model'
import { CHANNEL_COLORS, EMPTY_LINE, PATCH_SOURCE_LABELS, STAND_LABELS, type ChannelColor, type PatchFields, type PatchLine, type Stand } from './model'
import type { OutputLine } from './outputs'

// Input / output list: varovania pred odoslaním, technika do pack listu, CSV a návrh z PDF ridera.

type Item = Pick<Equipment, 'id' | 'name' | 'manufacturer' | 'model' | 'quantity' | 'trackUnits' | 'unitIds' | 'attributes'>

export type IoWarning = { text: string; channels: number[] }

/** Varovania: duplicitný vstup stageboxu, kondenzátor bez phantomu, viac kanálov ako má pult, málo kusov techniky. */
export function ioWarnings(lines: PatchLine[], outputs: OutputLine[], equipment: Item[], mixerChannels: number | null): IoWarning[] {
  const warnings: IoWarning[] = []
  const byInput = new Map<string, PatchLine[]>()
  for (const line of lines) {
    if (!line.stagebox.trim() || line.stageboxInput === null) continue
    const key = `${line.stagebox.trim().toUpperCase()}|${line.stageboxInput}`
    byInput.set(key, [...(byInput.get(key) ?? []), line])
  }
  for (const [key, same] of byInput) {
    if (same.length > 1) warnings.push({ text: `Vstup ${key.replace('|', '-')} je použitý viackrát (kanály ${same.map((line) => line.channel).join(', ')})`, channels: same.map((line) => line.channel) })
  }
  const itemOf = (id: string | null) => (id ? equipment.find((item) => item.id === id) : undefined)
  const noPhantom = lines.filter((line) => !line.phantom && itemOf(line.equipmentId)?.attributes.micType === 'condenser')
  if (noPhantom.length > 0) warnings.push({ text: `Kondenzátorový mikrofón bez phantomu 48 V (kanály ${noPhantom.map((line) => line.channel).join(', ')})`, channels: noPhantom.map((line) => line.channel) })
  const highest = Math.max(0, ...lines.map((line) => line.channel))
  if (mixerChannels && highest > mixerChannels) {
    const over = lines.filter((line) => line.channel > mixerChannels)
    warnings.push({ text: `Pult na akcii má ${mixerChannels} vstupných kanálov, input list ide po kanál ${highest}`, channels: over.map((line) => line.channel) })
  }
  for (const [id, count] of usedEquipment(lines, outputs)) {
    const item = itemOf(id)
    if (!item) continue
    const have = item.trackUnits && item.unitIds.length > 0 ? item.unitIds.length : item.quantity
    if (count > have) warnings.push({ text: `${item.name}: v liste ${count}×, vo firme len ${have} ks`, channels: lines.filter((line) => line.equipmentId === id).map((line) => line.channel) })
  }
  return warnings
}

/** Koľko kusov ktorej techniky input / output list potrebuje (mikrofóny, DI, bezdrôtové systémy, monitory…). */
export function usedEquipment(lines: Pick<PatchLine, 'equipmentId'>[], outputs: Pick<OutputLine, 'equipmentId'>[] = []) {
  const counts = new Map<string, number>()
  for (const id of [...lines.map((line) => line.equipmentId), ...outputs.map((output) => output.equipmentId)]) {
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

/** Stojany podľa druhu (nie sú v technike ako kusy – len na prípravu). */
export function standCounts(lines: Pick<PatchLine, 'stand'>[]) {
  const counts = new Map<Stand, number>()
  for (const line of lines) if (line.stand && line.stand !== 'none') counts.set(line.stand, (counts.get(line.stand) ?? 0) + 1)
  return [...counts].map(([stand, count]) => `${count}× ${STAND_LABELS[stand]}`)
}

// ---------------------------------------------------------------------------- CSV

const HEADERS = ['Kanál', 'Názov', 'Zdroj', 'Mikrofón / DI', 'Stagebox', 'Vstup', 'Phantom', 'Insert', 'Stojan', 'Farba', 'Poznámka']
const cell = (value: string | number | null | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`

/** CSV input listu (bodkočiarka, UTF-8 s BOM – otvorí ho aj Excel). */
export function inputsCsv(lines: PatchLine[], equipmentName: (id: string) => string | undefined) {
  const rows = [...lines].sort((a, b) => a.channel - b.channel).map((line) => [
    line.channel,
    line.name,
    PATCH_SOURCE_LABELS[line.source],
    line.equipmentId ? (equipmentName(line.equipmentId) ?? '') : '',
    line.stagebox,
    line.stageboxInput,
    line.phantom ? '48V' : '',
    line.insertNote,
    line.stand ? STAND_LABELS[line.stand] : '',
    line.color,
    line.note,
  ])
  return '\uFEFF' + [HEADERS, ...rows].map((row) => row.map(cell).join(';')).join('\r\n')
}

const OUTPUT_HEADERS = ['Výstup', 'Názov', 'Druh', 'Mix', 'Cieľ', 'Stereo', 'Technika', 'Poznámka']
export function outputsCsv(outputs: OutputLine[], equipmentName: (id: string) => string | undefined, kindLabel: (kind: OutputLine['kind']) => string) {
  const rows = [...outputs].sort((a, b) => a.number - b.number).map((output) => [output.number, output.name, kindLabel(output.kind), output.mix, output.destination, output.stereo ? 'áno' : '', output.equipmentId ? (equipmentName(output.equipmentId) ?? '') : '', output.note])
  return '\uFEFF' + [OUTPUT_HEADERS, ...rows].map((row) => row.map(cell).join(';')).join('\r\n')
}

/** Rozdelí riadok CSV (úvodzovky, oddeľovač ; , alebo tabulátor). */
function splitCsv(line: string, separator: string) {
  const cells: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index++) {
    const char = line[index]
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"'
        index++
      } else if (char === '"') quoted = false
      else current += char
    } else if (char === '"') quoted = true
    else if (char === separator) {
      cells.push(current)
      current = ''
    } else current += char
  }
  cells.push(current)
  return cells.map((value) => value.trim())
}

const normal = (text: string) => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
const COLUMN_NAMES: Record<string, string[]> = {
  channel: ['kanal', 'ch', 'channel', 'kan', 'cislo', '#', 'no', 'input'],
  name: ['nazov', 'name', 'zdroj nastroj', 'nastroj', 'instrument', 'source', 'co'],
  mic: ['mikrofon / di', 'mikrofon', 'mic', 'mic/di', 'mic / di', 'di', 'microphone'],
  stagebox: ['stagebox', 'sb', 'box'],
  input: ['vstup', 'sb input', 'stagebox input', 'in', 'patch'],
  phantom: ['phantom', '48v', '+48', '48 v'],
  insert: ['insert', 'ins'],
  stand: ['stojan', 'stand'],
  color: ['farba', 'color', 'colour'],
  note: ['poznamka', 'note', 'notes', 'comment'],
}

/** Návrh riadkov input listu z CSV (Excel). Nič sa neukladá – len na kontrolu. */
export function parseInputsCsv(text: string, equipment: Item[]): PatchFields[] {
  const rows = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((row) => row.trim())
  if (rows.length === 0) return []
  const separator = [';', '\t', ','].find((candidate) => rows[0].includes(candidate)) ?? ';'
  const first = splitCsv(rows[0], separator)
  const header = !/^\d+$/.test(first[0] ?? '')
  const index: Record<string, number> = {}
  if (header) {
    first.forEach((name, position) => {
      const key = Object.entries(COLUMN_NAMES).find(([, names]) => names.includes(normal(name)))?.[0]
      if (key && index[key] === undefined) index[key] = position
    })
  } else Object.assign(index, { channel: 0, name: 1, mic: 2 })
  const result: PatchFields[] = []
  for (const row of rows.slice(header ? 1 : 0)) {
    const cells = splitCsv(row, separator)
    const get = (key: string) => (index[key] !== undefined ? (cells[index[key]] ?? '') : '')
    const channel = Number(get('channel')) || result.length + 1
    if (channel < 1 || channel > 512) continue
    result.push(lineFrom(channel, get('name'), get('mic'), equipment, {
      stagebox: get('stagebox'),
      input: get('input'),
      phantom: get('phantom'),
      insert: get('insert'),
      stand: get('stand'),
      color: get('color'),
      note: get('note'),
    }))
  }
  return result.slice(0, 512)
}

const CONDENSER = /\b(km ?18[0-9]|c ?414|c ?451|c ?535|nt5|nt1|sm81|e ?614|e ?914|kms|neumann|akg c|condenser|kondenz)/i

/** Riadok input listu z názvu a mikrofónu: mikrofón sa skúsi nájsť v technike, DI / phantom podľa textu. */
function lineFrom(channel: number, name: string, mic: string, equipment: Item[], extra: Partial<Record<'stagebox' | 'input' | 'phantom' | 'insert' | 'stand' | 'color' | 'note', string>> = {}): PatchFields {
  const micText = mic.trim()
  const words = normal(micText).split(/[\s/,-]+/).filter((word) => word.length >= 3)
  const match = micText
    ? equipment.find((item) => {
        const label = normal([item.name, item.manufacturer, item.model].join(' '))
        return words.length > 0 && words.every((word) => label.includes(word))
      })
    : undefined
  const isDi = /\bdi\b/i.test(micText) || /\bdi\b/i.test(name)
  const standText = normal(extra.stand ?? '')
  const stand: PatchFields['stand'] = /klip|clamp|clip/.test(standText) ? 'clamp' : /mal|short|low|niz/.test(standText) ? 'short' : /velk|tall|high|vys|boom/.test(standText) ? 'tall' : ''
  const color = (CHANNEL_COLORS as readonly string[]).includes(normal(extra.color ?? '')) ? (normal(extra.color ?? '') as ChannelColor) : ''
  const input = Number(extra.input)
  return {
    ...EMPTY_LINE,
    channel,
    name: name.trim().slice(0, 80),
    source: isDi ? 'di' : 'mic',
    equipmentId: match?.id ?? null,
    stagebox: (extra.stagebox ?? '').slice(0, 40),
    stageboxInput: Number.isInteger(input) && input >= 1 && input <= 512 ? input : null,
    phantom: /48|yes|ano|áno|x|\+/i.test(extra.phantom ?? '') || CONDENSER.test(micText) || match?.attributes.micType === 'condenser',
    insertNote: (extra.insert ?? '').slice(0, 60),
    stand,
    color,
    // Mikrofón z ridera, ktorý nie je v technike, ostane v poznámke.
    note: [match ? '' : micText, extra.note ?? ''].filter(Boolean).join(' · ').slice(0, 200),
  }
}

/**
 * Návrh input listu z textu PDF ridera: riadky „1 Kick In  Beta 91A“, „2. Snare top – SM57“, „03 | Bass | DI“.
 * Vráti riadky na kontrolu (nikdy sa neukladajú bez potvrdenia).
 */
export function parseRider(lines: string[], equipment: Item[]): PatchFields[] {
  const result: PatchFields[] = []
  const seen = new Set<number>()
  for (const raw of lines) {
    const match = /^\s*(?:ch\.?\s*)?(\d{1,2})[\s.:)|–-]+(.+)$/i.exec(raw)
    if (!match) continue
    const channel = Number(match[1])
    if (channel < 1 || channel > 64 || seen.has(channel)) continue
    const parts = match[2].split(/\s{2,}|\t|\s[|–-]\s|\s\|/).map((part) => part.trim()).filter(Boolean)
    if (parts.length === 0 || /^\d/.test(parts[0])) continue
    seen.add(channel)
    const [name, mic = '', ...rest] = parts
    result.push(lineFrom(channel, name, mic, equipment, { stand: rest.join(' '), note: '' }))
  }
  return result.sort((a, b) => a.channel - b.channel)
}
