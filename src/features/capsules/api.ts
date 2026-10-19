import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

/** Kapsula k bezdrôtovému mikrofónu (napr. Beta 58A, KSM9) a s čím sa dá použiť. */
export type Capsule = { id: string; name: string; manufacturer: string; quantity: number; fits: string; note: string }
export type CapsuleFields = Omit<Capsule, 'id'>
export type EventCapsule = { id: string; capsuleId: string; quantity: number; note: string }

export const capsuleKeys = {
  list: (companyId: string) => ['company', companyId, 'capsules'] as const,
  ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'capsules'] as const,
}

export async function fetchCapsules(companyId: string): Promise<Capsule[]> {
  const { data, error } = await getSupabase().from('mic_capsules').select('id, name, manufacturer, quantity, fits, note').eq('company_id', companyId).order('name')
  if (error) throw error
  return data as Capsule[]
}

/** Bez migrácie 0060 tabuľka chýba – stránka a sekcia pri evente sa vtedy ticho skryjú. */
export function useCapsules(companyId: string) {
  return useQuery({ queryKey: capsuleKeys.list(companyId), queryFn: () => fetchCapsules(companyId), retry: false })
}

export async function saveCapsule(companyId: string, id: string | null, fields: CapsuleFields) {
  const row = { name: fields.name.trim(), manufacturer: fields.manufacturer.trim(), quantity: fields.quantity, fits: fields.fits.trim(), note: fields.note.trim() }
  const table = getSupabase().from('mic_capsules')
  const { error } = id ? await table.update(row).eq('id', id) : await table.insert({ ...row, company_id: companyId })
  if (error) throw error
}

export async function deleteCapsule(id: string) {
  const { error } = await getSupabase().from('mic_capsules').delete().eq('id', id)
  if (error) throw error
}

export async function fetchEventCapsules(companyId: string, eventId: string): Promise<EventCapsule[]> {
  const { data, error } = await getSupabase().from('event_capsules').select('id, capsule_id, quantity, note').eq('company_id', companyId).eq('event_id', eventId)
  if (error) throw error
  return (data as { id: string; capsule_id: string; quantity: number; note: string }[]).map((row) => ({ id: row.id, capsuleId: row.capsule_id, quantity: row.quantity, note: row.note }))
}

export async function addEventCapsule(companyId: string, eventId: string, capsuleId: string, quantity: number, note: string) {
  const { error } = await getSupabase().from('event_capsules').insert({ company_id: companyId, event_id: eventId, capsule_id: capsuleId, quantity, note: note.trim() })
  if (error) throw error
}

export async function setEventCapsuleQuantity(id: string, quantity: number) {
  const { error } = await getSupabase().from('event_capsules').update({ quantity }).eq('id', id)
  if (error) throw error
}

export async function removeEventCapsule(id: string) {
  const { error } = await getSupabase().from('event_capsules').delete().eq('id', id)
  if (error) throw error
}
