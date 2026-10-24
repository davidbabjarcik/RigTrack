import { useQuery } from '@tanstack/react-query'
import type { DeviceKind } from '@/features/devices/model'
import { getSupabase } from '@/lib/supabase/client'

// Moje zariadenia vo všetkých firmách naraz: v každej firme je to riadok member_devices, spolu ich drží MAC adresa.

export type MyDevice = { mac: string; kind: DeviceKind; name: string; ethernetMac: string; note: string; companyIds: string[]; rowIds: string[] }

export const myDeviceKeys = { all: (userId: string) => ['my-devices', userId] as const }

type Row = { id: string; company_id: string; kind: DeviceKind; name: string; mac: string; ethernet_mac?: string; note: string }

/** Zoskupí riadky z firiem podľa MAC – jedno zariadenie, zoznam firiem, kde je zapísané. */
export function groupDevices(rows: { id: string; companyId: string; kind: DeviceKind; name: string; mac: string; ethernetMac: string; note: string }[]): MyDevice[] {
  const byMac = new Map<string, MyDevice>()
  for (const row of rows) {
    const current = byMac.get(row.mac)
    if (current) {
      current.companyIds.push(row.companyId)
      current.rowIds.push(row.id)
    } else {
      byMac.set(row.mac, { mac: row.mac, kind: row.kind, name: row.name, ethernetMac: row.ethernetMac, note: row.note, companyIds: [row.companyId], rowIds: [row.id] })
    }
  }
  return [...byMac.values()].sort((a, b) => a.name.localeCompare(b.name, 'sk'))
}

export async function fetchMyDevices(userId: string): Promise<MyDevice[]> {
  const db = getSupabase()
  const query = (columns: string) => db.from('member_devices').select(columns).eq('user_id', userId)
  let { data, error } = await query('id, company_id, kind, name, mac, ethernet_mac, note')
  // Bez migrácie 0059 ethernet MAC nie je.
  if (error && /ethernet_mac/.test(error.message ?? '')) ({ data, error } = await query('id, company_id, kind, name, mac, note'))
  if (error) throw error
  return groupDevices(
    (data as unknown as Row[]).map((row) => ({ id: row.id, companyId: row.company_id, kind: row.kind, name: row.name, mac: row.mac, ethernetMac: row.ethernet_mac ?? '', note: row.note })),
  )
}

export function useMyDevices(userId: string) {
  return useQuery({ queryKey: myDeviceKeys.all(userId), queryFn: () => fetchMyDevices(userId), retry: false })
}

/** Zapíše zariadenie do firiem, kde ešte nie je. Firma, kde rovnakú MAC už má niekto iný, sa preskočí. */
export async function addDeviceToCompanies(companyIds: string[], device: { kind: DeviceKind; name: string; mac: string; ethernetMac: string; note: string }) {
  const failed: string[] = []
  for (const companyId of companyIds) {
    const { error } = await getSupabase()
      .from('member_devices')
      .insert({ company_id: companyId, kind: device.kind, name: device.name, mac: device.mac, ...(device.ethernetMac && { ethernet_mac: device.ethernetMac }), note: device.note })
    if (error) failed.push(companyId)
  }
  return failed
}

/** Zmaže zariadenie vo všetkých firmách. */
export async function removeDevice(rowIds: string[]) {
  const { error } = await getSupabase().from('member_devices').delete().in('id', rowIds)
  if (error) throw error
}
