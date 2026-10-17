import { storeCompanyPhoto } from '@/features/equipment/photo'
import { getSupabase } from '@/lib/supabase/client'
import type { StaffRow, Unavailability } from './model'

export const staffKeys = {
  list: (companyId: string) => ['company', companyId, 'staff'] as const,
  unavailability: (companyId: string) => ['company', companyId, 'staff', 'unavailability'] as const,
}

type Row = {
  id: string
  member_id: string | null
  name: string
  position: string
  phone: string
  email: string
  photo_path: string
  skills: string
  note: string
  active: boolean
}

export async function fetchStaff(companyId: string): Promise<StaffRow[]> {
  const { data, error } = await getSupabase()
    .from('staff')
    .select('id, member_id, name, position, phone, email, photo_path, skills, note, active')
    .eq('company_id', companyId)
  if (error) throw error
  return (data as Row[]).map((row) => ({
    id: row.id,
    memberId: row.member_id,
    name: row.name,
    position: row.position,
    phone: row.phone,
    email: row.email,
    photoPath: row.photo_path,
    skills: row.skills,
    note: row.note,
    active: row.active,
  }))
}

export async function fetchUnavailability(companyId: string): Promise<Unavailability[]> {
  const { data, error } = await getSupabase()
    .from('staff_unavailability')
    .select('id, staff_id, starts_on, ends_on, note')
    .eq('company_id', companyId)
    .order('starts_on')
  if (error) throw error
  return (data as { id: string; staff_id: string; starts_on: string; ends_on: string; note: string }[]).map((row) => ({
    id: row.id,
    staffId: row.staff_id,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    note: row.note,
  }))
}

export type StaffFields = Pick<StaffRow, 'name' | 'position' | 'phone' | 'email' | 'skills' | 'note' | 'active'>

const columns = (fields: StaffFields) => ({
  name: fields.name.trim(),
  position: fields.position.trim(),
  phone: fields.phone.trim(),
  email: fields.email.trim(),
  skills: fields.skills.trim(),
  note: fields.note.trim(),
  active: fields.active,
})

/** Uloží kartu; člen firmy bez karty ju dostane založenú. Vráti id karty. */
export async function saveStaff(companyId: string, staffId: string | null, memberId: string | null, fields: StaffFields): Promise<string> {
  const table = getSupabase().from('staff')
  if (staffId) {
    const { error } = await table.update(columns(fields)).eq('company_id', companyId).eq('id', staffId)
    if (error) throw error
    return staffId
  }
  const { data, error } = await table.insert({ ...columns(fields), company_id: companyId, member_id: memberId }).select('id').single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function deleteStaff(companyId: string, staffId: string) {
  const { data, error } = await getSupabase().from('staff').delete().eq('company_id', companyId).eq('id', staffId).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}

export async function setStaffPhoto(companyId: string, staffId: string, file: File) {
  const path = await storeCompanyPhoto(companyId, `staff-${staffId}`, file, { thumb: true })
  const { error } = await getSupabase().from('staff').update({ photo_path: path }).eq('company_id', companyId).eq('id', staffId)
  if (error) throw error
}

export async function clearStaffPhoto(companyId: string, staffId: string) {
  const { error } = await getSupabase().from('staff').update({ photo_path: '' }).eq('company_id', companyId).eq('id', staffId)
  if (error) throw error
}

export async function addUnavailability(companyId: string, staffId: string, period: { startsOn: string; endsOn: string; note: string }) {
  const { error } = await getSupabase()
    .from('staff_unavailability')
    .insert({ company_id: companyId, staff_id: staffId, starts_on: period.startsOn, ends_on: period.endsOn, note: period.note.trim() })
  if (error) throw error
}

export async function deleteUnavailability(id: string) {
  const { data, error } = await getSupabase().from('staff_unavailability').delete().eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}
