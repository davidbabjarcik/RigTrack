// Hliník v sklade: miesto na trussy ako mriežka (pohľad zhora). Na každom políčku stojí stoh dielov
// zdola nahor (ids techniky; jeden kus = jedno id v zozname). Uložené vo warehouses.truss_layout (0130).

import type { Equipment } from '@/features/equipment/model'

export type TrussStack = { col: number; row: number; pieces: string[] }
/** spotId = miesto v pláne skladu, kde hliník leží (spolu s cases). */
export type TrussLayout = { cellCm: number; cols: number; rows: number; stacks: TrussStack[]; spotId?: string | null }

export const EMPTY_TRUSS_LAYOUT: TrussLayout = { cellCm: 35, cols: 10, rows: 6, stacks: [] }
export const MAX_TRUSS_GRID = 40

type Piece = Pick<Equipment, 'id' | 'name' | 'attributes' | 'quantity'>

/** Upratané rozloženie z databázy (zlé hodnoty sa nahradia rozumnými). */
export function cleanTrussLayout(value: unknown): TrussLayout {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<TrussLayout>
  const clamp = (n: unknown, min: number, max: number, fallback: number) => (Number.isFinite(Number(n)) ? Math.min(max, Math.max(min, Math.round(Number(n)))) : fallback)
  const cols = clamp(raw.cols, 1, MAX_TRUSS_GRID, EMPTY_TRUSS_LAYOUT.cols)
  const rows = clamp(raw.rows, 1, MAX_TRUSS_GRID, EMPTY_TRUSS_LAYOUT.rows)
  const stacks = (Array.isArray(raw.stacks) ? raw.stacks : [])
    .map((stack) => ({ col: clamp(stack?.col, 0, cols - 1, 0), row: clamp(stack?.row, 0, rows - 1, 0), pieces: (Array.isArray(stack?.pieces) ? stack.pieces : []).filter((id): id is string => typeof id === 'string').slice(0, 40) }))
    .filter((stack, index, all) => stack.pieces.length > 0 && all.findIndex((other) => other.col === stack.col && other.row === stack.row) === index)
  const spotId = typeof raw.spotId === 'string' && raw.spotId.length <= 64 ? raw.spotId : null
  return { cellCm: clamp(raw.cellCm, 20, 100, EMPTY_TRUSS_LAYOUT.cellCm), cols, rows, stacks, spotId }
}

/** Výška dielu postaveného nastojato (cm): rovný diel podľa dĺžky, roh a kocka ako profil, základňa nízka. */
export function pieceHeightCm(piece: Pick<Piece, 'attributes'> | undefined, cellCm: number) {
  const a = piece?.attributes
  if (!a) return cellCm
  if (a.lengthM !== undefined && (!a.trussShape || a.trussShape === 'straight')) return Math.max(10, Math.round(a.lengthM * 100))
  if (a.trussType === 'accessory') return 12
  return cellCm
}

const LENGTH_COLORS: [number, string][] = [
  [0.5, '#fb923c'],
  [0.75, '#facc15'],
  [1, '#a3e635'],
  [1.5, '#22d3ee'],
  [2, '#60a5fa'],
  [2.5, '#a78bfa'],
  [3, '#f472b6'],
  [4, '#f87171'],
]

/** Farba dielu: rovné podľa dĺžky (rovnaká dĺžka = rovnaká farba), rohy biele, príslušenstvo fialové. */
export function pieceColor(piece: Pick<Piece, 'attributes'> | undefined) {
  const a = piece?.attributes
  if (!a) return '#94a3b8'
  if (a.trussType === 'accessory') return '#8b5cf6'
  if (a.trussShape && a.trussShape !== 'straight') return '#e5e7eb'
  if (a.lengthM === undefined) return '#94a3b8'
  return LENGTH_COLORS.reduce((best, entry) => (Math.abs(entry[0] - a.lengthM!) < Math.abs(best[0] - a.lengthM!) ? entry : best))[1]
}

/** Koľko kusov každého dielu je uložených v stohoch. */
export function placedCounts(layout: TrussLayout) {
  const counts = new Map<string, number>()
  for (const stack of layout.stacks) for (const id of stack.pieces) counts.set(id, (counts.get(id) ?? 0) + 1)
  return counts
}

export const stackAt = (layout: TrussLayout, col: number, row: number) => layout.stacks.find((stack) => stack.col === col && stack.row === row)

/** Stoh s novým zoznamom dielov (prázdny stoh zmizne). */
export function withStack(layout: TrussLayout, col: number, row: number, pieces: string[]): TrussLayout {
  const others = layout.stacks.filter((stack) => !(stack.col === col && stack.row === row))
  return { ...layout, stacks: pieces.length > 0 ? [...others, { col, row, pieces }] : others }
}

/** Presunie celý stoh na iné políčko; ak tam niečo stojí, vymenia sa. */
export function moveStack(layout: TrussLayout, from: { col: number; row: number }, to: { col: number; row: number }): TrussLayout {
  const source = stackAt(layout, from.col, from.row)
  const target = stackAt(layout, to.col, to.row)
  if (!source) return layout
  let next = withStack(layout, from.col, from.row, target?.pieces ?? [])
  next = withStack(next, to.col, to.row, source.pieces)
  return next
}

/** Výška stohu (cm). */
export function stackHeightCm(stack: TrussStack, byId: Map<string, Piece>, cellCm: number) {
  return stack.pieces.reduce((sum, id) => sum + pieceHeightCm(byId.get(id), cellCm), 0)
}
