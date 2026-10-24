import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import { isMissingColumn } from '@/lib/supabase/errors'

export type PartnerContact = { id: string; name: string; role: string; phone: string; email: string }
export type Partner = {
  id: string
  name: string
  ico: string
  dic: string
  address: string
  usesApp: boolean
  note: string
  contacts: PartnerContact[]
  /** Firma v RigTracku, ktorú sme im založili (0064). */
  linkedCompanyId?: string | null
  /** Zdieľaná s prepojenými firmami (0065). */
  shared?: boolean
}

// Väzba na založenú firmu (0064); bez migrácie sa adresár načíta bez nej.
const LINK_COLUMNS = [', linked_company_id, shared', ', linked_company_id', '']
let linkLevel = 0
const linkedColumn = () => LINK_COLUMNS[linkLevel]
export type EventPartner = { partnerId: string; kind: 'organizer' | 'partner' }

export const partnerKeys = {
  list: (companyId: string) => ['company', companyId, 'partners'] as const,
  ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'partners'] as const,
  links: (companyId: string) => ['company', companyId, 'event-partners'] as const,
}

export async function fetchPartners(companyId: string): Promise<Partner[]> {
  const db = getSupabase()
  const [partners, contacts] = await Promise.all([
    db.from('partners').select('id, name, ico, dic, address, uses_app, note' + linkedColumn()).eq('company_id', companyId).order('name'),
    db.from('partner_contacts').select('id, partner_id, name, role, phone, email').eq('company_id', companyId).order('name'),
  ])
  if (linkLevel < 2 && isMissingColumn(partners.error, linkLevel === 0 ? 'shared' : 'linked_company_id')) {
    linkLevel += 1
    return fetchPartners(companyId)
  }
  if (partners.error) throw partners.error
  if (contacts.error) throw contacts.error
  const people = contacts.data as (PartnerContact & { partner_id: string })[]
  return (partners.data as unknown as { id: string; name: string; ico: string; dic: string; address: string; uses_app: boolean; note: string; linked_company_id?: string | null; shared?: boolean }[]).map((row) => ({
    id: row.id,
    name: row.name,
    ico: row.ico,
    dic: row.dic,
    address: row.address,
    usesApp: row.uses_app,
    note: row.note,
    contacts: people.filter((person) => person.partner_id === row.id).map(({ id, name, role, phone, email }) => ({ id, name, role, phone, email })),
    linkedCompanyId: linkLevel < 2 ? (row.linked_company_id ?? null) : undefined,
    shared: linkLevel === 0 ? Boolean(row.shared) : undefined,
  }))
}

export function usePartners(companyId: string) {
  return useQuery({ queryKey: partnerKeys.list(companyId), queryFn: () => fetchPartners(companyId), retry: false })
}

export type PartnerFields = Pick<Partner, 'name' | 'ico' | 'dic' | 'address' | 'usesApp' | 'note'>

export async function savePartner(companyId: string, id: string | null, fields: PartnerFields) {
  const row = { name: fields.name.trim(), ico: fields.ico.trim(), dic: fields.dic.trim(), address: fields.address.trim(), uses_app: fields.usesApp, note: fields.note.trim() }
  const table = getSupabase().from('partners')
  const { data, error } = id ? await table.update(row).eq('id', id).select('id').single() : await table.insert({ ...row, company_id: companyId }).select('id').single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function deletePartner(id: string) {
  const { error } = await getSupabase().from('partners').delete().eq('id', id)
  if (error) throw error
}

export async function addContact(companyId: string, partnerId: string, contact: Omit<PartnerContact, 'id'>) {
  const { error } = await getSupabase()
    .from('partner_contacts')
    .insert({ company_id: companyId, partner_id: partnerId, name: contact.name.trim(), role: contact.role.trim(), phone: contact.phone.trim(), email: contact.email.trim() })
  if (error) throw error
}

export async function deleteContact(id: string) {
  const { error } = await getSupabase().from('partner_contacts').delete().eq('id', id)
  if (error) throw error
}

export async function fetchEventPartners(companyId: string, eventId: string): Promise<EventPartner[]> {
  const { data, error } = await getSupabase().from('event_partners').select('partner_id, kind').eq('company_id', companyId).eq('event_id', eventId)
  if (error) throw error
  return (data as { partner_id: string; kind: EventPartner['kind'] }[]).map((row) => ({ partnerId: row.partner_id, kind: row.kind }))
}

export async function linkPartner(companyId: string, eventId: string, partnerId: string, kind: EventPartner['kind']) {
  const { error } = await getSupabase().from('event_partners').insert({ company_id: companyId, event_id: eventId, partner_id: partnerId, kind })
  if (error) throw error
}

export async function unlinkPartner(eventId: string, partnerId: string) {
  const { error } = await getSupabase().from('event_partners').delete().eq('event_id', eventId).eq('partner_id', partnerId)
  if (error) throw error
}

/**
 * Nastaví organizátora eventu podľa formulára: existujúcu firmu, novú (založí ju aj s kontaktom), alebo žiadnu.
 * Predošlí organizátori eventu sa odpoja; spolupracujúce firmy ostanú.
 */
export async function setEventOrganizer(
  companyId: string,
  eventId: string,
  choice: string,
  typed: { organizer: string; organizerPerson: string; organizerPhone: string; organizerEmail: string },
) {
  const db = getSupabase()
  let partnerId = choice
  if (choice === 'new') {
    if (!typed.organizer.trim()) return
    partnerId = await savePartner(companyId, null, { name: typed.organizer, ico: '', dic: '', address: '', usesApp: false, note: '' })
    if (typed.organizerPerson.trim() || typed.organizerPhone.trim() || typed.organizerEmail.trim()) {
      await addContact(companyId, partnerId, { name: typed.organizerPerson.trim() || typed.organizer.trim(), role: '', phone: typed.organizerPhone, email: typed.organizerEmail })
    }
  }
  const current = await fetchEventPartners(companyId, eventId)
  for (const item of current) {
    if (item.kind === 'organizer' && item.partnerId !== partnerId) await unlinkPartner(eventId, item.partnerId)
  }
  if (!partnerId) return
  const existing = current.find((item) => item.partnerId === partnerId)
  if (!existing) await linkPartner(companyId, eventId, partnerId, 'organizer')
  else if (existing.kind !== 'organizer') {
    const { error } = await db.from('event_partners').update({ kind: 'organizer' }).eq('event_id', eventId).eq('partner_id', partnerId)
    if (error) throw error
  }
}

/** Všetky väzby firiem na eventy (pre históriu klientov). */
export async function fetchAllEventPartners(companyId: string) {
  const { data, error } = await getSupabase().from('event_partners').select('event_id, partner_id, kind').eq('company_id', companyId)
  if (error) throw error
  return (data as { event_id: string; partner_id: string; kind: EventPartner['kind'] }[]).map((row) => ({ eventId: row.event_id, partnerId: row.partner_id, kind: row.kind }))
}
