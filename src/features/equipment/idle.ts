import type { CompanyEvent } from '@/features/events/model'
import type { Loan } from '@/features/loans/model'
import { isGone, type Equipment } from './model'
import { equipmentValue } from './value'

type Item = Pick<Equipment, 'id' | 'name' | 'kind' | 'status' | 'quantity' | 'purchasedOn' | 'attributes'>
type Gig = Pick<CompanyEvent, 'startsOn' | 'endsOn' | 'status' | 'equipment'>
type Lend = Pick<Loan, 'startsOn' | 'endsOn' | 'status' | 'items'>

const minusDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

/**
 * Technika, ktorá za posledné obdobie (predvolene 12 mesiacov) nebola na žiadnom evente ani výpožičke – kandidáti
 * na predaj. Bez spotrebného materiálu, predanej / vyradenej techniky a vecí kúpených v tomto období (sú nové).
 * Zoradené podľa nákupnej ceny (najdrahšie hore), pri každej kedy bola naposledy použitá.
 */
export function idleEquipment(items: Item[], events: Gig[], loans: Lend[], today: string, days = 365) {
  const since = minusDays(today, days)
  const lastUse = new Map<string, string>()
  const note = (id: string, on: string) => {
    if ((lastUse.get(id) ?? '') < on) lastUse.set(id, on)
  }
  for (const event of events) {
    if (event.status === 'cancelled' || event.startsOn > today) continue
    const on = event.endsOn > today ? today : event.endsOn
    for (const line of event.equipment) note(line.equipmentId, on)
  }
  for (const loan of loans) {
    if (loan.status === 'reserved' || loan.startsOn > today) continue
    const on = loan.endsOn > today ? today : loan.endsOn
    for (const line of loan.items) note(line.equipmentId, on)
  }
  return items
    .filter((item) => !isGone(item.status) && item.kind !== 'consumable' && !(item.purchasedOn && item.purchasedOn > since))
    .filter((item) => (lastUse.get(item.id) ?? '') < since)
    .map((item) => ({ id: item.id, name: item.name, value: equipmentValue(item), lastUsed: lastUse.get(item.id) ?? null }))
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1) || a.name.localeCompare(b.name, 'sk'))
}
