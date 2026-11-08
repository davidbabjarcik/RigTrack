import type { Offer } from '@/features/offers/model'
import { sumPrices } from '@/features/offers/model'

// Zisk z eventu: príjem bez DPH mínus náklady. Všetko sa ráta v appke z údajov, ktoré už firma má.

export const COST_KINDS = ['rental', 'subcontract', 'vehicle', 'other'] as const
export type CostKind = (typeof COST_KINDS)[number]
export const COST_KIND_LABELS: Record<CostKind, string> = {
  rental: 'Prenájom techniky',
  subcontract: 'Subdodávka',
  vehicle: 'Auto (prenájom, mýto)',
  other: 'Iný náklad',
}

export type EventCost = { id: string; eventId: string; kind: CostKind; partnerId: string | null; amount: number; note: string }
export type ProfitSettings = { kmRate: number; gearUseDays: number }
export const DEFAULT_SETTINGS: ProfitSettings = { kmRate: 0, gearUseDays: 60 }

export type IncomePayment = { amount: number; vat: 'with' | 'without'; vatRate: number | null }
export type GearUse = { quantity: number; purchasePrice?: number; depreciationYears?: number }

export type ProfitInput = {
  days: number
  payments: IncomePayment[]
  offers: Pick<Offer, 'status' | 'sections' | 'totalOverride' | 'vatMode' | 'vatPct'>[]
  crewPayments: { amount: number; kind: string }[]
  expenses: number[]
  km: number
  costs: Pick<EventCost, 'kind' | 'amount'>[]
  gear: GearUse[]
  settings: ProfitSettings
}

export type IncomeSource = 'payments' | 'offer' | 'none'
export type CostLine = { key: 'crew' | 'travel' | 'expenses' | 'gear' | CostKind; label: string; amount: number }

const round = (value: number) => Math.round(value * 100) / 100

/** Platba bez DPH; pri neznámej sadzbe sa berie zadaná suma. */
export function netPayment(payment: IncomePayment) {
  if (payment.vat === 'without' || payment.vatRate === null) return payment.amount
  return payment.amount / (1 + payment.vatRate / 100)
}

/** Suma ponuky bez DPH. */
export function offerNet(offer: ProfitInput['offers'][number]) {
  const total = offer.totalOverride ?? sumPrices(offer.sections)
  return offer.vatMode === 'with' ? total / (1 + offer.vatPct / 100) : total
}

/** Príjem: zaplatené platby; kým nie sú, očakávaný príjem z prijatej (inak poslanej) ponuky. */
export function eventIncome(payments: IncomePayment[], offers: ProfitInput['offers']): { amount: number; source: IncomeSource } {
  if (payments.length > 0) return { amount: round(payments.reduce((sum, payment) => sum + netPayment(payment), 0)), source: 'payments' }
  const offer = offers.find((item) => item.status === 'accepted') ?? offers.find((item) => item.status === 'sent')
  if (offer) return { amount: round(offerNet(offer)), source: 'offer' }
  return { amount: 0, source: 'none' }
}

/** Opotrebenie: ročný odpis kusu delený dňami, keď je technika v roku na akciách, krát dni eventu. */
export function gearWear(gear: GearUse[], days: number, useDays: number) {
  let total = 0
  let unpriced = 0
  for (const item of gear) {
    if (!item.purchasePrice || !item.depreciationYears) {
      unpriced += 1
      continue
    }
    total += (item.quantity * item.purchasePrice) / item.depreciationYears / Math.max(1, useDays) * Math.max(1, days)
  }
  return { amount: round(total), unpriced }
}

/** Celý výpočet zisku eventu. Zálohy sa nepočítajú – sú to peniaze vopred, nie náklad navyše. */
export function eventProfit(input: ProfitInput) {
  const income = eventIncome(input.payments, input.offers)
  const wear = gearWear(input.gear, input.days, input.settings.gearUseDays)
  const lines: CostLine[] = [
    { key: 'crew', label: 'Odmeny posádke', amount: round(input.crewPayments.filter((payment) => payment.kind !== 'advance').reduce((sum, payment) => sum + payment.amount, 0)) },
    { key: 'travel', label: 'Doprava (km × sadzba)', amount: round(input.km * input.settings.kmRate) },
    { key: 'expenses', label: 'Výdavky (strava, nafta, hotel…)', amount: round(input.expenses.reduce((sum, amount) => sum + amount, 0)) },
    ...COST_KINDS.map((kind) => ({ key: kind, label: COST_KIND_LABELS[kind], amount: round(input.costs.filter((cost) => cost.kind === kind).reduce((sum, cost) => sum + cost.amount, 0)) })),
    { key: 'gear', label: 'Opotrebenie techniky', amount: wear.amount },
  ]
  const costs = round(lines.reduce((sum, line) => sum + line.amount, 0))
  const profit = round(income.amount - costs)
  const margin = income.amount > 0 ? Math.round((profit / income.amount) * 100) : null
  return { income, lines, costs, profit, margin, unpricedGear: wear.unpriced }
}

export type Profit = ReturnType<typeof eventProfit>

/** Súčty za viac eventov a poradie klientov podľa zisku. */
export function profitSummary(rows: { client: string; profit: Profit }[]) {
  const total = { income: 0, costs: 0, profit: 0 }
  const clients = new Map<string, { client: string; events: number; income: number; profit: number }>()
  for (const row of rows) {
    total.income += row.profit.income.amount
    total.costs += row.profit.costs
    total.profit += row.profit.profit
    const name = row.client.trim() || '—'
    const current = clients.get(name) ?? { client: name, events: 0, income: 0, profit: 0 }
    current.events += 1
    current.income += row.profit.income.amount
    current.profit += row.profit.profit
    clients.set(name, current)
  }
  return {
    income: round(total.income),
    costs: round(total.costs),
    profit: round(total.profit),
    margin: total.income > 0 ? Math.round((total.profit / total.income) * 100) : null,
    clients: [...clients.values()].map((item) => ({ ...item, income: round(item.income), profit: round(item.profit) })).sort((a, b) => b.profit - a.profit),
  }
}
