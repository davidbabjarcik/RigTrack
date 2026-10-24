// História klienta: na ktorých akciách bol organizátor alebo partner, koľko priniesli a čo si požičal.
import type { CompanyEvent } from '@/features/events/model'
import type { Loan } from '@/features/loans/model'

export type EventLink = { eventId: string; partnerId: string; kind: 'organizer' | 'partner' }
export type ClientEvent = { event: CompanyEvent; kind: 'organizer' | 'partner'; revenue: number }

const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/** Výpožička patrí klientovi podľa IČO (keď ho majú obaja), inak podľa rovnakého mena. */
export function loanMatches(loan: Pick<Loan, 'borrower' | 'borrowerIco'>, partner: { name: string; ico: string }) {
  const ico = (value: string) => value.replace(/\s/g, '')
  if (ico(loan.borrowerIco) && ico(partner.ico)) return ico(loan.borrowerIco) === ico(partner.ico)
  return fold(loan.borrower) !== '' && fold(loan.borrower) === fold(partner.name)
}

/**
 * Akcie klienta: prepojené v evente (organizátor / partner) aj staršie, kde je len napísaný ako organizátor.
 * `revenueOf` vráti príjem eventu (s DPH); bez prístupu k príjmom 0.
 */
export function clientEvents(partner: { id: string; name: string }, events: CompanyEvent[], links: EventLink[], revenueOf: (eventId: string) => number): ClientEvent[] {
  const name = fold(partner.name)
  const result: ClientEvent[] = []
  for (const event of events) {
    if (event.status === 'cancelled') continue
    const link = links.find((item) => item.eventId === event.id && item.partnerId === partner.id)
    const byName = name !== '' && fold(event.organizer) === name
    if (!link && !byName) continue
    result.push({ event, kind: link?.kind ?? 'organizer', revenue: revenueOf(event.id) })
  }
  return result.sort((a, b) => b.event.startsOn.localeCompare(a.event.startsOn))
}

/** „1 akcia“, „3 akcie“, „5 akcií“. */
export const eventsLabel = (count: number) => `${count} ${count === 1 ? 'akcia' : count >= 2 && count <= 4 ? 'akcie' : 'akcií'}`

/** Zhrnutie pre kartu klienta: počet akcií, prvá, posledná a najbližšia, tržby. */
export function clientSummary(items: ClientEvent[], today: string) {
  const past = items.filter((item) => item.event.startsOn <= today)
  const upcoming = items.filter((item) => item.event.startsOn > today).sort((a, b) => a.event.startsOn.localeCompare(b.event.startsOn))
  return {
    count: items.length,
    revenue: Math.round(items.reduce((sum, item) => sum + item.revenue, 0) * 100) / 100,
    last: past[0]?.event ?? null,
    first: past[past.length - 1]?.event ?? null,
    next: upcoming[0]?.event ?? null,
  }
}
