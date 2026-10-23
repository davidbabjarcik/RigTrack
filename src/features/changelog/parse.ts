// „Čo je nové“ sa číta priamo z README (sekcia „## Čo je nové“), aby sa zmeny písali len raz.

export type Release = {
  version: string
  date: string
  /** Odseky: zoznam odrážok alebo bežný text (napr. „Nové migrácie: 0049“). */
  blocks: ({ kind: 'list'; items: string[] } | { kind: 'text'; text: string })[]
}

/** Vytiahne vydania zo sekcie „## Čo je nové“; najnovšie prvé, tak ako sú v README. */
export function parseChangelog(markdown: string): Release[] {
  const start = markdown.search(/^## Čo je nové\s*$/m)
  if (start < 0) return []
  const rest = markdown.slice(start).split('\n').slice(1)
  const end = rest.findIndex((line) => /^## /.test(line))
  const lines = end < 0 ? rest : rest.slice(0, end)

  const releases: Release[] = []
  let current: Release | null = null
  let paragraph: string[] = []
  const flush = () => {
    if (current && paragraph.length) current.blocks.push({ kind: 'text', text: paragraph.join(' ') })
    paragraph = []
  }
  for (const raw of lines) {
    const heading = raw.match(/^### (.+?)(?:\s+[–-]\s+(.+))?\s*$/)
    if (heading) {
      flush()
      current = { version: heading[1].trim(), date: heading[2]?.trim() ?? '', blocks: [] }
      releases.push(current)
      continue
    }
    if (!current) continue
    const bullet = raw.match(/^\s*[-*] (.+)$/)
    const last = current.blocks[current.blocks.length - 1]
    if (bullet) {
      flush()
      if (last?.kind === 'list') last.items.push(bullet[1].trim())
      else current.blocks.push({ kind: 'list', items: [bullet[1].trim()] })
    } else if (raw.trim() === '' || raw.trim() === '---') {
      flush()
    } else if (/^\s{2,}\S/.test(raw) && last?.kind === 'list' && paragraph.length === 0) {
      // Pokračovanie odrážky na ďalšom riadku.
      last.items[last.items.length - 1] += ` ${raw.trim()}`
    } else {
      paragraph.push(raw.trim())
    }
  }
  flush()
  return releases
}

export type InlinePart = { kind: 'text' | 'bold' | 'code'; text: string }

/** **tučné** a `kód` v riadku. */
export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = []
  const pattern = /\*\*(.+?)\*\*|`([^`]+)`/g
  let index = 0
  for (const match of text.matchAll(pattern)) {
    if (match.index! > index) parts.push({ kind: 'text', text: text.slice(index, match.index) })
    parts.push(match[1] !== undefined ? { kind: 'bold', text: match[1] } : { kind: 'code', text: match[2] })
    index = match.index! + match[0].length
  }
  if (index < text.length) parts.push({ kind: 'text', text: text.slice(index) })
  return parts
}

/** Rovnaká verzia? „1.11“ = „1.11.0“, ale „1.1“ ≠ „1.11“. */
export function sameVersion(a: string, b: string) {
  const parts = (version: string) => version.trim().split('.').map(Number)
  const left = parts(a)
  const right = parts(b)
  const length = Math.max(left.length, right.length)
  return Array.from({ length }, (_, index) => (left[index] ?? 0) === (right[index] ?? 0)).every(Boolean)
}

// Technické poznámky o migráciách databázy (odsek aj odrážka) sú pre vývojára, nie pre používateľa.
const TECHNICAL = /migráci/i

/** Text vydania pre používateľa: bez technických riadkov o migráciách databázy. */
export function forUsers(release: Release): Release {
  const blocks = release.blocks
    .map((block) => (block.kind === 'list' ? { ...block, items: block.items.filter((item) => !TECHNICAL.test(item)) } : block))
    .filter((block) => (block.kind === 'list' ? block.items.length > 0 : !TECHNICAL.test(block.text)))
  return { ...release, blocks }
}
