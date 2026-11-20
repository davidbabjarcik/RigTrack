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

type Sold = Priced & Pick<Equipment, 'id' | 'name' | 'status' | 'purchasedOn'>

/** Hodnota po odpisoch k dátumu: nákupná cena rovnomerne do nuly za „odpisovať rokov“; bez údajov null. */
export function bookValueOn(item: Pick<Equipment, 'attributes' | 'quantity' | 'purchasedOn'>, onDate: string): number | null {
  const bought = equipmentValue(item)
  const years = item.attributes.depreciationYears
  if (bought === null || !years || !item.purchasedOn || !onDate) return null
  const elapsed = (Date.parse(onDate) - Date.parse(item.purchasedOn)) / (365.25 * 24 * 3600 * 1000)
  if (!Number.isFinite(elapsed)) return null
  return round(bought * Math.max(0, Math.min(1, 1 - elapsed / years)))
}

/**
 * Predaná technika: za koľko sme ju kúpili, za koľko predali a koľko sme zarobili alebo stratili
 * (oproti nákupu aj oproti hodnote po odpisoch v deň predaja). Bez sumy predaja sa položka len spočíta.
 */
export function soldSummary(items: Sold[]) {
  const rows = items
    .filter((item) => item.status === 'sold')
    .map((item) => {
      const bought = equipmentValue(item)
      const sold = item.attributes.soldPrice ?? null
      const soldOn = item.attributes.soldOn ?? ''
      const book = bookValueOn(item, soldOn)
      return {
        id: item.id,
        name: item.name,
        soldOn,
        soldTo: item.attributes.soldTo ?? '',
        bought,
        sold,
        gain: sold !== null && bought !== null ? round(sold - bought) : null,
        gainVsBook: sold !== null && book !== null ? round(sold - book) : null,
      }
    })
    .sort((a, b) => b.soldOn.localeCompare(a.soldOn))
  const priced = rows.filter((row) => row.sold !== null)
  return {
    rows,
    count: rows.length,
    sold: round(priced.reduce((sum, row) => sum + (row.sold ?? 0), 0)),
    bought: round(priced.reduce((sum, row) => sum + (row.bought ?? 0), 0)),
    gain: round(priced.filter((row) => row.gain !== null).reduce((sum, row) => sum + (row.gain ?? 0), 0)),
    unpriced: rows.length - priced.length,
  }
}
