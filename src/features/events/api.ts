import { getSupabase } from '@/lib/supabase/client'
import type { CompanyEvent, EventDocument, EventFormValues, EventStatus } from './model'

const BUCKET = 'event-documents'

export const eventKeys = {
  list: (companyId: string) => ['company', companyId, 'events'] as const,
  documents: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'documents'] as const,
}

/** Všetky eventy firmy s technikou a posádkou. Tri dotazy, aby nezáviselo od vnárania cez zložené kľúče. */
export async function fetchEvents(companyId: string): Promise<CompanyEvent[]> {
  const db = getSupabase()
  const [events, equipment, crew] = await Promise.all([
    db.from('events').select('id, name, client, venue, starts_on, ends_on, status, note').eq('company_id', companyId),
    db.from('event_equipment').select('event_id, equipment_id, quantity, case_id').eq('company_id', companyId),
    db.from('event_crew').select('id, event_id, member_id, name, role').eq('company_id', companyId).order('created_at'),
  ])
  const error = events.error ?? equipment.error ?? crew.error
  if (error) throw error

  const equipmentRows = equipment.data as { event_id: string; equipment_id: string; quantity: number; case_id: string | null }[]
  const crewRows = crew.data as { id: string; event_id: string; member_id: string | null; name: string; role: string }[]
  const rows = events.data as {
    id: string
    name: string
    client: string
    venue: string
    starts_on: string
    ends_on: string
    status: EventStatus
    note: string
  }[]
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    client: row.client,
    venue: row.venue,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    status: row.status,
    note: row.note,
    equipment: equipmentRows
      .filter((item) => item.event_id === row.id)
      .map((item) => ({ equipmentId: item.equipment_id, quantity: item.quantity, caseId: item.case_id })),
    crew: crewRows
      .filter((member) => member.event_id === row.id)
      .map((member) => ({ id: member.id, memberId: member.member_id, name: member.name, role: member.role })),
  }))
}

export async function saveEvent(companyId: string, id: string | null, values: EventFormValues): Promise<string> {
  const fields = {
    name: values.name,
    client: values.client,
    venue: values.venue,
    starts_on: values.startsOn,
    ends_on: values.endsOn,
    status: values.status,
    note: values.note,
  }
  const table = getSupabase().from('events')
  const { data, error } = id
    ? await table.update(fields).eq('company_id', companyId).eq('id', id).select('id').single()
    : await table.insert({ ...fields, company_id: companyId }).select('id').single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function deleteEvent(companyId: string, id: string) {
  // Súbory dokumentov nie sú v databáze, treba ich zmazať zvlášť, kým ešte poznáme ich cesty.
  const documents = await fetchEventDocuments(companyId, id).catch(() => [])
  const { data, error } = await getSupabase().from('events').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
  if (documents.length > 0) await getSupabase().storage.from(BUCKET).remove(documents.map((document) => document.path))
}

export async function addEventEquipment(companyId: string, eventId: string, equipmentId: string) {
  const { error } = await getSupabase()
    .from('event_equipment')
    .insert({ company_id: companyId, event_id: eventId, equipment_id: equipmentId, quantity: 1 })
  if (error) throw error
}

/**
 * Pridá na event celý case: každú položku v plnom počte. Technika z neho, ktorá už na evente
 * bola jednotlivo, sa nahradí.
 */
export async function addEventCase(companyId: string, eventId: string, caseId: string, content: { equipmentId: string; quantity: number }[]) {
  if (content.length === 0) throw new Error('Empty case')
  const table = getSupabase().from('event_equipment')
  const cleared = await table
    .delete()
    .eq('event_id', eventId)
    .in(
      'equipment_id',
      content.map((item) => item.equipmentId),
    )
  if (cleared.error) throw cleared.error
  const { error } = await table.insert(
    content.map((item) => ({ company_id: companyId, event_id: eventId, equipment_id: item.equipmentId, quantity: item.quantity, case_id: caseId })),
  )
  if (error) throw error
}

export async function removeEventCase(eventId: string, caseId: string) {
  const { data, error } = await getSupabase().from('event_equipment').delete().eq('event_id', eventId).eq('case_id', caseId).select('equipment_id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}

export async function setEventEquipmentQuantity(eventId: string, equipmentId: string, quantity: number) {
  const { data, error } = await getSupabase()
    .from('event_equipment')
    .update({ quantity })
    .eq('event_id', eventId)
    .eq('equipment_id', equipmentId)
    .select('equipment_id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

export async function removeEventEquipment(eventId: string, equipmentId: string) {
  const { data, error } = await getSupabase()
    .from('event_equipment')
    .delete()
    .eq('event_id', eventId)
    .eq('equipment_id', equipmentId)
    .select('equipment_id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}

export async function addEventCrew(companyId: string, eventId: string, crew: { memberId: string | null; name: string; role: string }) {
  const { error } = await getSupabase()
    .from('event_crew')
    .insert({ company_id: companyId, event_id: eventId, member_id: crew.memberId, name: crew.name.trim(), role: crew.role.trim() })
  if (error) throw error
}

export async function removeEventCrew(id: string) {
  const { data, error } = await getSupabase().from('event_crew').delete().eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}

export async function fetchEventDocuments(companyId: string, eventId: string): Promise<EventDocument[]> {
  const { data, error } = await getSupabase()
    .from('event_documents')
    .select('id, name, path, size_bytes, created_at')
    .eq('company_id', companyId)
    .eq('event_id', eventId)
    .order('created_at')
  if (error) throw error
  const rows = data as { id: string; name: string; path: string; size_bytes: number; created_at: string }[]
  return rows.map((row) => ({ id: row.id, name: row.name, path: row.path, sizeBytes: Number(row.size_bytes), createdAt: row.created_at }))
}

export async function uploadEventDocument(companyId: string, eventId: string, file: File) {
  const db = getSupabase()
  // Pôvodný názov ostáva v databáze; v ceste je len bezpečná prípona, aby na názve nezáležalo.
  const extension = /\.([a-z0-9]{1,8})$/i.exec(file.name)?.[1]?.toLowerCase() ?? 'bin'
  const path = `${companyId}/${eventId}/${crypto.randomUUID()}.${extension}`
  const upload = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined })
  if (upload.error) throw upload.error
  const { error } = await db
    .from('event_documents')
    .insert({ company_id: companyId, event_id: eventId, name: file.name.slice(0, 200), path, size_bytes: file.size })
  if (error) {
    await db.storage.from(BUCKET).remove([path])
    throw error
  }
}

/** Presunie dokument do koša; súbor ostáva, kým ho admin neobnoví alebo kým sa kôš nevyčistí. */
export async function deleteEventDocument(document: EventDocument) {
  const { error } = await getSupabase().rpc('trash_event_document', { _id: document.id })
  if (error) throw error
}

/** Krátkodobý odkaz na stiahnutie; bucket je súkromný. */
export async function eventDocumentUrl(document: EventDocument) {
  const { data, error } = await getSupabase().storage.from(BUCKET).createSignedUrl(document.path, 120, { download: document.name })
  if (error) throw error
  return data.signedUrl
}
