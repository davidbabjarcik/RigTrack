import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import { isMissingColumn } from '@/lib/supabase/errors'
import { deviceRow, type DeviceFormValues, type DeviceKind, type DeviceNetwork, type MemberDevice } from './model'

export const deviceKeys = {
  list: (companyId: string) => ['company', companyId, 'devices'] as const,
}

/** Zariadenia, ktoré smie prihlásený vidieť: svoje, správca (staff.manage) všetky. Rozhoduje databáza. */
// Wi-Fi siete zariadenia (0052) a ethernet MAC (0059). Bez migrácií sa zariadenia načítajú bez nich – skúša sa od najnovšej.
const OPTIONAL_COLUMNS = [', networks, ethernet_mac', ', networks', '']
let optional = 0

export async function fetchDevices(companyId: string): Promise<MemberDevice[]> {
  const { data, error } = await getSupabase()
    .from('member_devices')
    .select('id, user_id, kind, name, mac, note' + OPTIONAL_COLUMNS[optional])
    .eq('company_id', companyId)
    .order('name')
  if (optional < OPTIONAL_COLUMNS.length - 1 && (isMissingColumn(error, 'ethernet_mac') || isMissingColumn(error, 'networks'))) {
    optional += 1
    return fetchDevices(companyId)
  }
  if (error) throw error
  return (data as unknown as { id: string; user_id: string; kind: DeviceKind; name: string; mac: string; note: string; networks: DeviceNetwork[] | null; ethernet_mac?: string }[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    name: row.name,
    mac: row.mac,
    ethernetMac: row.ethernet_mac ?? '',
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
  const row = deviceRow(values)
  const { error } = id
    ? await table.update(row).eq('company_id', companyId).eq('id', id)
    : await table.insert({ ...row, company_id: companyId, ...(userId ? { user_id: userId } : {}) })
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

export type DeviceExemption = { userId: string; kind: 'phone' | 'laptop' | 'tablet' }

export const exemptionKeys = { list: (companyId: string) => ['company', companyId, 'device-exemptions'] as const }

/** Výnimky zo zariadení (svoje; správca tímu všetky). */
export async function fetchExemptions(companyId: string): Promise<DeviceExemption[]> {
  const { data, error } = await getSupabase().from('device_exemptions').select('user_id, kind').eq('company_id', companyId)
  if (error) throw error
  return (data as { user_id: string; kind: DeviceExemption['kind'] }[]).map((row) => ({ userId: row.user_id, kind: row.kind }))
}

export async function setExemption(companyId: string, userId: string, kind: DeviceExemption['kind'], exempt: boolean) {
  const table = getSupabase().from('device_exemptions')
  const { error } = exempt
    ? await table.insert({ company_id: companyId, user_id: userId, kind })
    : await table.delete().eq('company_id', companyId).eq('user_id', userId).eq('kind', kind)
  if (error) throw error
}

/** Ktoré povinné zariadenia (mobil, tablet / iPad, notebook) človeku chýbajú a nemá na ne výnimku. */
export function missingDeviceKinds(devices: Pick<MemberDevice, 'userId' | 'kind'>[], exemptions: DeviceExemption[], userId: string) {
  const required: DeviceExemption['kind'][] = ['phone', 'tablet', 'laptop']
  return required.filter(
    (kind) => !devices.some((device) => device.userId === userId && device.kind === kind) && !exemptions.some((item) => item.userId === userId && item.kind === kind),
  )
}
