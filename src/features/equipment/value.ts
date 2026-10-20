import type { Equipment } from './model'

type Priced = Pick<Equipment, 'attributes' | 'quantity'>

const round = (value: number) => Math.round(value * 100) / 100

/** Nákupná cena všetkých kusov; null, keď položka cenu nemá. */
export function equipmentValue(item: Priced): number | null {
  const price = item.attributes.purchasePrice
  return price === undefined ? null : round(price * Math.max(0, item.quantity))
}

/** Hodnota techniky (nákupné ceny): spolu a po skupinách (napr. kategóriách). Technika bez ceny sa len spočíta. */
export function valueSummary<T extends Priced>(items: T[], groupOf: (item: T) => string) {
  let total = 0
  let unpriced = 0
  const groups = new Map<string, number>()
  for (const item of items) {
    const value = equipmentValue(item)
    if (value === null) {
      unpriced += 1
      continue
    }
    total += value
    const key = groupOf(item)
    groups.set(key, (groups.get(key) ?? 0) + value)
  }
  return {
    total: round(total),
    unpriced,
    groups: [...groups.entries()].map(([name, value]) => ({ name, value: round(value) })).sort((a, b) => b.value - a.value),
  }
}
