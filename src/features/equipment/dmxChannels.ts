import type { DmxMode } from './model'

// Rozpis DMX kanálov: riadok = kanál, voliteľne „Názov | predvolená hodnota“ (napr. „Pan | 50 %“).
// Podľa názvu sa kanál zaradí do skupiny (stmievanie, farba, pozícia…) – podľa nej sa ukáže ikonka.
// Pozor: \b nefunguje pred písmenom s diakritikou, preto sú slovenské slová v regulárnych výrazoch bez neho.

export const CHANNEL_GROUPS = ['intensity', 'shutter', 'color', 'position', 'gobo', 'prism', 'beam', 'effect', 'speed', 'control', 'unused', 'other'] as const
export type ChannelGroup = (typeof CHANNEL_GROUPS)[number]

export const CHANNEL_GROUP_LABELS: Record<ChannelGroup, string> = {
  intensity: 'Stmievanie',
  shutter: 'Shutter / strobo',
  color: 'Farba',
  position: 'Pozícia',
  gobo: 'Gobo / vzor',
  prism: 'Prizma',
  beam: 'Lúč (zoom, focus, iris)',
  effect: 'Efekty a makrá',
  speed: 'Rýchlosť',
  control: 'Ovládanie',
  unused: 'Nepoužitý',
  other: 'Iné',
}

export type DmxChannel = { channel: number; name: string; value: string; group: ChannelGroup; fine: boolean; color: string | null }

const has = (text: string, pattern: RegExp) => pattern.test(text)

/** Skupina kanála podľa názvu (anglicky aj slovensky). */
export function channelGroup(name: string): ChannelGroup {
  const text = name.toLowerCase().replace(/\bfine\b/g, '').trim()
  if (!text || /^[-–—]+$/.test(text) || has(text, /\b(not used|unused|reserved|no function)\b|nepoužit|rezerv/)) return 'unused'
  if (has(text, /\b(reset|control|lamp|maintenance|fan|settings|special)\b|ovládan/)) return 'control'
  if (has(text, /\b(speed|rate|time)\b|rýchlos/)) return 'speed'
  if (has(text, /\b(shutter|strobe|blackout)\b|stroboskop/)) return 'shutter'
  if (has(text, /\b(dimmer|intensity|brightness|master)\b|stmievan|\bjas\b/)) return 'intensity'
  if (has(text, /\b(pan|tilt|position|xy)\b|pozíci/)) return 'position'
  if (has(text, /\b(colou?rs?|red|green|blue|white|amber|lime|uv|cyan|magenta|yellow|cto|ctb|cct|temperature|hue|saturation|rgbw?|mint|indigo|warm|cold|cool)\b|farb/)) return 'color'
  if (has(text, /\b(gobos?|pattern|animation|media)\b|vzor/)) return 'gobo'
  if (has(text, /\bprism/)) return 'prism'
  if (has(text, /\b(zoom|focus|iris|frost|beam|edge|diffusion|diffuser|blades?|framing|shaper)\b|lúč/)) return 'beam'
  if (has(text, /\b(effects?|fx|macros?|programs?|auto|sound|chase|show|pixel)\b|efekt|makro/)) return 'effect'
  if (has(text, /\b(mode|function)\b|režim/)) return 'control'
  return 'other'
}

/** Farebné kanály dostanú bodku vo svojej farbe. */
const CHANNEL_COLORS: [RegExp, string][] = [
  [/\b(warm ?white|ww)\b/, '#fde68a'],
  [/\b(cold|cool) ?white\b|\bcw\b/, '#e0f2fe'],
  [/\bred\b|červen/, '#ef4444'],
  [/\bgreen\b|zelen/, '#22c55e'],
  [/\bblue\b|modr/, '#3b82f6'],
  [/\bwhite\b|biel/, '#f8fafc'],
  [/\bamber\b|jantár/, '#f59e0b'],
  [/\blime\b/, '#a3e635'],
  [/\b(uv|ultra ?violet)\b/, '#8b5cf6'],
  [/\bcyan\b/, '#06b6d4'],
  [/\bmagenta\b/, '#d946ef'],
  [/\byellow\b|žlt/, '#facc15'],
  [/\bmint\b/, '#6ee7b7'],
  [/\bindigo\b/, '#4f46e5'],
]

export function channelColor(name: string): string | null {
  const text = name.toLowerCase()
  if (has(text, /\b(wheel|macros?|speed|temperature|cto|ctb)\b|koliesk/)) return null
  return CHANNEL_COLORS.find(([pattern]) => pattern.test(text))?.[1] ?? null
}

/** Jeden riadok rozpisu → názov a predvolená hodnota (oddelené „|“ alebo tabulátorom). */
export function parseChannelLine(line: string) {
  const match = /^(.*?)\s*(?:\||\t)\s*(.*)$/.exec(line)
  return match ? { name: match[1].trim(), value: match[2].trim() } : { name: line.trim(), value: '' }
}

/** Rozpis módu na kanály; prázdne riadky sa preskočia (kanál drží číslo podľa riadka). */
export function dmxChannels(mode: Pick<DmxMode, 'map'>): DmxChannel[] {
  return (mode.map ?? '')
    .split('\n')
    .map((line, index) => ({ channel: index + 1, ...parseChannelLine(line) }))
    .filter((row) => row.name || row.value)
    .map((row) => ({ ...row, group: channelGroup(row.name), fine: /\bfine\b/i.test(row.name), color: channelColor(row.name) }))
}

// --- Farby svetla: miešanie (RGBW, CMY…) a farebné koliesko ---

export const COLOR_PARTS = ['R', 'G', 'B', 'W', 'A', 'UV', 'L', 'C', 'M', 'Y', 'CTO'] as const
export type ColorPart = (typeof COLOR_PARTS)[number]
export const COLOR_PART_LABELS: Record<ColorPart, string> = {
  R: 'červená (R)',
  G: 'zelená (G)',
  B: 'modrá (B)',
  W: 'biela (W)',
  A: 'jantárová (A)',
  UV: 'UV',
  L: 'lime (L)',
  C: 'cyan (C)',
  M: 'magenta (M)',
  Y: 'žltá (Y)',
  CTO: 'CTO',
}
export const COLOR_PART_HEX: Record<ColorPart, string> = {
  R: '#ef4444',
  G: '#22c55e',
  B: '#3b82f6',
  W: '#f8fafc',
  A: '#f59e0b',
  UV: '#8b5cf6',
  L: '#a3e635',
  C: '#06b6d4',
  M: '#d946ef',
  Y: '#facc15',
  CTO: '#fdba74',
}

export type WheelColor = { name: string; hex: string }
export type ColorWheel = { slots?: number; colors: WheelColor[] }

/** Názov miešania podľa zložiek: RGBW, RGBA+UV, CMY… */
export function colorMixName(parts: readonly ColorPart[]) {
  const order: ColorPart[] = ['R', 'G', 'B', 'W', 'A', 'L']
  const additive = order.filter((part) => parts.includes(part)).join('')
  const uv = parts.includes('UV') ? (additive ? '+UV' : 'UV') : ''
  const subtractive = (['C', 'M', 'Y'] as ColorPart[]).filter((part) => parts.includes(part)).join('')
  return [additive + uv, subtractive, parts.includes('CTO') ? 'CTO' : ''].filter(Boolean).join(' + ')
}

/** Farby, ktoré sa dajú pridať do kolieska jedným ťuknutím. */
export const NAMED_COLORS: WheelColor[] = [
  { name: 'Open (biela)', hex: '#ffffff' },
  { name: 'Červená', hex: '#e11d26' },
  { name: 'Oranžová', hex: '#f97316' },
  { name: 'Žltá', hex: '#facc15' },
  { name: 'Svetlozelená', hex: '#84cc16' },
  { name: 'Zelená', hex: '#16a34a' },
  { name: 'Tyrkysová', hex: '#14b8a6' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Svetlomodrá', hex: '#38bdf8' },
  { name: 'Modrá', hex: '#2563eb' },
  { name: 'Tmavomodrá', hex: '#1e3a8a' },
  { name: 'Levanduľová', hex: '#a78bfa' },
  { name: 'Fialová', hex: '#7c3aed' },
  { name: 'Magenta', hex: '#d946ef' },
  { name: 'Ružová', hex: '#f472b6' },
  { name: 'CTO', hex: '#fdba74' },
  { name: 'CTB', hex: '#bfdbfe' },
  { name: 'UV', hex: '#6d28d9' },
]

const COLOR_WORDS: [RegExp, string][] = [
  [/\b(open|white)\b|biel/, '#ffffff'],
  [/\bred\b|červen/, '#e11d26'],
  [/\borange\b|oranž/, '#f97316'],
  [/\byellow\b|žlt/, '#facc15'],
  [/\b(lime|light green)\b|svetlozelen/, '#84cc16'],
  [/\bgreen\b|zelen/, '#16a34a'],
  [/\b(turquoise|teal)\b|tyrkys/, '#14b8a6'],
  [/\bcyan\b|azúr/, '#06b6d4'],
  [/\blight blue\b|svetlomodr/, '#38bdf8'],
  [/\b(dark blue|congo)\b|tmavomodr/, '#1e3a8a'],
  [/\bblue\b|modr/, '#2563eb'],
  [/\blavender\b|levand/, '#a78bfa'],
  [/\b(purple|violet)\b|fial/, '#7c3aed'],
  [/\bmagenta\b|purpur/, '#d946ef'],
  [/\bpink\b|ružov/, '#f472b6'],
  [/\b(cto|warm)\b/, '#fdba74'],
  [/\b(ctb|cool|cold)\b/, '#bfdbfe'],
  [/\buv\b/, '#6d28d9'],
]

/** Farba podľa názvu (slovensky aj anglicky), alebo null. */
export function guessColor(name: string): string | null {
  const text = name.toLowerCase()
  return COLOR_WORDS.find(([pattern]) => pattern.test(text))?.[1] ?? null
}

const PART_WORDS: [RegExp, ColorPart][] = [
  [/\bred\b/, 'R'],
  [/\bgreen\b/, 'G'],
  [/\bblue\b/, 'B'],
  [/\bwhite\b/, 'W'],
  [/\bamber\b/, 'A'],
  [/\b(uv|ultra ?violet)\b/, 'UV'],
  [/\blime\b/, 'L'],
  [/\bcyan\b/, 'C'],
  [/\bmagenta\b/, 'M'],
  [/\byellow\b/, 'Y'],
  [/\bcto\b/, 'CTO'],
]

/** Odhad farieb z rozpisu kanálov, keď ich pri svetle nikto nezadal (napr. svetlá z databázy techniky). */
export function colorsFromChannels(modes: Pick<DmxMode, 'map'>[]): { parts: ColorPart[]; wheel: boolean } {
  const parts = new Set<ColorPart>()
  let wheel = false
  for (const mode of modes) {
    for (const { name } of dmxChannels(mode)) {
      const text = name.toLowerCase()
      if (/\bcolou?r ?(wheel|[12])?$|\bcolou?r wheel\b|farebné koliesko/.test(text)) wheel = true
      for (const [pattern, part] of PART_WORDS) if (pattern.test(text)) parts.add(part)
    }
  }
  return { parts: COLOR_PARTS.filter((part) => parts.has(part)), wheel }
}
