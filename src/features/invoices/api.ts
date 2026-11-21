import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import { invoiceTotals, type Invoice, type InvoiceDraft } from './model'

export const invoiceKeys = { list: (companyId: string) => ['company', companyId, 'invoices'] as const }

type Row = {
  id: string
  number: string
  kind: Invoice['kind']
  event_id: string | null
  offer_id: string | null
  issuer: Invoice['issuer']
  client: Invoice['client']
  lines: Invoice['lines']
  issued_on: string
  delivered_on: string
  due_on: string
  total_net: number | string
  total_vat: number | string
  total: number | string
  note: string
  paid_on: string | null
  cancelled_at: string | null
  created_at: string
}

const COLUMNS = 'id, number, kind, event_id, offer_id, issuer, client, lines, issued_on, delivered_on, due_on, total_net, total_vat, total, note, paid_on, cancelled_at, created_at'

const fromRow = (row: Row): Invoice => ({
  id: row.id,
  number: row.number,
  kind: row.kind,
  eventId: row.event_id,
  offerId: row.offer_id,
  issuer: row.issuer,
  client: row.client,
  lines: Array.isArray(row.lines) ? row.lines : [],
  issuedOn: row.issued_on,
  deliveredOn: row.delivered_on,
  dueOn: row.due_on,
  totalNet: Number(row.total_net),
  totalVat: Number(row.total_vat),
  total: Number(row.total),
  note: row.note,
  paidOn: row.paid_on,
  cancelledAt: row.cancelled_at,
  createdAt: row.created_at,
})

export async function fetchInvoices(companyId: string): Promise<Invoice[]> {
  const { data, error } = await getSupabase().from('invoices').select(COLUMNS).eq('company_id', companyId).order('number', { ascending: false })
  if (error) throw error
  return (data as unknown as Row[]).map(fromRow)
}

export function useInvoices(companyId: string) {
  return useQuery({ queryKey: invoiceKeys.list(companyId), queryFn: () => fetchInvoices(companyId), retry: false })
}

/** Vystaví faktúru; číslo pridelí databáza. Súčty sa počítajú z položiek. */
export async function createInvoice(companyId: string, draft: InvoiceDraft): Promise<string> {
  // Neplatiteľ DPH: bez dane bez ohľadu na sadzby v položkách.
  const payer = draft.issuer.vatPayer
  const lines = draft.lines
    .filter((line) => line.label.trim() && line.quantity !== 0)
    .map((line) => ({ label: line.label.trim().slice(0, 300), quantity: line.quantity, unit: line.unit.trim().slice(0, 10), unitPrice: line.unitPrice, vatRate: payer ? line.vatRate : 0 }))
  if (lines.length === 0) throw new Error('Pridajte aspoň jednu položku.')
  const totals = invoiceTotals(lines)
  const { data, error } = await getSupabase()
    .from('invoices')
    .insert({
      company_id: companyId,
      kind: draft.kind,
      event_id: draft.eventId,
      offer_id: draft.offerId,
      issuer: draft.issuer,
      client: draft.client,
      lines,
      issued_on: draft.issuedOn,
      delivered_on: draft.deliveredOn,
      due_on: draft.dueOn,
      total_net: totals.net,
      total_vat: totals.vat,
      total: totals.total,
      note: draft.note.trim().slice(0, 1000),
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

export async function setInvoicePaid(id: string, paidOn: string | null) {
  const { data, error } = await getSupabase().from('invoices').update({ paid_on: paidOn }).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

export async function cancelInvoice(id: string) {
  const { data, error } = await getSupabase().from('invoices').update({ cancelled_at: new Date().toISOString() }).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}
