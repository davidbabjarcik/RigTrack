// Kontrola case po položkách (0187): koľko sa malo v case nájsť a koľko sa našlo.
import { placeables } from './layout'

export type CheckItem = { equipmentId: string; unit: number | null; expected: number; found: number }

type Piece = { id: string; name: string; quantity: number; trackUnits: boolean; unitIds: number[] }

/** Riadky kontroly: technika po kusoch po kusoch, ostatná s počtom; na začiatku všetko nájdené. */
export function checkRows(content: Piece[]) {
  return placeables(content).map((item) => ({ ...item, expected: item.quantity, found: item.quantity }))
}

/** Uložené položky kontroly; pokazené sa vynechajú. */
export function readCheckItems(raw: unknown): CheckItem[] {
  if (!Array.isArray(raw)) return []
  return (raw as Record<string, unknown>[])
    .filter((row) => row && typeof row.equipmentId === 'string' && Number.isFinite(row.expected) && Number.isFinite(row.found))
    .map((row) => ({ equipmentId: row.equipmentId as string, unit: Number.isInteger(row.unit) ? (row.unit as number) : null, expected: Number(row.expected), found: Number(row.found) }))
}

/** Čo chýbalo: „2× Mikrofón, PAR #3“. */
export function missingText(items: CheckItem[], labelOf: (item: CheckItem) => string) {
  return items
    .filter((item) => item.found < item.expected)
    .map((item) => (item.unit !== null ? labelOf(item) : `${item.expected - item.found}× ${labelOf(item)}`))
    .join(', ')
}

export const missingCount = (items: CheckItem[]) => items.reduce((sum, item) => sum + Math.max(0, item.expected - item.found), 0)
