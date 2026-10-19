import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import type { RouterLogin, WifiFormValues, WifiNetwork, WifiSecurity } from './model'

export const networkKeys = {
  list: (companyId: string) => ['company', companyId, 'wifi'] as const,
  logins: (companyId: string) => ['company', companyId, 'wifi', 'logins'] as const,
}

type Row = {
  id: string
  ssid: string
  password: string
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

export async function fetchNetworks(companyId: string): Promise<WifiNetwork[]> {
  const { data, error } = await getSupabase()
    .from('wifi_networks')
    .select('id, ssid, password, security, hidden, subnet, router_ip, management_ip, router_model, dhcp, dhcp_start, dhcp_end, equipment_id, place, note')
    .eq('company_id', companyId)
    .order('ssid')
  if (error) throw error
  return (data as Row[]).map((row) => ({
    id: row.id,
    ssid: row.ssid,
    password: row.password,
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
    password: values.security === 'nopass' ? '' : values.password,
    security: values.security,
    hidden: values.hidden,
    subnet: values.subnet,
    router_ip: values.routerIp,
    management_ip: values.managementIp,
    router_model: values.routerModel,
    dhcp: values.dhcp,
    dhcp_start: values.dhcp ? values.dhcpStart : '',
    dhcp_end: values.dhcp ? values.dhcpEnd : '',
    equipment_id: values.equipmentId || null,
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
