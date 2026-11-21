// Priehradky v case: mriežka riadkov × stĺpcov a čo je v ktorej priehradke (0186).

export type SlotItem = { equipmentId: string; unit: number | null }
export type LayoutCell = { items: SlotItem[]; note: string }
export type CaseLayout = { rows: number; cols: number; cells: LayoutCell[] }

export const MAX_SIDE = 8
const UUID = /^[0-9a-f-]{36}$/i
const clampSide = (value: unknown) => Math.min(MAX_SIDE, Math.max(1, Math.floor(Number(value) || 1)))
const emptyCell = (): LayoutCell => ({ items: [], note: '' })

/** Uložené rozloženie; prázdne alebo pokazené = case bez priehradok (null). */
export function readLayout(raw: unknown): CaseLayout | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  if (data.rows === undefined || data.cols === undefined) return null
  const rows = clampSide(data.rows)
  const cols = clampSide(data.cols)
  const cells = Array.isArray(data.cells) ? (data.cells as unknown[]) : []
  return {
    rows,
    cols,
    cells: Array.from({ length: rows * cols }, (_, index) => {
      const cell = (cells[index] ?? {}) as Record<string, unknown>
      const items = Array.isArray(cell.items) ? (cell.items as Record<string, unknown>[]) : []
      return {
        items: items
          .filter((item) => item && typeof item.equipmentId === 'string' && UUID.test(item.equipmentId))
          .slice(0, 50)
          .map((item) => ({ equipmentId: item.equipmentId as string, unit: Number.isInteger(item.unit) ? (item.unit as number) : null })),
        note: typeof cell.note === 'string' ? cell.note.slice(0, 120) : '',
      }
    }),
  }
}

/** Nová mriežka; pri zmene veľkosti ostanú priehradky na rovnakom mieste (riadok, stĺpec), čo sa nezmestí, vypadne. */
export function resizeLayout(layout: CaseLayout | null, rows: number, cols: number): CaseLayout {
  const next = { rows: clampSide(rows), cols: clampSide(cols) }
  return {
    ...next,
    cells: Array.from({ length: next.rows * next.cols }, (_, index) => {
      const row = Math.floor(index / next.cols)
      const col = index % next.cols
      return layout && row < layout.rows && col < layout.cols ? layout.cells[row * layout.cols + col] : emptyCell()
    }),
  }
}

type Piece = { id: string; name: string; quantity: number; trackUnits: boolean; unitIds: number[] }
export type Placeable = SlotItem & { label: string }

const unitsOf = (piece: Piece) => (piece.unitIds.length > 0 ? piece.unitIds : Array.from({ length: piece.quantity }, (_, index) => index + 1))

/** Čo sa dá do priehradok dať: technika v case, technika po kusoch po jednotlivých kusoch. */
export function placeables(content: Piece[]): Placeable[] {
  return content.flatMap((piece): Placeable[] =>
    piece.trackUnits
      ? unitsOf(piece).map((unit) => ({ equipmentId: piece.id, unit, label: `${piece.name} #${unit}` }))
      : [{ equipmentId: piece.id, unit: null, label: piece.quantity > 1 ? `${piece.name} (${piece.quantity} ks)` : piece.name }],
  )
}

const same = (a: SlotItem, b: SlotItem) => a.equipmentId === b.equipmentId && a.unit === b.unit

/** Čo ešte nie je v žiadnej priehradke. */
export function unplaced(layout: CaseLayout, content: Piece[]) {
  const placed = layout.cells.flatMap((cell) => cell.items)
  return placeables(content).filter((item) => !placed.some((other) => same(other, item)))
}

/** Priehradky bez techniky, ktorá z case medzičasom zmizla. */
export function withoutGone(layout: CaseLayout, content: Piece[]): CaseLayout {
  const valid = placeables(content)
  return { ...layout, cells: layout.cells.map((cell) => ({ ...cell, items: cell.items.filter((item) => valid.some((other) => same(other, item))) })) }
}

/** Pridá do priehradky (z inej priehradky sa presunie – každý kus je len na jednom mieste). */
export function placeIn(layout: CaseLayout, index: number, item: SlotItem): CaseLayout {
  return {
    ...layout,
    cells: layout.cells.map((cell, at) => {
      const items = cell.items.filter((other) => !same(other, item))
      return at === index ? { ...cell, items: [...items, { equipmentId: item.equipmentId, unit: item.unit }] } : { ...cell, items }
    }),
  }
}

export function removeFrom(layout: CaseLayout, index: number, item: SlotItem): CaseLayout {
  return { ...layout, cells: layout.cells.map((cell, at) => (at === index ? { ...cell, items: cell.items.filter((other) => !same(other, item)) } : cell)) }
}

export function setNote(layout: CaseLayout, index: number, note: string): CaseLayout {
  return { ...layout, cells: layout.cells.map((cell, at) => (at === index ? { ...cell, note: note.slice(0, 120) } : cell)) }
}

/** Rozloží nezaradené kusy po jednom do prázdnych priehradok, zľava doprava a zhora dole. */
export function autoFill(layout: CaseLayout, content: Piece[]): CaseLayout {
  const waiting = unplaced(layout, content)
  let next = layout
  layout.cells.forEach((cell, index) => {
    if (cell.items.length === 0 && waiting.length > 0) next = placeIn(next, index, waiting.shift()!)
  })
  return next
}
