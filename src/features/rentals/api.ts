import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

// Dopyty na prenájom techniky k akcii: položky, dodávatelia s vlastným odkazom (r/:token) a ich odpovede.

export type RentalItem = { id: string; equipmentId: string | null; name: string; quantity: number; note: string }
export type RentalQuote = { supplierId: string; itemId: string; available: number; unitPrice: number | null; note: string }
export type RentalSupplier = { id: string; partnerId: string | null; name: string; email: string; token: string; revokedAt: string | null; viewedAt: string | null; respondedAt: string | null; message: string }
export type RentalRequest = { id: string; title: string; note: string; from: string; to: string; status: 'open' | 'closed'; createdAt: string; items: RentalItem[]; suppliers: RentalSupplier[]; quotes: RentalQuote[] }

export const rentalKeys = { ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'rentals'] as const }
export const rentalLink = (token: string) => `${window.location.origin}${import.meta.env.BASE_URL}r/${token}`

type Row = {
  id: string
  title: string
  note: string
  needed_from: string
  needed_to: string
  status: 'open' | 'closed'
  created_at: string
  rental_request_items: { id: string; equipment_id: string | null; name: string; quantity: number; note: string; sort: number }[]
  rental_request_suppliers: {
    id: string
    partner_id: string | null
    supplier_name: string
    email: string
    token: string
    revoked_at: string | null
    viewed_at: string | null
    responded_at: string | null
    message: string
    rental_quotes: { item_id: string; available: number; unit_price: string | number | null; note: string }[]
  }[]
}

/** Dopyty akcie s položkami, dodávateľmi a odpoveďami; bez migrácie 0202 null. */
export async function fetchRentals(companyId: string, eventId: string): Promise<RentalRequest[] | null> {
  const { data, error } = await getSupabase()
    .from('rental_requests')
    .select('id, title, note, needed_from, needed_to, status, created_at, rental_request_items(id, equipment_id, name, quantity, note, sort), rental_request_suppliers(id, partner_id, supplier_name, email, token, revoked_at, viewed_at, responded_at, message, rental_quotes(item_id, available, unit_price, note))')
    .eq('company_id', companyId)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
  if (error) return null
  return (data as Row[]).map((row) => ({
    id: row.id,
    title: row.title,
    note: row.note,
    from: row.needed_from,
    to: row.needed_to,
    status: row.status,
    createdAt: row.created_at,
    items: [...(row.rental_request_items ?? [])].sort((a, b) => a.sort - b.sort).map((item) => ({ id: item.id, equipmentId: item.equipment_id, name: item.name, quantity: item.quantity, note: item.note })),
    suppliers: (row.rental_request_suppliers ?? []).map((supplier) => ({
      id: supplier.id,
      partnerId: supplier.partner_id,
      name: supplier.supplier_name,
      email: supplier.email,
      token: supplier.token,
      revokedAt: supplier.revoked_at,
      viewedAt: supplier.viewed_at,
      respondedAt: supplier.responded_at,
      message: supplier.message,
    })),
    quotes: (row.rental_request_suppliers ?? []).flatMap((supplier) =>
      (supplier.rental_quotes ?? []).map((quote) => ({ supplierId: supplier.id, itemId: quote.item_id, available: quote.available, unitPrice: quote.unit_price === null ? null : Number(quote.unit_price), note: quote.note })),
    ),
  }))
}

export function useRentals(companyId: string, eventId: string) {
  return useQuery({ queryKey: rentalKeys.ofEvent(companyId, eventId), queryFn: () => fetchRentals(companyId, eventId), retry: false })
}

export type NewRental = { title: string; note: string; from: string; to: string; items: { equipment_id: string | null; name: string; quantity: number; note: string }[]; suppliers: { partner_id: string | null; name: string; email: string }[] }

export async function createRental(eventId: string, value: NewRental): Promise<string> {
  const { data, error } = await getSupabase().rpc('create_rental_request', { _event_id: eventId, _title: value.title.trim(), _note: value.note.trim(), _from: value.from, _to: value.to, _items: value.items, _suppliers: value.suppliers })
  if (error) throw error
  return data as string
}

export async function addSupplier(requestId: string, name: string, email: string, partnerId: string | null): Promise<string> {
  const { data, error } = await getSupabase().rpc('add_rental_supplier', { _request_id: requestId, _name: name.trim(), _email: email.trim(), _partner_id: partnerId })
  if (error) throw error
  return data as string
}

export async function revokeSupplier(supplierId: string) {
  const { error } = await getSupabase().from('rental_request_suppliers').update({ revoked_at: new Date().toISOString() }).eq('id', supplierId)
  if (error) throw error
}

export async function setRentalStatus(requestId: string, status: 'open' | 'closed') {
  const { error } = await getSupabase().from('rental_requests').update({ status }).eq('id', requestId)
  if (error) throw error
}

export async function deleteRental(requestId: string) {
  const { error } = await getSupabase().from('rental_requests').delete().eq('id', requestId)
  if (error) throw error
}

/**
 * Porovnanie dodávateľov: pri každom koľko položiek pokryje celé, cena za to, čo vie dodať (kusy × cena za kus za
 * obdobie), a pri každej položke najlacnejší dodávateľ, ktorý má dosť kusov.
 */
export function compareSuppliers(request: Pick<RentalRequest, 'items' | 'suppliers' | 'quotes'>) {
  const quoteOf = (supplierId: string, itemId: string) => request.quotes.find((quote) => quote.supplierId === supplierId && quote.itemId === itemId)
  const suppliers = request.suppliers
    .filter((supplier) => supplier.respondedAt)
    .map((supplier) => {
      let covered = 0
      let total = 0
      let priced = true
      for (const item of request.items) {
        const quote = quoteOf(supplier.id, item.id)
        if (!quote || quote.available <= 0) continue
        if (quote.available >= item.quantity) covered++
        if (quote.unitPrice === null) priced = false
        else total += Math.min(quote.available, item.quantity) * quote.unitPrice
      }
      return { id: supplier.id, name: supplier.name, covered, total: Math.round(total * 100) / 100, priced, complete: covered === request.items.length }
    })
  const best = new Map<string, string>()
  for (const item of request.items) {
    const candidates = request.quotes.filter((quote) => quote.itemId === item.id && quote.available >= item.quantity && quote.unitPrice !== null).sort((a, b) => a.unitPrice! - b.unitPrice!)
    if (candidates[0]) best.set(item.id, candidates[0].supplierId)
  }
  const cheapestComplete = suppliers.filter((supplier) => supplier.complete && supplier.priced).sort((a, b) => a.total - b.total)[0]?.id ?? null
  return { suppliers, best, cheapestComplete, quoteOf }
}

// ------------------------------------------------------------------ stránka pre dodávateľa

export type PublicRental = {
  title: string
  note: string
  from: string
  to: string
  open: boolean
  supplier: string
  message: string
  respondedAt: string | null
  companyName: string
  logoPath?: string
  logoStyle?: string
  contact?: string
  venue: string | null
  items: { id: string; name: string; quantity: number; note: string; available: number | null; price: number | string | null; answer: string }[]
}

export async function fetchPublicRental(token: string): Promise<PublicRental | null> {
  const { data, error } = await getSupabase().rpc('get_rental_request', { _token: token })
  if (error) throw error
  return (data as PublicRental | null) ?? null
}

export async function answerRental(token: string, answers: { item_id: string; available: number; price: string; note: string }[], message: string) {
  const { error } = await getSupabase().rpc('answer_rental_request', { _token: token, _answers: answers, _message: message.trim() })
  if (error) throw error
}
