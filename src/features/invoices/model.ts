import { sumPrices, type Offer, type OfferIssuer } from '@/features/offers/model'

export type InvoiceKind = 'advance' | 'final'
export const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = { advance: 'Zálohová faktúra', final: 'Faktúra' }

export type InvoiceLine = { label: string; quantity: number; unit: string; unitPrice: number; vatRate: number }
export type InvoiceClient = { name: string; address: string; ico: string; dic: string; icDph: string }
export const EMPTY_CLIENT: InvoiceClient = { name: '', address: '', ico: '', dic: '', icDph: '' }

export type InvoiceDraft = {
  kind: InvoiceKind
  eventId: string | null
  offerId: string | null
  issuer: OfferIssuer
  client: InvoiceClient
  lines: InvoiceLine[]
  issuedOn: string
  deliveredOn: string
  dueOn: string
  note: string
}

export type Invoice = InvoiceDraft & {
  id: string
  number: string
  totalNet: number
  totalVat: number
  total: number
  paidOn: string | null
  cancelledAt: string | null
  createdAt: string
}

const cents = (value: number) => Math.round(value * 100)
const round = (value: number) => Math.round(value * 100) / 100

/** Súčty po sadzbách DPH (základ a daň za sadzbu, zaokrúhlené na centy) a spolu. */
export function invoiceTotals(lines: Pick<InvoiceLine, 'quantity' | 'unitPrice' | 'vatRate'>[]) {
  const byRate = new Map<number, number>()
  for (const line of lines) byRate.set(line.vatRate, (byRate.get(line.vatRate) ?? 0) + cents(line.quantity * line.unitPrice))
  const rates = [...byRate.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([rate, base]) => ({ rate, base: base / 100, vat: Math.round((base * rate) / 100) / 100 }))
  const net = rates.reduce((sum, row) => sum + cents(row.base), 0) / 100
  const vat = rates.reduce((sum, row) => sum + cents(row.vat), 0) / 100
  return { rates, net, vat, total: round(net + vat) }
}

/** Splatnosť o `days` dní od dátumu vystavenia. */
export function dueAfter(issuedOn: string, days: number) {
  const date = new Date(`${issuedOn}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Stav faktúry pre zoznam. */
export function invoiceState(invoice: Pick<Invoice, 'paidOn' | 'cancelledAt' | 'dueOn'>, today: string) {
  if (invoice.cancelledAt) return 'cancelled' as const
  if (invoice.paidOn) return 'paid' as const
  return invoice.dueOn < today ? ('overdue' as const) : ('open' as const)
}
export const STATE_LABELS = { open: 'Nezaplatená', overdue: 'Po splatnosti', paid: 'Zaplatená', cancelled: 'Stornovaná' } as const

/** Variabilný symbol = číslo faktúry (len číslice). */
export const variableSymbol = (number: string) => number.replace(/\D/g, '').slice(0, 10)

/**
 * Návrh faktúry z cenovej ponuky. Cena ponuky sa prepočíta na základ podľa režimu DPH ponuky. Zálohová faktúra je
 * `advancePct` % z ceny; konečná celá cena mínus zaplatené zálohy k tej istej ponuke.
 */
export function draftFromOffer(
  offer: Pick<Offer, 'id' | 'eventId' | 'number' | 'title' | 'client' | 'issuer' | 'vatMode' | 'vatPct' | 'totalOverride' | 'sections'>,
  kind: InvoiceKind,
  today: string,
  advances: Pick<Invoice, 'number' | 'totalNet' | 'paidOn' | 'cancelledAt' | 'kind' | 'offerId' | 'lines'>[] = [],
  advancePct = 50,
): InvoiceDraft {
  const price = offer.totalOverride ?? sumPrices(offer.sections)
  const payer = offer.issuer.vatPayer && offer.vatMode !== 'none'
  const rate = payer ? offer.vatPct : 0
  const net = offer.vatMode === 'with' && payer ? price / (1 + rate / 100) : price
  const label = [offer.number ? `Podľa cenovej ponuky č. ${offer.number}` : 'Podľa cenovej ponuky', offer.title].filter(Boolean).join(' – ')
  const lines: InvoiceLine[] =
    kind === 'advance'
      ? [{ label: `Záloha ${advancePct} % – ${label}`, quantity: 1, unit: 'ks', unitPrice: round((net * advancePct) / 100), vatRate: rate }]
      : [{ label, quantity: 1, unit: 'ks', unitPrice: round(net), vatRate: rate }]
  if (kind === 'final') {
    for (const advance of advances.filter((item) => item.kind === 'advance' && item.offerId === offer.id && item.paidOn && !item.cancelledAt)) {
      lines.push({ label: `Odpočet zaplatenej zálohy (faktúra č. ${advance.number})`, quantity: 1, unit: 'ks', unitPrice: -advance.totalNet, vatRate: advance.lines[0]?.vatRate ?? rate })
    }
  }
  return {
    kind,
    eventId: offer.eventId,
    offerId: offer.id,
    issuer: offer.issuer,
    client: { name: offer.client.name, address: offer.client.address, ico: offer.client.ico, dic: offer.client.dic, icDph: '' },
    lines,
    issuedOn: today,
    deliveredOn: today,
    dueOn: dueAfter(today, 14),
    note: '',
  }
}
