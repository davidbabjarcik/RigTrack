type Candidate = { id: string; name: string; kind: string; categoryId: string | null; manufacturer: string; model: string; quantity: number }

const same = (a: string, b: string) => a.trim() !== '' && a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Náhrada za techniku, ktorej v termíne chýba: z vlastného skladu, rovnaký druh aj kategória, v termíne voľná
 * a ešte nie je na evente. Najprv rovnaký model, potom rovnaký výrobca; najviac 3 návrhy.
 */
export function substitutesFor<T extends Candidate>(piece: Candidate, stock: T[], freeOf: (item: T) => number, onEvent: Set<string>) {
  return stock
    .filter((item) => item.id !== piece.id && !onEvent.has(item.id) && item.kind === piece.kind && item.categoryId === piece.categoryId)
    .map((item) => ({
      item,
      free: freeOf(item),
      score: (same(item.manufacturer, piece.manufacturer) ? 1 : 0) + (same(item.manufacturer, piece.manufacturer) && same(item.model, piece.model) ? 2 : 0),
    }))
    .filter((row) => row.free > 0)
    .sort((a, b) => b.score - a.score || b.free - a.free || a.item.name.localeCompare(b.item.name, 'sk'))
    .slice(0, 3)
    .map(({ item, free }) => ({ item, free }))
}
