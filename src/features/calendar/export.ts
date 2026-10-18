import { describeTimes, EVENT_STATUS_LABELS, type CompanyEvent } from '@/features/events/model'
import { LOAN_STATUS_LABELS, type Loan } from '@/features/loans/model'
import type { CalendarItem } from '@/lib/ics'

/** Úplná adresa stránky aplikácie (funguje aj v podpriečinku na GitHub Pages). */
export function appUrl(path: string) {
  if (typeof window === 'undefined') return ''
  return new URL(`${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`, window.location.origin).toString()
}

export function eventCalendarItem(event: CompanyEvent): CalendarItem {
  const description = [
    EVENT_STATUS_LABELS[event.status],
    describeTimes(event),
    event.client && `Klient: ${event.client}`,
    [event.organizer, event.organizerPerson, event.organizerPhone, event.organizerEmail].filter(Boolean).join(', ') &&
      `Organizátor: ${[event.organizer, event.organizerPerson, event.organizerPhone, event.organizerEmail].filter(Boolean).join(', ')}`,
    event.description,
  ]
    .filter(Boolean)
    .join('\n')
  return {
    uid: `event-${event.id}`,
    title: event.name,
    startsOn: event.startsOn,
    endsOn: event.endsOn,
    location: event.venue,
    description,
    url: appUrl(`/events/${event.id}`),
  }
}

export function loanCalendarItem(loan: Loan): CalendarItem {
  const pieces = loan.items.reduce((sum, item) => sum + item.quantity, 0)
  return {
    uid: `loan-${loan.id}`,
    title: `Výpožička: ${loan.borrower}`,
    startsOn: loan.startsOn,
    endsOn: loan.endsOn,
    description: [LOAN_STATUS_LABELS[loan.status], loan.contact && `Kontakt: ${loan.contact}`, `${pieces} ks techniky`, loan.note].filter(Boolean).join('\n'),
    url: appUrl(`/loans/${loan.id}`),
  }
}

/** Eventy (bez zrušených) a výpožičky od `from` ďalej, pre export celého kalendára. */
export function calendarExport(events: CompanyEvent[], loans: Loan[], from: string): CalendarItem[] {
  return [
    ...events.filter((event) => event.status !== 'cancelled' && event.endsOn >= from).map(eventCalendarItem),
    ...loans.filter((loan) => loan.endsOn >= from).map(loanCalendarItem),
  ].sort((a, b) => a.startsOn.localeCompare(b.startsOn))
}
