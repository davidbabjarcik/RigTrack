import { useQuery } from '@tanstack/react-query'
import { geocode } from '@/features/events/geo'
import { getSupabase } from '@/lib/supabase/client'
import type { PauseKind } from './model'

export type WorkPlace = 'company' | 'home'
export const WORK_PLACE_LABELS: Record<WorkPlace, string> = { company: 'Na firme', home: 'Doma' }

export type WorkSession = {
  id: string
  userId: string
  place: WorkPlace
  startedAt: string
  endedAt: string | null
  verified: boolean
  distanceM: number | null
  pausedAt: string | null
  pauseKind: PauseKind | null
  breakMinutes: number
  waitMinutes: number
  note: string
  editedByName: string
}

export type Home = { address: string; lat: number | null; lon: number | null }

export const workKeys = {
  home: (companyId: string) => ['company', companyId, 'my-home'] as const,
  sessions: (companyId: string) => ['company', companyId, 'work-sessions'] as const,
}

type Row = {
  id: string
  user_id: string
  place: WorkPlace
  started_at: string
  ended_at: string | null
  verified: boolean
  distance_m: number | null
  paused_at: string | null
  pause_kind: PauseKind | null
  break_minutes: number
  wait_minutes: number
  note: string
  edited_by_name: string
}
const COLUMNS = 'id, user_id, place, started_at, ended_at, verified, distance_m, paused_at, pause_kind, break_minutes, wait_minutes, note, edited_by_name'
const toSession = (row: Row): WorkSession => ({
  id: row.id,
  userId: row.user_id,
  place: row.place,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  verified: row.verified,
  distanceM: row.distance_m,
  pausedAt: row.paused_at,
  pauseKind: row.pause_kind,
  breakMinutes: row.break_minutes,
  waitMinutes: row.wait_minutes,
  note: row.note,
  editedByName: row.edited_by_name,
})

/** Moja adresa domov (vidím ju len ja a kto spravuje tím). */
export async function fetchHome(companyId: string, userId: string): Promise<Home | null> {
  const { data, error } = await getSupabase().from('member_homes').select('address, lat, lon').eq('company_id', companyId).eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data as Home | null
}

export function useHome(companyId: string, userId: string | undefined) {
  return useQuery({ queryKey: workKeys.home(companyId), queryFn: () => fetchHome(companyId, userId!), enabled: Boolean(userId), retry: false })
}

/** Uloží adresu domov a raz ju prevedie na súradnice; vráti false, keď sa adresa na mape nenašla. */
export async function saveHome(companyId: string, userId: string, address: string) {
  const trimmed = address.trim()
  const point = trimmed ? await geocode(trimmed).catch(() => null) : null
  const table = getSupabase().from('member_homes')
  const cleared = await table.delete().eq('company_id', companyId).eq('user_id', userId)
  if (cleared.error) throw cleared.error
  if (trimmed) {
    const { error } = await table.insert({ company_id: companyId, user_id: userId, address: trimmed, lat: point?.lat ?? null, lon: point?.lon ?? null })
    if (error) throw error
  }
  return !trimmed || point !== null
}

/** Pracovné časy mimo eventov od daného dňa: moje, pri správcovi tímu všetkých (rozhoduje databáza). */
export async function fetchSessions(companyId: string, fromIso: string) {
  const { data, error } = await getSupabase().from('work_sessions').select(COLUMNS).eq('company_id', companyId).gte('started_at', fromIso).order('started_at', { ascending: false })
  if (error) throw error
  return (data as Row[]).map(toSession)
}

/** Moja rozbehnutá práca mimo eventu (najviac jedna). */
export async function fetchOpenSession(companyId: string, userId: string) {
  const { data, error } = await getSupabase().from('work_sessions').select(COLUMNS).eq('company_id', companyId).eq('user_id', userId).is('ended_at', null).maybeSingle()
  if (error) throw error
  return data ? toSession(data as Row) : null
}

export async function startSession(companyId: string, place: WorkPlace, verified: boolean, distance: number | null) {
  const { error } = await getSupabase().from('work_sessions').insert({ company_id: companyId, place, verified, distance_m: distance })
  if (error) throw error
}

export async function pauseSession(id: string, kind: PauseKind | null) {
  const { error } = await getSupabase()
    .from('work_sessions')
    .update(kind ? { paused_at: new Date().toISOString(), pause_kind: kind } : { paused_at: null })
    .eq('id', id)
  if (error) throw error
}

export async function finishSession(id: string) {
  const { error } = await getSupabase().from('work_sessions').update({ ended_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function correctSession(id: string, fields: { startedAt: string; endedAt: string | null; breakMinutes: number; waitMinutes: number }) {
  const { error } = await getSupabase()
    .from('work_sessions')
    .update({ started_at: fields.startedAt, ended_at: fields.endedAt, break_minutes: fields.breakMinutes, wait_minutes: fields.waitMinutes })
    .eq('id', id)
  if (error) throw error
}

export async function deleteSession(id: string) {
  const { error } = await getSupabase().from('work_sessions').delete().eq('id', id)
  if (error) throw error
}
