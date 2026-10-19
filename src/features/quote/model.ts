import type { Equipment } from '@/features/equipment/model'
import type { EventEquipment } from '@/features/events/model'

/** Nastavenia ponuky (pamätajú sa v prehliadači pre firmu). */
export type QuoteSettings = {
  kmRate: number
  /** Koľko ciest (tam aj späť = 1 cesta → km × 2). */
  trips: number
  crewCount: number
  crewDayRate: number
  discountPct: number
  vatPct: number
  withVat: boolean
  validDays: number
  /** Dni prenájmu techniky: prázdne = dni eventu. */
  rentalDays: number | null
}

export const DEFAULT_QUOTE: QuoteSettings = { kmRate: 0.6, trips: 1, crewCount: 0, crewDayRate: 120, discountPct: 0, vatPct: 23, withVat: true, validDays: 14, rentalDays: null }

export type QuoteLine = { label: string; detail: string; quantity: number; unitPrice: number; total: number }

const round = (value: number) => Math.round(value * 100) / 100

/** Riadky ponuky: technika s cenou prenájmu (kus × deň), doprava podľa km a posádka. Technika bez ceny sa vypíše zvlášť. */
export function buildQuote(lines: EventEquipment[], equipment: Equipment[], eventDays: number, distanceKm: number | null, settings: QuoteSettings) {
  const days = settings.rentalDays ?? eventDays
  const priced: QuoteLine[] = []
  const unpriced: string[] = []
  const grouped = new Map<string, number>()
  for (const line of lines) grouped.set(line.equipmentId, (grouped.get(line.equipmentId) ?? 0) + line.quantity)
  for (const [equipmentId, quantity] of grouped) {
    const item = equipment.find((candidate) => candidate.id === equipmentId)
    if (!item) continue
    if (item.rentalPrice === null || item.rentalPrice === 0) {
      unpriced.push(item.name)
      continue
    }
    priced.push({ label: item.name, detail: `${quantity} ks × ${days} d`, quantity: quantity * days, unitPrice: item.rentalPrice, total: round(item.rentalPrice * quantity * days) })
  }
  priced.sort((a, b) => b.total - a.total)
  const extra: QuoteLine[] = []
  if (distanceKm && settings.kmRate > 0 && settings.trips > 0) {
    const km = distanceKm * 2 * settings.trips
    extra.push({ label: 'Doprava', detail: `${Math.round(km)} km (${settings.trips}× tam a späť)`, quantity: km, unitPrice: settings.kmRate, total: round(km * settings.kmRate) })
  }
  if (settings.crewCount > 0 && settings.crewDayRate > 0) {
    extra.push({ label: 'Technická obsluha', detail: `${settings.crewCount} ľudí × ${eventDays} d`, quantity: settings.crewCount * eventDays, unitPrice: settings.crewDayRate, total: round(settings.crewCount * eventDays * settings.crewDayRate) })
  }
  const equipmentTotal = round(priced.reduce((sum, line) => sum + line.total, 0))
  const subtotal = round(equipmentTotal + extra.reduce((sum, line) => sum + line.total, 0))
  const discount = round((equipmentTotal * settings.discountPct) / 100)
  const base = round(subtotal - discount)
  const vat = settings.withVat ? round((base * settings.vatPct) / 100) : 0
  return { lines: [...priced, ...extra], unpriced, equipmentTotal, subtotal, discount, base, vat, total: round(base + vat), days }
}
