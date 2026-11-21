// Rozloženie v case (0186): časti (napr. šuplíky „Šuplík 1 – SM 57, 58“ alebo „Priehradky“), každá s mriežkou
// riadkov × stĺpcov, a čo je v ktorej priehradke. Technika po kusoch po jednotlivých kusoch, ostatná s počtom kusov
// (napr. 6 z 10 SM58 v šuplíku 1, zvyšok inde).

export type SlotItem = { equipmentId: string; unit: number | null; count: number }
export type LayoutCell = { items: SlotItem[]; note: string }
export type LayoutSection = { name: string; rows: number; cols: number; cells: LayoutCell[] }
export type CaseLayout = { sections: LayoutSection[] }
export type Where = { section: number; cell: number }

export const MAX_SIDE = 8
export const MAX_SECTIONS = 12
const UUID = /^[0-9a-f-]{36}$/i
const clampSide = (value: unknown) => Math.min(MAX_SIDE, Math.max(1, Math.floor(Number(value) || 1)))
const emptyCell = (): LayoutCell => ({ items: [], note: '' })

type Piece = { id: string; name: string; quantity: number; trackUnits: boolean; unitIds: number[] }
const unitsOf = (piece: Piece) => (piece.unitIds.length > 0 ? piece.unitIds : Array.from({ length: piece.quantity }, (_, index) => index + 1))

function readSection(raw: Record<string, unknown>, fallbackName: string): LayoutSection {
  const rows = clampSide(raw.rows)
  const cols = clampSide(raw.cols)
  const cells = Array.isArray(raw.cells) ? (raw.cells as unknown[]) : []
  return {
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.slice(0, 80) : fallbackName,
    rows,
    cols,
    cells: Array.from({ length: rows * cols }, (_, index) => {
      const cell = (cells[index] ?? {}) as Record<string, unknown>
      const items = Array.isArray(cell.items) ? (cell.items as Record<string, unknown>[]) : []
      return {
        items: items
          .filter((item) => item && typeof item.equipmentId === 'string' && UUID.test(item.equipmentId))
          .slice(0, 50)
          .map((item) => ({
            equipmentId: item.equipmentId as string,
            unit: Number.isInteger(item.unit) ? (item.unit as number) : null,
            // Bez počtu (staršie zápisy) = celá položka.
            count: Number.isInteger(item.count) && (item.count as number) > 0 ? Math.min(item.count as number, 100000) : 0,
          })),
        note: typeof cell.note === 'string' ? cell.note.slice(0, 120) : '',
      }
    }),
  }
}

/** Uložené rozloženie; prázdne alebo pokazené = case bez rozloženia (null). Staršie jednoduché mriežky = jedna časť. */
export function readLayout(raw: unknown): CaseLayout | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  if (Array.isArray(data.sections)) {
    const sections = (data.sections as Record<string, unknown>[])
      .filter((section) => section && typeof section === 'object')
      .slice(0, MAX_SECTIONS)
      .map((section, index) => readSection(section, `Časť ${index + 1}`))
    return sections.length > 0 ? { sections } : null
  }
  if (data.rows === undefined || data.cols === undefined) return null
  return { sections: [readSection(data, 'Priehradky')] }
}

export function addSection(layout: CaseLayout | null, name: string, rows: number, cols: number): CaseLayout {
  const section = { name: name.trim().slice(0, 80) || 'Priehradky', rows: clampSide(rows), cols: clampSide(cols), cells: [] as LayoutCell[] }
  section.cells = Array.from({ length: section.rows * section.cols }, emptyCell)
  return { sections: [...(layout?.sections ?? []), section].slice(0, MAX_SECTIONS) }
}

export function removeSection(layout: CaseLayout, index: number): CaseLayout | null {
  const sections = layout.sections.filter((_, at) => at !== index)
  return sections.length > 0 ? { sections } : null
}

/** Iný názov alebo veľkosť časti; priehradky ostanú na rovnakom mieste (riadok, stĺpec), čo sa nezmestí, vypadne. */
export function editSection(layout: CaseLayout, index: number, name: string, rows: number, cols: number): CaseLayout {
  return {
    sections: layout.sections.map((section, at) => {
      if (at !== index) return section
      const next = { rows: clampSide(rows), cols: clampSide(cols) }
      return {
        name: name.trim().slice(0, 80) || section.name,
        ...next,
        cells: Array.from({ length: next.rows * next.cols }, (_, cell) => {
          const row = Math.floor(cell / next.cols)
          const col = cell % next.cols
          return row < section.rows && col < section.cols ? section.cells[row * section.cols + col] : emptyCell()
        }),
      }
    }),
  }
}

export type Placeable = { equipmentId: string; unit: number | null; label: string; quantity: number }

/** Čo sa dá rozložiť: technika v case, technika po kusoch po jednotlivých kusoch. */
export function placeables(content: Piece[]): Placeable[] {
  return content.flatMap((piece): Placeable[] =>
    piece.trackUnits
      ? unitsOf(piece).map((unit) => ({ equipmentId: piece.id, unit, label: `${piece.name} #${unit}`, quantity: 1 }))
      : [{ equipmentId: piece.id, unit: null, label: piece.name, quantity: Math.max(1, piece.quantity) }],
  )
}

const same = (a: { equipmentId: string; unit: number | null }, b: { equipmentId: string; unit: number | null }) => a.equipmentId === b.equipmentId && a.unit === b.unit
const allItems = (layout: CaseLayout) => layout.sections.flatMap((section) => section.cells.flatMap((cell) => cell.items))
/** Koľko kusov položky je kde rozložených (bez počtu = celá položka). */
const placedOf = (layout: CaseLayout, item: Placeable) =>
  allItems(layout).filter((other) => same(other, item)).reduce((sum, other) => sum + (item.unit !== null ? 1 : other.count || item.quantity), 0)

/** Čo ešte nie je nikde rozložené, pri položkách s počtom koľko kusov ostáva. */
export function unplaced(layout: CaseLayout, content: Piece[]) {
  return placeables(content)
    .map((item) => ({ ...item, remaining: item.quantity - placedOf(layout, item) }))
    .filter((item) => item.remaining > 0)
}

/** Rozloženie bez techniky, ktorá z case medzičasom zmizla (alebo počtov, ktoré už nesedia). */
export function withoutGone(layout: CaseLayout, content: Piece[]): CaseLayout {
  const valid = placeables(content)
  return {
    sections: layout.sections.map((section) => ({
      ...section,
      cells: section.cells.map((cell) => ({
        ...cell,
        items: cell.items
          .map((item) => ({ item, piece: valid.find((other) => same(other, item)) }))
          .filter((row) => row.piece)
          .map(({ item, piece }) => ({ ...item, count: item.unit !== null ? 1 : Math.min(item.count || piece!.quantity, piece!.quantity) })),
      })),
    })),
  }
}

const mapCells = (layout: CaseLayout, fn: (cell: LayoutCell, where: Where) => LayoutCell): CaseLayout => ({
  sections: layout.sections.map((section, s) => ({ ...section, cells: section.cells.map((cell, c) => fn(cell, { section: s, cell: c })) })),
})
const isAt = (where: Where, target: Where) => where.section === target.section && where.cell === target.cell

/**
 * Pridá do priehradky. Kus techniky po kusoch je len na jednom mieste (z iného sa presunie); položka s počtom
 * pribudne v danom počte (najviac toľko, koľko ešte nie je rozložené, v tej istej priehradke sa sčíta).
 */
export function placeIn(layout: CaseLayout, target: Where, item: Placeable, count = 1): CaseLayout {
  if (item.unit !== null) {
    return mapCells(layout, (cell, where) => {
      const items = cell.items.filter((other) => !same(other, item))
      return isAt(where, target) ? { ...cell, items: [...items, { equipmentId: item.equipmentId, unit: item.unit, count: 1 }] } : { ...cell, items }
    })
  }
  const add = Math.max(0, Math.min(Math.floor(count), item.quantity - placedOf(layout, item)))
  if (add === 0) return layout
  return mapCells(layout, (cell, where) => {
    if (!isAt(where, target)) return cell
    const existing = cell.items.find((other) => same(other, item))
    return existing
      ? { ...cell, items: cell.items.map((other) => (other === existing ? { ...other, count: (other.count || item.quantity) + add } : other)) }
      : { ...cell, items: [...cell.items, { equipmentId: item.equipmentId, unit: null, count: add }] }
  })
}

export function removeFrom(layout: CaseLayout, target: Where, item: Pick<SlotItem, 'equipmentId' | 'unit'>): CaseLayout {
  return mapCells(layout, (cell, where) => (isAt(where, target) ? { ...cell, items: cell.items.filter((other) => !same(other, item)) } : cell))
}

export function setNote(layout: CaseLayout, target: Where, note: string): CaseLayout {
  return mapCells(layout, (cell, where) => (isAt(where, target) ? { ...cell, note: note.slice(0, 120) } : cell))
}

/** Rozloží nezaradené do prázdnych priehradok jednej časti: kus po kuse, položku s počtom celú do jednej priehradky. */
export function autoFill(layout: CaseLayout, section: number, content: Piece[]): CaseLayout {
  const waiting = unplaced(layout, content)
  let next = layout
  layout.sections[section]?.cells.forEach((cell, index) => {
    const item = waiting.shift()
    if (cell.items.length === 0 && item) next = placeIn(next, { section, cell: index }, item, item.remaining)
    else if (item) waiting.unshift(item)
  })
  return next
}

