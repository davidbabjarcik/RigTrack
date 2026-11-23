import type { ChannelColor, PatchLine } from './model'
import type { OutputLine } from './outputs'

// Scéna Behringer X32 / M32 (.scn): textový súbor, riadok = OSC adresa a hodnoty, napr.
//   #4.0# "Nazov" "" %000000000 1
//   /config/routing/IN AN1-8 AN9-16 A1-8 A9-16 AUX1-4
//   /ch/01/config "Kick" 1 RD 1        (meno max 12 znakov, ikona, farba, zdroj 1–32 = vstup podľa routingu)
//   /headamp/032 +23.0 ON              (zisk, phantom; 000–031 lokálne vstupy, 032–079 AES50 A, 080–127 AES50 B)
//   /bus/01/config "Wedge 1" 1 CY
// RigTrack nevyrába scénu od nuly – upraví scénu stiahnutú z pultu, ostatné nastavenia nechá tak.

export const X32_COLORS: Record<ChannelColor, string> = { red: 'RD', green: 'GN', yellow: 'YE', blue: 'BL', magenta: 'MG', cyan: 'CY', white: 'WH' }
const COLOR_TOKENS = new Set(['OFF', 'RD', 'GN', 'YE', 'BL', 'MG', 'CY', 'WH', 'OFFi', 'RDi', 'GNi', 'YEi', 'BLi', 'MGi', 'CYi', 'WHi'])
export const X32_NAME_MAX = 12
export const X32_MAX_SCENE_BYTES = 1_000_000

export type SceneChange = { before: string; after: string }
export type SceneResult = { text: string; changes: SceneChange[]; warnings: string[] }

/** Meno pre scribble strip: bez diakritiky a úvodzoviek, len tlačiteľné ASCII, max 12 znakov. */
export function x32Name(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/["\\]/g, "'")
    .replace(/[^\x20-\x7e]/g, '')
    .trim()
    .slice(0, X32_NAME_MAX)
    .trim()
}

/** Rozdelí riadok scény na tokeny (reťazce v úvodzovkách ostanú celé aj s úvodzovkami). */
function tokens(line: string) {
  return line.match(/"[^"]*"|\S+/g) ?? []
}

/** Prvý headamp bloku 8 vstupov podľa routingu (AN1-8 → 0, A1-8 → 32, B1-8 → 80); karta / USB nemá headamp. */
export function headampBase(block: string): number | null {
  const match = /^(AN|A|B)(\d+)-\d+$/.exec(block)
  if (!match) return null
  const first = Number(match[2]) - 1
  const offset = match[1] === 'AN' ? 0 : match[1] === 'A' ? 32 : 80
  const limit = match[1] === 'AN' ? 32 : 48
  return first >= 0 && first < limit ? offset + first : null
}

/** Headamp pre zdroj kanála 1–32 podľa riadku /config/routing/IN (4 bloky po 8 vstupoch). */
export function headampFor(source: number, routingIn: string[]): number | null {
  if (!Number.isInteger(source) || source < 1 || source > 32) return null
  const block = routingIn[Math.floor((source - 1) / 8)]
  const base = block ? headampBase(block) : null
  return base === null ? null : base + ((source - 1) % 8)
}

const pad = (value: number, size: number) => String(value).padStart(size, '0')

/**
 * Do scény z pultu zapíše input list (mená a farby kanálov 1–32, phantom podľa routingu)
 * a mená busov z output listu („Mix 3“ → bus 3). Vráti nový text, zoznam zmien a varovania.
 */
export function applyToScene(scene: string, lines: Pick<PatchLine, 'channel' | 'name' | 'color' | 'phantom'>[], outputs: Pick<OutputLine, 'name' | 'mix'>[]): SceneResult {
  const eol = scene.includes('\r\n') ? '\r\n' : '\n'
  const rows = scene.split(/\r?\n/)
  if (!/^#\d+\.\d+#/.test(rows[0] ?? '')) throw new Error('not-a-scene')
  const warnings: string[] = []
  const changes: SceneChange[] = []
  const indexOf = new Map<string, number>()
  rows.forEach((row, index) => {
    const address = row.split(' ', 1)[0]
    if (address.startsWith('/')) indexOf.set(address, index)
  })
  const routingRow = indexOf.get('/config/routing/IN')
  const routingIn = routingRow === undefined ? [] : tokens(rows[routingRow]).slice(1)
  const replace = (index: number, next: string) => {
    if (rows[index] === next) return
    changes.push({ before: rows[index], after: next })
    rows[index] = next
  }

  const over = lines.filter((line) => line.channel > 32).map((line) => line.channel)
  if (over.length > 0) warnings.push(`Kanály nad 32 sa do scény nezapíšu (${over.join(', ')})`)
  const noPhantom: number[] = []
  for (const line of [...lines].filter((item) => item.channel >= 1 && item.channel <= 32).sort((a, b) => a.channel - b.channel)) {
    const address = `/ch/${pad(line.channel, 2)}/config`
    const index = indexOf.get(address)
    if (index === undefined) {
      warnings.push(`V scéne chýba riadok ${address}`)
      continue
    }
    const [, , icon = '1', color = 'OFF', source = '0', ...rest] = tokens(rows[index])
    const nextColor = line.color ? X32_COLORS[line.color] + (color.endsWith('i') ? 'i' : '') : COLOR_TOKENS.has(color) ? color : 'OFF'
    replace(index, [address, `"${x32Name(line.name)}"`, icon, nextColor, source, ...rest].join(' '))
    const headamp = headampFor(Number(source), routingIn)
    if (headamp === null) {
      if (line.phantom) noPhantom.push(line.channel)
      continue
    }
    const headIndex = indexOf.get(`/headamp/${pad(headamp, 3)}`)
    if (headIndex === undefined) continue
    const [headAddress, gain = '+0.0', current = 'OFF', ...headRest] = tokens(rows[headIndex])
    const want = line.phantom ? 'ON' : 'OFF'
    if (current !== want) replace(headIndex, [headAddress, gain, want, ...headRest].join(' '))
  }
  if (noPhantom.length > 0) warnings.push(`Phantom sa nedá nastaviť – vstup kanála nemá predzosilňovač podľa routingu (kanály ${noPhantom.join(', ')})`)

  const buses = new Set<number>()
  for (const output of outputs) {
    const bus = Number(/(\d+)/.exec(output.mix)?.[1])
    if (!/mix|bus|aux/i.test(output.mix) || !Number.isInteger(bus) || bus < 1 || bus > 16 || buses.has(bus)) continue
    buses.add(bus)
    const address = `/bus/${pad(bus, 2)}/config`
    const index = indexOf.get(address)
    if (index === undefined) continue
    const [, , icon = '1', color = 'OFF', ...rest] = tokens(rows[index])
    replace(index, [address, `"${x32Name(output.name)}"`, icon, color, ...rest].join(' '))
  }
  return { text: rows.join(eol), changes, warnings }
}
