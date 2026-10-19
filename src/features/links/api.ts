import { useQuery } from '@tanstack/react-query'
import type { EquipmentAttributes, EquipmentKind, EquipmentStatus } from '@/features/equipment/model'
import { getSupabase } from '@/lib/supabase/client'

export type CompanyLink = {
  linkId: string
  companyId: string
  name: string
  status: 'pending' | 'accepted'
  /** Žiadosť prišla k nám (potvrdzujeme my). */
  incoming: boolean
  iShareEquipment: boolean
  theyShareEquipment: boolean
  iShareContacts: boolean
  theyShareContacts: boolean
}

export type LinkedEquipment = {
  id: string
  companyId: string
  companyName: string
  name: string
  kind: EquipmentKind
  category: string
  quantity: number
  manufacturer: string
  model: string
  attributes: EquipmentAttributes
  status: EquipmentStatus
}

export type LinkedPartner = {
  id: string
  companyName: string
  name: string
  ico: string
  dic: string
  address: string
  note: string
  contacts: { name: string; role: string; phone: string; email: string }[]
}

export type SharedEvent = {
  eventId: string
  ownerName: string
  name: string
  startsOn: string
  endsOn: string
  venue: string
  address: string
  status: string
  ownerPart: string
  partnerPart: string
  days: { day: string; kind: string; starts_at: string | null; ends_at: string | null; note: string }[]
}

export const linkKeys = {
  list: (companyId: string) => ['company', companyId, 'links'] as const,
  code: (companyId: string) => ['company', companyId, 'links', 'code'] as const,
  equipment: (companyId: string) => ['company', companyId, 'links', 'equipment'] as const,
  partners: (companyId: string) => ['company', companyId, 'links', 'partners'] as const,
  sharedEvents: (companyId: string) => ['company', companyId, 'links', 'events'] as const,
  eventShares: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'shares'] as const,
}

const rpc = async <T>(name: string, args: Record<string, unknown>) => {
  const { data, error } = await getSupabase().rpc(name, args)
  if (error) throw error
  return data as T
}

export async function fetchLinks(companyId: string): Promise<CompanyLink[]> {
  const rows = await rpc<
    { link_id: string; company_id: string; name: string; status: CompanyLink['status']; incoming: boolean; i_share_equipment: boolean; they_share_equipment: boolean; i_share_contacts: boolean; they_share_contacts: boolean }[]
  >('linked_companies', { _company_id: companyId })
  return rows.map((row) => ({
    linkId: row.link_id,
    companyId: row.company_id,
    name: row.name,
    status: row.status,
    incoming: row.incoming,
    iShareEquipment: row.i_share_equipment,
    theyShareEquipment: row.they_share_equipment,
    iShareContacts: row.i_share_contacts,
    theyShareContacts: row.they_share_contacts,
  }))
}

/** Prepojenia firmy; bez migrácie 0065 ticho prázdne (retry vypnutý). */
export function useLinks(companyId: string) {
  return useQuery({ queryKey: linkKeys.list(companyId), queryFn: () => fetchLinks(companyId), retry: false })
}

export const fetchLinkCode = (companyId: string) => rpc<string>('my_link_code', { _company_id: companyId })
export const requestLink = (companyId: string, code: string) => rpc<string>('request_company_link', { _company_id: companyId, _code: code })
export const acceptLink = (linkId: string) => rpc<null>('accept_company_link', { _link_id: linkId })
export const setLinkSharing = (linkId: string, companyId: string, equipment: boolean, contacts: boolean) =>
  rpc<null>('set_link_sharing', { _link_id: linkId, _company_id: companyId, _equipment: equipment, _contacts: contacts })

export async function removeLink(linkId: string) {
  const { error } = await getSupabase().from('company_links').delete().eq('id', linkId)
  if (error) throw error
}

export async function fetchLinkedEquipment(companyId: string): Promise<LinkedEquipment[]> {
  const rows = await rpc<
    { id: string; company_id: string; company_name: string; name: string; kind: EquipmentKind; category: string; quantity: number; manufacturer: string; model: string; attributes: EquipmentAttributes | null; status: EquipmentStatus }[]
  >('linked_equipment', { _company_id: companyId })
  return rows.map((row) => ({
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    name: row.name,
    kind: row.kind,
    category: row.category,
    quantity: row.quantity,
    manufacturer: row.manufacturer,
    model: row.model,
    attributes: row.attributes ?? {},
    status: row.status,
  }))
}

export function useLinkedEquipment(companyId: string, enabled = true) {
  return useQuery({ queryKey: linkKeys.equipment(companyId), queryFn: () => fetchLinkedEquipment(companyId), retry: false, enabled })
}

export async function fetchLinkedPartners(companyId: string): Promise<LinkedPartner[]> {
  const rows = await rpc<(Omit<LinkedPartner, 'companyName'> & { company_name: string })[]>('linked_partners', { _company_id: companyId })
  return rows.map(({ company_name, ...row }) => ({ ...row, companyName: company_name, contacts: row.contacts ?? [] }))
}

export async function setPartnerShared(partnerId: string, shared: boolean) {
  const { error } = await getSupabase().from('partners').update({ shared }).eq('id', partnerId)
  if (error) throw error
}

export async function fetchSharedEvents(companyId: string): Promise<SharedEvent[]> {
  const rows = await rpc<
    { event_id: string; owner_name: string; name: string; starts_on: string; ends_on: string; venue: string; address: string; status: string; owner_part: string; partner_part: string; days: SharedEvent['days'] }[]
  >('shared_events', { _company_id: companyId })
  return rows.map((row) => ({
    eventId: row.event_id,
    ownerName: row.owner_name,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    venue: row.venue,
    address: row.address ?? '',
    status: row.status,
    ownerPart: row.owner_part,
    partnerPart: row.partner_part,
    days: row.days ?? [],
  }))
}

export const setPartnerPart = (eventId: string, companyId: string, part: string) => rpc<null>('set_partner_part', { _event_id: eventId, _company_id: companyId, _part: part })

export type EventShare = { partnerCompany: string; ownerPart: string; partnerPart: string }

export async function fetchEventShares(eventId: string): Promise<EventShare[]> {
  const { data, error } = await getSupabase().from('event_shares').select('partner_company, owner_part, partner_part').eq('event_id', eventId)
  if (error) throw error
  return (data as { partner_company: string; owner_part: string; partner_part: string }[]).map((row) => ({ partnerCompany: row.partner_company, ownerPart: row.owner_part, partnerPart: row.partner_part }))
}

export async function shareEvent(companyId: string, eventId: string, partnerCompany: string, ownerPart: string) {
  const { error } = await getSupabase().from('event_shares').insert({ company_id: companyId, event_id: eventId, partner_company: partnerCompany, owner_part: ownerPart.trim() })
  if (error) throw error
}

export async function setOwnerPart(eventId: string, partnerCompany: string, ownerPart: string) {
  const { error } = await getSupabase().from('event_shares').update({ owner_part: ownerPart.trim() }).eq('event_id', eventId).eq('partner_company', partnerCompany)
  if (error) throw error
}

export async function unshareEvent(eventId: string, partnerCompany: string) {
  const { error } = await getSupabase().from('event_shares').delete().eq('event_id', eventId).eq('partner_company', partnerCompany)
  if (error) throw error
}
