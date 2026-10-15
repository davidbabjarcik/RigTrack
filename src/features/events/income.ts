import { getSupabase } from '@/lib/supabase/client'

// Príjmy z eventu: koľko firma za akciu dostala. Zodpovedá tabuľke event_payments (0042).

export const PAYMENT_METHODS = ['cash', 'account', 'invoice'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export const METHOD_LABELS: Record<PaymentMethod, string> = { cash: 'Hotovosť', account: 'Na účet', invoice: 'Faktúra' }

export type VatBasis = 'with' | 'without'
export const VAT_LABELS: Record<VatBasis, string> = { with: 's DPH', without: 'bez DPH' }
/** Základná sadzba DPH na Slovensku; dá sa prepísať pri každej platbe. */
export const DEFAULT_VAT_RATE = 23

export type EventPayment = {
  id: string
  amount: number
  method: PaymentMethod
  invoicedBy: string
  vat: VatBasis
  vatRate: number | null
  receivedOn: string
  note: string
  createdByName: string
}

export type NewPayment = Omit<EventPayment, 'id' | 'createdByName'>

/** Suma s DPH a bez DPH; druhú stranu dopočíta len pri známej sadzbe. */
export function bothBases(payment: Pick<EventPayment, 'amount' | 'vat' | 'vatRate'>) {
  const round = (value: number) => Math.round(value * 100) / 100
  const factor = payment.vatRate === null ? null : 1 + payment.vatRate / 100
  if (payment.vat === 'with') return { gross: payment.amount, net: factor === null ? null : round(payment.amount / factor) }
  return { net: payment.amount, gross: factor === null ? null : round(payment.amount * factor) }
}

/** Súčty podľa spôsobu platby (v zadaných sumách) a spolu s DPH a bez DPH, kde sa dajú dopočítať. */
export function incomeTotals(payments: EventPayment[]) {
  const byMethod = Object.fromEntries(PAYMENT_METHODS.map((method) => [method, 0])) as Record<PaymentMethod, number>
  let gross = 0
  let net = 0
  let complete = true
  for (const payment of payments) {
    byMethod[payment.method] += payment.amount
    const bases = bothBases(payment)
    if (bases.gross === null || bases.net === null) complete = false
    gross += bases.gross ?? payment.amount
    net += bases.net ?? payment.amount
  }
  const round = (value: number) => Math.round(value * 100) / 100
  return { byMethod, gross: round(gross), net: round(net), complete }
}

export const incomeKeys = {
  list: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'income'] as const,
}

type Row = {
  id: string
  amount: number | string
  method: PaymentMethod
  invoiced_by: string
  vat: VatBasis
  vat_rate: number | string | null
  received_on: string
  note: string
  created_by_name: string
}

export async function fetchPayments(companyId: string, eventId: string): Promise<EventPayment[]> {
  const { data, error } = await getSupabase()
    .from('event_payments')
    .select('id, amount, method, invoiced_by, vat, vat_rate, received_on, note, created_by_name')
    .eq('company_id', companyId)
    .eq('event_id', eventId)
    .order('received_on')
  if (error) throw error
  return (data as Row[]).map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    method: row.method,
    invoicedBy: row.invoiced_by,
    vat: row.vat,
    vatRate: row.vat_rate === null ? null : Number(row.vat_rate),
    receivedOn: row.received_on,
    note: row.note,
    createdByName: row.created_by_name,
  }))
}

export async function addPayment(companyId: string, eventId: string, payment: NewPayment) {
  const { error } = await getSupabase()
    .from('event_payments')
    .insert({
      company_id: companyId,
      event_id: eventId,
      amount: payment.amount,
      method: payment.method,
      invoiced_by: payment.method === 'invoice' ? payment.invoicedBy.trim() : '',
      vat: payment.vat,
      vat_rate: payment.vatRate,
      received_on: payment.receivedOn,
      note: payment.note.trim(),
    })
  if (error) throw error
}

export async function deletePayment(id: string) {
  const { data, error } = await getSupabase().from('event_payments').delete().eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}
