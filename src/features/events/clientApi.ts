import { getSupabase } from '@/lib/supabase/client'

/** Stránka pre klienta k akcii (k/:token): údaje akcie a odkazy na už zdieľané ponuky, zmluvy a hodnotenie. */
export type ClientPortal = {
  event: string
  startsOn: string
  endsOn: string
  venue: string
  status: string
  companyName: string
  logoPath?: string
  logoStyle?: string
  offers: { title: string; number: string; status: string; token: string }[]
  contracts: { number: string; signed: boolean; token: string }[]
  rating: { token: string; rated: boolean } | null
}

export const clientLink = (token: string) => `${window.location.origin}${import.meta.env.BASE_URL}k/${token}`
export const clientKeys = { event: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'client-token'] as const }

/** Token odkazu pre klienta pri evente (bez migrácie 0193 null). */
export async function fetchClientToken(companyId: string, eventId: string): Promise<string | null> {
  const { data, error } = await getSupabase().from('events').select('client_token').eq('company_id', companyId).eq('id', eventId).maybeSingle()
  if (error) return null
  return (data as { client_token?: string | null } | null)?.client_token ?? null
}

export async function shareEventClient(eventId: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('share_event_client', { _event_id: eventId })
  if (error) throw error
  return data as string
}

export async function unshareEventClient(eventId: string) {
  const { error } = await getSupabase().rpc('unshare_event_client', { _event_id: eventId })
  if (error) throw error
}

export async function fetchClientPortal(token: string): Promise<ClientPortal | null> {
  const { data, error } = await getSupabase().rpc('get_event_client', { _token: token })
  if (error) throw error
  return (data as ClientPortal | null) ?? null
}
