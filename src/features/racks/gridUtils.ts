import { columnsOf, type FitSlot } from './fit'

// Pomôcky mriežky racku (výška riadku, farby podľa druhu, cieľ pod kurzorom).

export const ROW_PX = 30

const KIND_COLORS: Record<string, string> = {
  audio: 'border-sky-500 bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-100',
  dj: 'border-sky-500 bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-100',
  light: 'border-amber-500 bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100',
  video: 'border-violet-500 bg-violet-100 text-violet-950 dark:bg-violet-950 dark:text-violet-100',
  it: 'border-emerald-500 bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100',
  appliance: 'border-red-500 bg-red-100 text-red-950 dark:bg-red-950 dark:text-red-100',
  accessory: 'border-neutral-500 bg-neutral-300 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100',
}
export const kindColor = (kind: string) => KIND_COLORS[kind] ?? 'border-neutral-400 bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'

export type DropTarget = { bottomU: number; col: number }

/** Cieľ v mriežke pod bodom (x, y): spodná U podľa výšky a stĺpec podľa šírky. */
export function targetAt(rect: DOMRect, x: number, y: number, units: number, heightU: number, width: FitSlot['width'], grabU = 0): DropTarget | null {
  if (x < rect.left || x > rect.right || y < rect.top - ROW_PX || y > rect.bottom + ROW_PX) return null
  const fromBottom = Math.floor((rect.bottom - y) / ROW_PX) + 1 - grabU
  const bottomU = Math.min(Math.max(1, fromBottom), Math.max(1, units - heightU + 1))
  const cols = columnsOf(width)
  const col = Math.min(cols - 1, Math.max(0, Math.floor(((x - rect.left) / rect.width) * cols)))
  return { bottomU, col }
}

