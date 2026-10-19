import type { Equipment } from './model'

/** Audio, svetlá a video sa bežne odpisujú 4 roky (1. odpisová skupina). */
export const DEFAULT_DEPRECIATION_YEARS = 4

const YEAR_MS = 365.25 * 86_400_000

export type EquipmentValue = {
  /** Nákupná cena všetkých kusov. */
  purchase: number
  /** Zostatková hodnota dnes (rovnomerný odpis od dátumu nákupu). */
  current: number
  years: number
  /** Koľko kusov nemá dátum nákupu – tie sa počítajú v plnej nákupnej cene. */
  undated: number
}

const round = (value: number) => Math.round(value * 100) / 100

/** Zostatok jedného kusu: rovnomerne z ceny na 0 za `years` rokov od nákupu. */
export function remainingValue(price: number, purchasedOn: string | null | undefined, years: number, today: string) {
  if (!purchasedOn) return price
  const age = (Date.parse(today) - Date.parse(purchasedOn)) / YEAR_MS
  if (!Number.isFinite(age) || age <= 0) return price
  return price * Math.max(0, 1 - age / years)
}

/** Hodnota položky techniky; null, keď nemá nákupnú cenu. Pri evidencii po kusoch berie dátum nákupu každého kusu. */
export function equipmentValue(item: Pick<Equipment, 'attributes' | 'quantity' | 'purchasedOn' | 'unitPurchases' | 'trackUnits' | 'unitIds'>, today: string): EquipmentValue | null {
  const price = item.attributes.purchasePrice
  if (price === undefined || item.quantity <= 0) return price === undefined ? null : { purchase: 0, current: 0, years: item.attributes.depreciationYears ?? DEFAULT_DEPRECIATION_YEARS, undated: 0 }
  const years = item.attributes.depreciationYears ?? DEFAULT_DEPRECIATION_YEARS
  const units = item.trackUnits ? (item.unitIds.length > 0 ? item.unitIds : Array.from({ length: item.quantity }, (_, index) => index + 1)) : []
  let current = 0
  let undated = 0
  if (units.length > 0) {
    for (const unit of units) {
      const date = item.unitPurchases?.[String(unit)] || item.purchasedOn
      if (!date) undated += 1
      current += remainingValue(price, date, years, today)
    }
  } else {
    if (!item.purchasedOn) undated = item.quantity
    current = remainingValue(price, item.purchasedOn, years, today) * item.quantity
  }
  const count = units.length > 0 ? units.length : item.quantity
  return { purchase: round(price * count), current: round(current), years, undated }
}

/** Súčet hodnoty techniky: celkom a po skupinách (napr. kategóriách). Technika bez ceny sa len spočíta. */
export function valueSummary<T extends Pick<Equipment, 'attributes' | 'quantity' | 'purchasedOn' | 'unitPurchases' | 'trackUnits' | 'unitIds'>>(
  items: T[],
  today: string,
  groupOf: (item: T) => string,
) {
  let purchase = 0
  let current = 0
  let unpriced = 0
  const groups = new Map<string, { purchase: number; current: number }>()
  for (const item of items) {
    const value = equipmentValue(item, today)
    if (!value) {
      unpriced += 1
      continue
    }
    purchase += value.purchase
    current += value.current
    const key = groupOf(item)
    const group = groups.get(key) ?? { purchase: 0, current: 0 }
    group.purchase += value.purchase
    group.current += value.current
    groups.set(key, group)
  }
  return {
    purchase: round(purchase),
    current: round(current),
    unpriced,
    groups: [...groups.entries()].map(([name, group]) => ({ name, purchase: round(group.purchase), current: round(group.current) })).sort((a, b) => b.current - a.current),
  }
}
