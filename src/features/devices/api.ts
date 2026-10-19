import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import { isMissingColumn } from '@/lib/supabase/errors'
import type { DeviceFormValues, DeviceKind, DeviceNetwork, MemberDevice } from './model'

export const deviceKeys = {
  list: (companyId: string) => ['company', companyId, 'devices'] as const,
}

/** Zariadenia, ktoré smie prihlásený vidieť: svoje, správca (staff.manage) všetky. Rozhoduje databáza. */
// Wi-Fi siete zariadenia (0052); bez migrácie sa zariadenia načítajú bez nich.
let networksColumn = ', networks'

export async function fetchDevices(companyId: string): Promise<MemberDevice[]> {
  const { data, error } = await getSupabase()
    .from('member_devices')
    .select('id, user_id, kind, name, mac, note' + networksColumn)
    .eq('company_id', companyId)
    .order('name')
  if (networksColumn && isMissingColumn(error, 'networks')) {
    networksColumn = ''
    return fetchDevices(companyId)
  }
  if (error) throw error
  return (data as unknown as { id: string; user_id: string; kind: DeviceKind; name: string; mac: string; note: string; networks: DeviceNetwork[] | null }[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    name: row.name,
    mac: row.mac,
    note: row.note,
    networks: Array.isArray(row.networks) ? row.networks : [],
  }))
}

export function useDevices(companyId: string) {
  return useQuery({ queryKey: deviceKeys.list(companyId), queryFn: () => fetchDevices(companyId), retry: false })
}

/** Nové zariadenie patrí prihlásenému, alebo (pre správcu tímu) členovi `userId`. */
export async function saveDevice(companyId: string, id: string | null, values: DeviceFormValues, userId?: string) {
  const table = getSupabase().from('member_devices')
  const { error } = id
    ? await table.update(values).eq('company_id', companyId).eq('id', id)
    : await table.insert({ ...values, company_id: companyId, ...(userId ? { user_id: userId } : {}) })
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
