import { getSupabase } from '@/lib/supabase/client'

/** Tajný odkaz na potvrdenie termínu pre človeka z posádky (rovnaký pri opakovanom vytvorení). */
export async function shareCrewInvite(crewId: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('share_crew_invite', { _id: crewId })
  if (error) throw error
  return data as string
}

export const crewInviteLink = (token: string) => `${window.location.origin}${import.meta.env.BASE_URL}u/${token}`

export type CrewInvite = {
  name: string
  role: string
  response: 'pending' | 'yes' | 'no'
  responseNote: string
  event: string
  startsOn: string
  endsOn: string
  venue: string
  status: string
  getInTime: string | null
  showTime: string | null
  showEndTime: string | null
  companyName: string
}

/** Pozvánka cez odkaz (bez prihlásenia); null = odkaz neplatí. */
export async function fetchCrewInvite(token: string): Promise<CrewInvite | null> {
  const { data, error } = await getSupabase().rpc('get_crew_invite', { _token: token })
  if (error) throw error
  return (data as CrewInvite | null) ?? null
}

export async function respondCrewInvite(token: string, response: 'yes' | 'no', note: string) {
  const { error } = await getSupabase().rpc('respond_crew_invite', { _token: token, _response: response, _note: note.trim() })
  if (error) throw error
}
