import { useQuery } from '@tanstack/react-query'
import { geocode } from '@/features/events/geo'
import { getSupabase } from '@/lib/supabase/client'
import type { Attendance, Meeting, PauseKind, PlaceKind } from './model'

export const attendanceKeys = {
  meetings: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'meetings'] as const,
  ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'attendance'] as const,
  mine: (companyId: string) => ['company', companyId, 'attendance', 'mine'] as const,
}

type MeetingRow = { id: string; event_id: string; meet_at: string; place_kind: PlaceKind; address: string; lat: number | null; lon: number | null; radius_m: number; note: string }
const MEETING_COLUMNS = 'id, event_id, meet_at, place_kind, address, lat, lon, radius_m, note'
const toMeeting = (row: MeetingRow): Meeting => ({
  id: row.id,
  eventId: row.event_id,
  meetAt: row.meet_at,
  placeKind: row.place_kind,
  address: row.address,
  lat: row.lat,
  lon: row.lon,
  radiusM: row.radius_m,
  note: row.note,
})

type AttendanceRow = {
  id: string
  event_id: string
  meeting_id: string | null
  user_id: string
  started_at: string
  ended_at: string | null
  verified: boolean
  distance_m: number | null
  paused_at: string | null
  pause_kind: PauseKind | null
  break_minutes: number
  wait_minutes: number
  edited_by_name: string
}
const ATTENDANCE_COLUMNS = 'id, event_id, meeting_id, user_id, started_at, ended_at, verified, distance_m, paused_at, pause_kind, break_minutes, wait_minutes, edited_by_name'
const toAttendance = (row: AttendanceRow): Attendance => ({
  id: row.id,
  eventId: row.event_id,
  meetingId: row.meeting_id,
  userId: row.user_id,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  verified: row.verified,
  distanceM: row.distance_m,
  pausedAt: row.paused_at,
  pauseKind: row.pause_kind,
  breakMinutes: row.break_minutes,
  waitMinutes: row.wait_minutes,
  editedByName: row.edited_by_name,
})

export async function fetchMeetings(companyId: string, eventId: string) {
  const { data, error } = await getSupabase().from('event_meetings').select(MEETING_COLUMNS).eq('company_id', companyId).eq('event_id', eventId).order('meet_at')
  if (error) throw error
  return (data as MeetingRow[]).map(toMeeting)
}

export function useMeetings(companyId: string, eventId: string) {
  return useQuery({ queryKey: attendanceKeys.meetings(companyId, eventId), queryFn: () => fetchMeetings(companyId, eventId), retry: false })
}

export type MeetingFields = { meetAt: string; placeKind: PlaceKind; address: string; radiusM: number; note: string }

/** Uloží stretávku; adresu raz prevedie na súradnice. Vráti false, keď sa adresa na mape nenašla. */
export async function saveMeeting(companyId: string, eventId: string, fields: MeetingFields) {
  const point = fields.address.trim() ? await geocode(fields.address.trim()).catch(() => null) : null
  const { error } = await getSupabase()
    .from('event_meetings')
    .insert({
      company_id: companyId,
      event_id: eventId,
      meet_at: fields.meetAt,
      place_kind: fields.placeKind,
      address: fields.address.trim(),
      lat: point?.lat ?? null,
      lon: point?.lon ?? null,
      radius_m: fields.radiusM,
      note: fields.note.trim(),
    })
  if (error) throw error
  return point !== null
}

export async function deleteMeeting(id: string) {
  const { error } = await getSupabase().from('event_meetings').delete().eq('id', id)
  if (error) throw error
}

export async function fetchAttendance(companyId: string, eventId: string) {
  const { data, error } = await getSupabase().from('event_attendance').select(ATTENDANCE_COLUMNS).eq('company_id', companyId).eq('event_id', eventId).order('started_at')
  if (error) throw error
  return (data as AttendanceRow[]).map(toAttendance)
}

export function useEventAttendance(companyId: string, eventId: string) {
  return useQuery({ queryKey: attendanceKeys.ofEvent(companyId, eventId), queryFn: () => fetchAttendance(companyId, eventId), retry: false, refetchInterval: 60_000 })
}

/** Moje stretávky okolo dneška a moja rozbehnutá dochádzka (pre Prehľad). */
export async function fetchMine(companyId: string, userId: string) {
  const from = new Date(Date.now() - 24 * 3_600_000).toISOString()
  const to = new Date(Date.now() + 24 * 3_600_000).toISOString()
  const [meetings, open] = await Promise.all([
    getSupabase().from('event_meetings').select(MEETING_COLUMNS).eq('company_id', companyId).gte('meet_at', from).lte('meet_at', to).order('meet_at'),
    getSupabase().from('event_attendance').select(ATTENDANCE_COLUMNS).eq('company_id', companyId).eq('user_id', userId).is('ended_at', null),
  ])
  if (meetings.error) throw meetings.error
  if (open.error) throw open.error
  return { meetings: (meetings.data as MeetingRow[]).map(toMeeting), open: (open.data as AttendanceRow[]).map(toAttendance) }
}

export function useMyAttendance(companyId: string, userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: attendanceKeys.mine(companyId),
    queryFn: () => fetchMine(companyId, userId!),
    enabled: enabled && Boolean(userId),
    retry: false,
    refetchInterval: 60_000,
  })
}

/** „Som tu“: čas príchodu dá server. */
export async function checkIn(companyId: string, eventId: string, meetingId: string | null, verified: boolean, distance: number | null) {
  const { error } = await getSupabase()
    .from('event_attendance')
    .insert({ company_id: companyId, event_id: eventId, meeting_id: meetingId, verified, distance_m: distance })
  if (error) throw error
}

/** Prestávka / čakanie (začiatok a koniec určí server) a koniec dochádzky. */
export async function setPause(id: string, kind: PauseKind | null) {
  const { error } = await getSupabase()
    .from('event_attendance')
    .update(kind ? { paused_at: new Date().toISOString(), pause_kind: kind } : { paused_at: null })
    .eq('id', id)
  if (error) throw error
}

export async function finish(id: string) {
  const { error } = await getSupabase().from('event_attendance').update({ ended_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Oprava vedúcim: príchod, odchod a odpočítané minúty (výkaz času sa opraví s nimi). */
export async function correctAttendance(id: string, fields: { startedAt: string; endedAt: string | null; breakMinutes: number; waitMinutes: number }) {
  const { error } = await getSupabase()
    .from('event_attendance')
    .update({ started_at: fields.startedAt, ended_at: fields.endedAt, break_minutes: fields.breakMinutes, wait_minutes: fields.waitMinutes })
    .eq('id', id)
  if (error) throw error
}

export async function deleteAttendance(id: string) {
  const { error } = await getSupabase().from('event_attendance').delete().eq('id', id)
  if (error) throw error
}

/** Aktuálna poloha mobilu (jednorazovo, nikam sa neposiela). */
export function currentPosition(): Promise<{ lat: number; lon: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('unsupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude, accuracy: Math.round(position.coords.accuracy) }),
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    )
  })
}
