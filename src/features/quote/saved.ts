// Uložené cenové ponuky (0093): presná kópia ponuky v čase uloženia, číslo v roku a stav.
import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import type { QuoteLine } from './model'

/** Všetko, čo treba na vytlačenie ponuky – živej aj uloženej. */
export type QuoteDoc = {
  eventName: string
  eventDates: string
  venue: string
  client: string
  firm: { name: string; address: string; ico: string; dic: string; contact: string }
  lines: QuoteLine[]
  subtotal: number
  discount: number
  discountPct: number
  base: number
  vat: number
  vatPct: number
  withVat: boolean
  total: number
  issuedOn: string
  validUntil: string
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected'
export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = { draft: 'koncept', sent: 'poslaná', accepted: 'prijatá', rejected: 'odmietnutá' }
export type SavedQuote = { id: string; year: number; number: number; total: number; status: QuoteStatus; createdAt: string; doc: QuoteDoc }

export const savedQuoteKeys = { ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'quotes'] as const }

export const quoteNumber = (quote: Pick<SavedQuote, 'year' | 'number'>) => `${quote.year}/${String(quote.number).padStart(3, '0')}`

export async function fetchSavedQuotes(companyId: string, eventId: string): Promise<SavedQuote[]> {
  const { data, error } = await getSupabase()
    .from('event_quotes')
    .select('id, year, number, total, status, created_at, data')
    .eq('company_id', companyId)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as { id: string; year: number; number: number; total: number | string; status: QuoteStatus; created_at: string; data: QuoteDoc }[]).map((row) => ({
    id: row.id,
    year: row.year,
    number: row.number,
    total: Number(row.total),
    status: row.status,
    createdAt: row.created_at,
    doc: row.data,
  }))
}

/** Bez migrácie 0093 sa história nezobrazí. */
export function useSavedQuotes(companyId: string, eventId: string) {
  return useQuery({ queryKey: savedQuoteKeys.ofEvent(companyId, eventId), queryFn: () => fetchSavedQuotes(companyId, eventId), retry: false })
}

export async function saveQuote(companyId: string, eventId: string, doc: QuoteDoc) {
  const { data, error } = await getSupabase().from('event_quotes').insert({ company_id: companyId, event_id: eventId, total: doc.total, data: doc }).select('id').single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function setQuoteStatus(id: string, status: QuoteStatus) {
  const { error } = await getSupabase().from('event_quotes').update({ status }).eq('id', id)
  if (error) throw error
}

export async function deleteQuote(id: string) {
  const { error } = await getSupabase().from('event_quotes').delete().eq('id', id)
  if (error) throw error
}
