import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import type { GuestDevice, RouterLogin, WifiFormValues, WifiNetwork, WifiSecurity } from './model'

export const networkKeys = {
  list: (companyId: string) => ['company', companyId, 'wifi'] as const,
  logins: (companyId: string) => ['company', companyId, 'wifi', 'logins'] as const,
  guests: (companyId: string) => ['company', companyId, 'wifi', 'guests'] as const,
}

type Row = {
  id: string
  ssid: string
  password?: string
  scope?: 'equipment' | 'company'
  security: WifiSecurity
  hidden: boolean
  subnet: string
  router_ip: string
  management_ip: string
  router_model: string
  dhcp: boolean
  dhcp_start: string
  dhcp_end: string
  equipment_id: string | null
  place: string
  note: string
}

// Od 0103 sa heslo číta zvlášť (wifi_passwords – len s oprávnením) a pribudol druh siete (scope).
let securePasswords = true
const BASE_COLUMNS = 'id, ssid, security, hidden, subnet, router_ip, management_ip, router_model, dhcp, dhcp_start, dhcp_end, equipment_id, place, note'

export async function fetchNetworks(companyId: string): Promise<WifiNetwork[]> {
  const db = getSupabase()
  let passwords = new Map<string, string>()
  let rows: Row[]
  if (securePasswords) {
    const [networks, secrets] = await Promise.all([
      db.from('wifi_networks').select(BASE_COLUMNS + ', scope').eq('company_id', companyId).order('ssid'),
      db.rpc('wifi_passwords', { _company_id: companyId }),
    ])
    if (networks.error && /scope/.test(networks.error.message ?? '')) {
      securePasswords = false
      return fetchNetworks(companyId)
    }
    if (networks.error) throw networks.error
    rows = networks.data as unknown as Row[]
    passwords = new Map(((secrets.data ?? []) as { id: string; password: string }[]).map((item) => [item.id, item.password]))
  } else {
    const { data, error } = await db.from('wifi_networks').select(BASE_COLUMNS + ', password').eq('company_id', companyId).order('ssid')
    if (error) throw error
    rows = data as unknown as Row[]
  }
  return rows.map((row) => ({
    id: row.id,
    ssid: row.ssid,
    // Bez oprávnenia „Vidieť heslá Wi-Fi“ databáza heslo nevráti.
    password: securePasswords ? (passwords.get(row.id) ?? '') : (row.password ?? ''),
    passwordHidden: securePasswords && !passwords.has(row.id),
    scope: row.scope ?? (row.equipment_id ? 'equipment' : 'company'),
    security: row.security,
    hidden: row.hidden,
    subnet: row.subnet,
    routerIp: row.router_ip,
    managementIp: row.management_ip,
    routerModel: row.router_model,
    dhcp: row.dhcp,
    dhcpStart: row.dhcp_start,
    dhcpEnd: row.dhcp_end,
    equipmentId: row.equipment_id,
    place: row.place,
    note: row.note,
  }))
}

/** Wi-Fi siete firmy. Bez migrácie 0055 vráti chybu; ostatné stránky to prežijú. */
export function useNetworks(companyId: string) {
  return useQuery({ queryKey: networkKeys.list(companyId), queryFn: () => fetchNetworks(companyId), retry: false })
}

/** Prihlásenia do správy routerov – databáza ich vráti len tomu, kto smie upravovať techniku. */
export async function fetchRouterLogins(companyId: string): Promise<RouterLogin[]> {
  const { data, error } = await getSupabase().from('wifi_router_logins').select('network_id, username, password').eq('company_id', companyId)
  if (error) throw error
  return (data as { network_id: string; username: string; password: string }[]).map((row) => ({ networkId: row.network_id, username: row.username, password: row.password }))
}

export async function saveNetwork(companyId: string, id: string | null, values: WifiFormValues) {
  const db = getSupabase()
  const fields = {
    ssid: values.ssid,
    // Heslo, ktoré používateľ nevidí, sa pri prázdnom políčku nemení.
    ...(values.keepPassword && values.password === '' && values.security !== 'nopass' ? {} : { password: values.security === 'nopass' ? '' : values.password }),
    ...(securePasswords ? { scope: values.scope ?? (values.equipmentId ? 'equipment' : 'company') } : {}),
    security: values.security,
    hidden: values.hidden,
    subnet: values.subnet,
    router_ip: values.routerIp,
    management_ip: values.managementIp,
    router_model: values.routerModel,
    dhcp: values.dhcp,
    dhcp_start: values.dhcp ? values.dhcpStart : '',
    dhcp_end: values.dhcp ? values.dhcpEnd : '',
    equipment_id: values.scope === 'company' ? null : values.equipmentId || null,
    place: values.place,
    note: values.note,
  }
  const { data, error } = id
    ? await db.from('wifi_networks').update(fields).eq('company_id', companyId).eq('id', id).select('id').single()
    : await db.from('wifi_networks').insert({ ...fields, company_id: companyId }).select('id').single()
  if (error) throw error
  const networkId = (data as { id: string }).id
  // Prihlásenie do správy routera: bez údajov sa zmaže, inak uloží.
  if (values.loginUser || values.loginPassword) {
    const login = { network_id: networkId, company_id: companyId, username: values.loginUser, password: values.loginPassword }
    const updated = await db.from('wifi_router_logins').update({ username: login.username, password: login.password }).eq('network_id', networkId).select('network_id')
    if (updated.error) throw updated.error
    if (updated.data.length === 0) {
      const inserted = await db.from('wifi_router_logins').insert(login)
      if (inserted.error) throw inserted.error
    }
  } else if (id) {
    const removed = await db.from('wifi_router_logins').delete().eq('network_id', networkId)
    if (removed.error) throw removed.error
  }
  return networkId
}

export async function deleteNetwork(companyId: string, id: string) {
  const { data, error } = await getSupabase().from('wifi_networks').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}

type GuestRow = { id: string; person_name: string; contact: string; device_name: string; mac: string; ip: string; network_id: string | null; note: string; valid_until: string | null }

/** Zariadenia hostí (0086); bez migrácie prázdny zoznam. */
export async function fetchGuestDevices(companyId: string): Promise<GuestDevice[]> {
  const { data, error } = await getSupabase()
    .from('guest_devices')
    .select('id, person_name, contact, device_name, mac, ip, network_id, note, valid_until')
    .eq('company_id', companyId)
    .order('person_name')
  if (error) throw error
  return (data as GuestRow[]).map((row) => ({
    id: row.id,
    personName: row.person_name,
    contact: row.contact,
    deviceName: row.device_name,
    mac: row.mac,
    ip: row.ip,
    networkId: row.network_id,
    note: row.note,
    validUntil: row.valid_until,
  }))
}

export async function saveGuestDevice(companyId: string, id: string | null, guest: Omit<GuestDevice, 'id'>) {
  const row = {
    person_name: guest.personName.trim(),
    contact: guest.contact.trim(),
    device_name: guest.deviceName.trim(),
    mac: guest.mac,
    ip: guest.ip.trim(),
    network_id: guest.networkId,
    note: guest.note.trim(),
    valid_until: guest.validUntil || null,
  }
  const db = getSupabase().from('guest_devices')
  const { error } = id ? await db.update(row).eq('company_id', companyId).eq('id', id) : await db.insert({ ...row, company_id: companyId })
  if (error) throw error
}

export async function deleteGuestDevice(companyId: string, id: string) {
  const { error } = await getSupabase().from('guest_devices').delete().eq('company_id', companyId).eq('id', id)
  if (error) throw error
}
