import type { CompanyEvent } from '@/features/events/model'
import { loanDays, loanPricing, type Loan } from '@/features/loans/model'
import type { Equipment } from './model'
import { equipmentValue } from './value'

const round = (value: number) => Math.round(value * 100) / 100

type Item = Pick<Equipment, 'id' | 'rentalPrice' | 'quantity' | 'attributes'>
type Gig = Pick<CompanyEvent, 'id' | 'startsOn' | 'endsOn' | 'status' | 'equipment'>
type Lend = Pick<Loan, 'id' | 'startsOn' | 'endsOn' | 'billedDays' | 'price' | 'status' | 'items'>

/**
 * Návratnosť techniky: koľko odhadom zarobila na odohraných eventoch (cena prenájmu × kusy × dni) a na výpožičkách
 * (podiel z ceny výpožičky podľa jej riadkov) oproti nákupnej cene, a kedy sa splatila. Je to odhad podľa cenníka –
 * skutočná cena eventu môže byť iná (zľavy, balík).
 */
export function payback(item: Item, events: Gig[], loans: Lend[], today: string) {
  const bought = equipmentValue(item)
  const income: { on: string; amount: number }[] = []
  let eventCount = 0
  for (const event of events) {
    if (event.status === 'cancelled' || event.endsOn >= today) continue
    const quantity = event.equipment.filter((line) => line.equipmentId === item.id).reduce((sum, line) => sum + line.quantity, 0)
    if (quantity === 0) continue
    eventCount += 1
    if (item.rentalPrice) income.push({ on: event.endsOn, amount: item.rentalPrice * quantity * loanDays(event.startsOn, event.endsOn) })
  }
  let loanCount = 0
  for (const loan of loans) {
    if (loan.status === 'reserved' || loan.endsOn >= today) continue
    const lines = loan.items.filter((line) => line.equipmentId === item.id)
    if (lines.length === 0) continue
    loanCount += 1
    const pricing = loanPricing(loan)
    const days = pricing.days
    const mine = lines.reduce((sum, line) => sum + (line.unitPrice ?? item.rentalPrice ?? 0) * line.quantity * days, 0)
    // Dohodnutá cena výpožičky sa rozdelí podľa podielu riadkov na vypočítanej cene.
    const share = loan.price !== null && pricing.calculated > 0 ? (mine / pricing.calculated) * loan.price : mine
    if (share > 0) income.push({ on: loan.endsOn, amount: share })
  }
  income.sort((a, b) => a.on.localeCompare(b.on))
  let earned = 0
  let paidOn: string | null = null
  for (const row of income) {
    earned += row.amount
    if (paidOn === null && bought !== null && bought > 0 && earned >= bought) paidOn = row.on
  }
  earned = round(earned)
  return {
    bought,
    earned,
    eventCount,
    loanCount,
    paidOn,
    percent: bought && bought > 0 ? Math.round((earned / bought) * 100) : null,
    missing: bought !== null && earned < bought ? round(bought - earned) : 0,
    priced: item.rentalPrice !== null && item.rentalPrice > 0,
  }
}
