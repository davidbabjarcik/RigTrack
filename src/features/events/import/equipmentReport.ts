import type { Equipment, EquipmentKind } from '@/features/equipment/model'

// Equipment Report z Capture (vizualizácia svetiel) ako HTML alebo PDF.
// Obe podoby sa najprv prevedú na riadky textu; tabuľka má sekcie (Fixtures, Truss, Other),
// pod nimi hlavičku „# Name …“ a riadky „počet názov [uhly] [hmotnosť] [príkon]“.

export type ReportItem = { section: string; quantity: number; name: string }
export type EquipmentReport = { title: string; subtitle: string; items: ReportItem[] }

/** Stĺpce za názvom: uhly („6,8° - 58,4°“), hmotnosť („14,5kg“) a príkon („0,45kW“, „0W“). */
const TRAILING = /\s+(?:\d+(?:[.,]\d+)?°(?:\s*-\s*\d+(?:[.,]\d+)?°)?|\d+(?:[.,]\d+)?\s?kg|\d+(?:[.,]\d+)?\s?k?W)$/i

function stripColumns(text: string) {
  let name = text.trim()
  for (let previous = ''; previous !== name; ) {
    previous = name
    name = name.replace(TRAILING, '').trim()
  }
  return name
}

/** Prečíta riadky reportu. Riadky, ktoré nie sú technika (súčty, hlavičky), preskočí. */
export function parseReportLines(lines: string[]): EquipmentReport {
  const clean = lines.map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const title = (clean[0] ?? '').replace(/\s*Equipment Report$/i, '')
  const subtitle = clean[1] ?? ''
  const items: ReportItem[] = []
  let section = ''
  clean.forEach((line, index) => {
    if (clean[index + 1]?.startsWith('#')) {
      section = line
      return
    }
    const row = /^(\d+)\s+(.+)$/.exec(line)
    if (!row || index < 2) return
    const name = stripColumns(row[2])
    // Súčtový riadok („639,2kg 28,4kW“) po odstránení stĺpcov nemá názov.
    if (!name || /^[\d.,\s]+$/.test(name)) return
    items.push({ section, quantity: Number(row[1]), name })
  })
  return { title, subtitle, items }
}

/** HTML report → riadky textu tak, ako by vyšli z PDF (bunky riadku tabuľky spojené medzerou). */
export function htmlReportLines(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const lines: string[] = []
  for (const row of doc.querySelectorAll('tr')) {
    lines.push(
      [...row.querySelectorAll('td')]
        .map((cell) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? '')
        .filter(Boolean)
        .join(' '),
    )
  }
  return lines.filter(Boolean)
}

/** Názov na porovnanie: malé písmená, bez diakritiky a interpunkcie. */
export function normalizeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Druh novej techniky podľa sekcie reportu. */
export function kindForSection(section: string): EquipmentKind {
  return /fixture/i.test(section) ? 'light' : 'general'
}

export type Match =
  | { status: 'known'; equipmentId: string; via: 'alias' | 'name' }
  | { status: 'suggested'; equipmentId: string }
  | { status: 'unknown' }

const words = (name: string) => new Set(normalizeName(name).split(' ').filter((word) => word.length > 1))

/**
 * Nájde našu techniku k názvu z reportu: zapamätaný alias, rovnaký názov alebo „výrobca model“,
 * inak len návrh podľa spoločných slov (ten musí človek potvrdiť), inak nepoznám.
 */
export function matchReportItem(name: string, equipment: Equipment[], aliases: Map<string, string>): Match {
  const key = normalizeName(name)
  const alias = aliases.get(key)
  if (alias && equipment.some((item) => item.id === alias)) return { status: 'known', equipmentId: alias, via: 'alias' }
  const exact = equipment.find(
    (item) => normalizeName(item.name) === key || (item.model !== '' && normalizeName(`${item.manufacturer} ${item.model}`) === key),
  )
  if (exact) return { status: 'known', equipmentId: exact.id, via: 'name' }

  const wanted = words(name)
  let best: { id: string; score: number } | null = null
  for (const item of equipment) {
    const have = words(`${item.manufacturer} ${item.model} ${item.name}`)
    const common = [...wanted].filter((word) => have.has(word)).length
    // Podiel spoločných slov z oboch strán, aby „LED“ samo nič nespárovalo.
    const score = common / Math.max(wanted.size, 1) + common / Math.max(have.size, 1)
    if (common >= 2 && score > (best?.score ?? 0.9)) best = { id: item.id, score }
  }
  return best ? { status: 'suggested', equipmentId: best.id } : { status: 'unknown' }
}

const sameName = (a: Equipment, b: Equipment) => normalizeName(a.name) === normalizeName(b.name)

/**
 * Rozdelí počet z reportu medzi kusy evidované zvlášť pod rovnakým názvom
 * (napr. 12 Sharpy ako 12 samostatných položiek). Čo sa nezmestí, pripíše prvej.
 */
export function distribute(quantity: number, target: Equipment, equipment: Equipment[]) {
  const group = equipment.filter((item) => item.status !== 'retired' && sameName(item, target))
  const pieces = group.length > 0 ? group : [target]
  const result = new Map<string, number>()
  let rest = quantity
  for (const item of pieces) {
    if (rest <= 0) break
    const take = Math.min(rest, Math.max(item.quantity, 0))
    if (take > 0) result.set(item.id, take)
    rest -= take
  }
  if (rest > 0) result.set(pieces[0].id, (result.get(pieces[0].id) ?? 0) + rest)
  return result
}

/** Koľko kusov máme spolu pod názvom tejto techniky. */
export function ownedUnderName(target: Equipment, equipment: Equipment[]) {
  return equipment.filter((item) => item.status !== 'retired' && sameName(item, target)).reduce((sum, item) => sum + item.quantity, 0)
}
