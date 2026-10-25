// Cenové ponuky, vystavovatelia a šablóny častí (0096).
import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import { EMPTY_CLIENT, EMPTY_ISSUER, normalizePart, type Offer, type OfferClient, type OfferIssuer, type OfferPart, type OfferStatus, type VatMode } from './model'

export const offerKeys = {
  list: (companyId: string) => ['company', companyId, 'offers'] as const,
  detail: (companyId: string, id: string) => ['company', companyId, 'offers', id] as const,
  issuers: (companyId: string) => ['company', companyId, 'offer-issuers'] as const,
  templates: (companyId: string) => ['company', companyId, 'offer-templates'] as const,
}

type Row = {
  id: string
  event_id: string | null
  number: string
  status: OfferStatus
  client: Partial<OfferClient>
  issuer_id: string | null
  issuer: Partial<OfferIssuer>
  budget: number | string | null
  title: string
  place: string
  service_dates: string
  issued_on: string
  sections: Partial<OfferPart>[]
  vat_mode: VatMode
  vat_pct: number | string
  total_override: number | string | null
  notes: string
  author_name: string
  updated_at: string
}
const COLUMNS = 'id, event_id, number, status, client, issuer_id, issuer, budget, title, place, service_dates, issued_on, sections, vat_mode, vat_pct, total_override, notes, author_name, updated_at'
const num = (value: number | string | null) => (value === null ? null : Number(value))

const toOffer = (row: Row): Offer => ({
  id: row.id,
  eventId: row.event_id,
  number: row.number,
  status: row.status,
  client: { ...EMPTY_CLIENT, ...row.client },
  issuerId: row.issuer_id,
  issuer: { ...EMPTY_ISSUER, ...row.issuer },
  budget: num(row.budget),
  title: row.title,
  place: row.place,
  serviceDates: row.service_dates,
  issuedOn: row.issued_on,
  sections: (row.sections ?? []).map(normalizePart),
  vatMode: row.vat_mode,
  vatPct: Number(row.vat_pct),
  totalOverride: num(row.total_override),
  notes: row.notes,
  authorName: row.author_name,
  updatedAt: row.updated_at,
})

export async function fetchOffers(companyId: string): Promise<Offer[]> {
  const { data, error } = await getSupabase().from('quotes').select(COLUMNS).eq('company_id', companyId).order('issued_on', { ascending: false }).order('updated_at', { ascending: false })
  if (error) throw error
  return (data as Row[]).map(toOffer)
}

export function useOffers(companyId: string) {
  return useQuery({ queryKey: offerKeys.list(companyId), queryFn: () => fetchOffers(companyId), retry: false })
}

export async function fetchOffer(companyId: string, id: string): Promise<Offer | null> {
  const { data, error } = await getSupabase().from('quotes').select(COLUMNS).eq('company_id', companyId).eq('id', id).maybeSingle()
  if (error) throw error
  return data ? toOffer(data as Row) : null
}

export function useOffer(companyId: string, id: string) {
  return useQuery({ queryKey: offerKeys.detail(companyId, id), queryFn: () => fetchOffer(companyId, id), enabled: Boolean(id) && id !== 'new', retry: false })
}

export type OfferFields = Omit<Offer, 'id' | 'updatedAt'>

export async function saveOffer(companyId: string, id: string | null, offer: OfferFields): Promise<string> {
  const row = {
    event_id: offer.eventId,
    number: offer.number.trim(),
    status: offer.status,
    client: offer.client,
    issuer_id: offer.issuerId,
    issuer: offer.issuer,
    budget: offer.budget,
    title: offer.title.trim(),
    place: offer.place.trim(),
    service_dates: offer.serviceDates.trim(),
    issued_on: offer.issuedOn,
    sections: offer.sections,
    vat_mode: offer.vatMode,
    vat_pct: offer.vatPct,
    total_override: offer.totalOverride,
    notes: offer.notes,
    author_name: offer.authorName.trim(),
    updated_at: new Date().toISOString(),
  }
  const table = getSupabase().from('quotes')
  const { data, error } = id ? await table.update(row).eq('company_id', companyId).eq('id', id).select('id').single() : await table.insert({ ...row, company_id: companyId }).select('id').single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function deleteOffer(companyId: string, id: string) {
  const { error } = await getSupabase().from('quotes').delete().eq('company_id', companyId).eq('id', id)
  if (error) throw error
}

export type Issuer = OfferIssuer & { id: string }

export async function fetchIssuers(companyId: string): Promise<Issuer[]> {
  const { data, error } = await getSupabase().from('quote_issuers').select('id, name, address, ico, dic, ic_dph, contact, vat_payer').eq('company_id', companyId).order('sort').order('name')
  if (error) throw error
  return (data as { id: string; name: string; address: string; ico: string; dic: string; ic_dph: string; contact: string; vat_payer: boolean }[]).map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    ico: row.ico,
    dic: row.dic,
    icDph: row.ic_dph,
    contact: row.contact,
    vatPayer: row.vat_payer,
  }))
}

export function useIssuers(companyId: string) {
  return useQuery({ queryKey: offerKeys.issuers(companyId), queryFn: () => fetchIssuers(companyId), retry: false })
}

export async function saveIssuer(companyId: string, id: string | null, issuer: OfferIssuer) {
  const row = { name: issuer.name.trim(), address: issuer.address.trim(), ico: issuer.ico.trim(), dic: issuer.dic.trim(), ic_dph: issuer.icDph.trim(), contact: issuer.contact.trim(), vat_payer: issuer.vatPayer }
  const table = getSupabase().from('quote_issuers')
  const { error } = id ? await table.update(row).eq('company_id', companyId).eq('id', id) : await table.insert({ ...row, company_id: companyId })
  if (error) throw error
}

export async function deleteIssuer(companyId: string, id: string) {
  const { error } = await getSupabase().from('quote_issuers').delete().eq('company_id', companyId).eq('id', id)
  if (error) throw error
}

export type PartTemplate = { id: string; title: string; part: OfferPart }

export async function fetchTemplates(companyId: string): Promise<PartTemplate[]> {
  const { data, error } = await getSupabase().from('quote_templates').select('id, title, part').eq('company_id', companyId).order('title')
  if (error) throw error
  return (data as { id: string; title: string; part: Partial<OfferPart> }[]).map((row) => ({ id: row.id, title: row.title, part: normalizePart(row.part) }))
}

export function useTemplates(companyId: string) {
  return useQuery({ queryKey: offerKeys.templates(companyId), queryFn: () => fetchTemplates(companyId), retry: false })
}

export async function saveTemplate(companyId: string, part: OfferPart) {
  const { error } = await getSupabase().from('quote_templates').insert({ company_id: companyId, title: part.title.trim() || 'Časť', part })
  if (error) throw error
}

export async function deleteTemplate(companyId: string, id: string) {
  const { error } = await getSupabase().from('quote_templates').delete().eq('company_id', companyId).eq('id', id)
  if (error) throw error
}
