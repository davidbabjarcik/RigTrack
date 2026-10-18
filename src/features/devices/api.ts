import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import type { DeviceFormValues, DeviceKind, MemberDevice } from './model'

export const deviceKeys = {
  list: (companyId: string) => ['company', companyId, 'devices'] as const,
}

/** Zariadenia, ktoré smie prihlásený vidieť: svoje, správca (staff.manage) všetky. Rozhoduje databáza. */
export async function fetchDevices(companyId: string): Promise<MemberDevice[]> {
  const { data, error } = await getSupabase().from('member_devices').select('id, user_id, kind, name, mac, note').eq('company_id', companyId).order('name')
  if (error) throw error
  return (data as { id: string; user_id: string; kind: DeviceKind; name: string; mac: string; note: string }[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    name: row.name,
    mac: row.mac,
    note: row.note,
  }))
}

export function useDevices(companyId: string) {
  return useQuery({ queryKey: deviceKeys.list(companyId), queryFn: () => fetchDevices(companyId), retry: false })
}

export async function saveDevice(companyId: string, id: string | null, values: DeviceFormValues) {
  const table = getSupabase().from('member_devices')
  const { error } = id ? await table.update(values).eq('company_id', companyId).eq('id', id) : await table.insert({ ...values, company_id: companyId })
  if (error) throw error
}

export async function deleteDevice(companyId: string, id: string) {
  const { data, error } = await getSupabase().from('member_devices').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}

/** Chyba pri ukladaní: rovnaká MAC už vo firme je. */
export function isDuplicateMac(error: unknown) {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505'
}
