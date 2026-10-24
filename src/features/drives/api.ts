import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import type { Direction, Drive } from './model'

export const driveKeys = {
  ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'drives'] as const,
  all: (companyId: string) => ['company', companyId, 'drives'] as const,
}

type Row = { id: string; event_id: string; drive_date: string; vehicle_id: string | null; member_id: string | null; driver_name: string; direction: Direction; route: string; km: number | string | null }
const COLUMNS = 'id, event_id, drive_date, vehicle_id, member_id, driver_name, direction, route, km'
const toDrive = (row: Row): Drive => ({
  id: row.id,
  eventId: row.event_id,
  date: row.drive_date,
  vehicleId: row.vehicle_id,
  memberId: row.member_id,
  driverName: row.driver_name,
  direction: row.direction,
  route: row.route,
  km: row.km === null ? null : Number(row.km),
})

export async function fetchEventDrives(companyId: string, eventId: string) {
  const { data, error } = await getSupabase().from('event_drives').select(COLUMNS).eq('company_id', companyId).eq('event_id', eventId).order('drive_date').order('created_at')
  if (error) throw error
  return (data as Row[]).map(toDrive)
}

export function useEventDrives(companyId: string, eventId: string) {
  return useQuery({ queryKey: driveKeys.ofEvent(companyId, eventId), queryFn: () => fetchEventDrives(companyId, eventId), retry: false })
}

/** Všetky jazdy firmy (štatistiky, karta zamestnanca). */
export async function fetchAllDrives(companyId: string) {
  const { data, error } = await getSupabase().from('event_drives').select(COLUMNS).eq('company_id', companyId).order('drive_date', { ascending: false }).limit(5000)
  if (error) throw error
  return (data as Row[]).map(toDrive)
}

export function useAllDrives(companyId: string) {
  return useQuery({ queryKey: driveKeys.all(companyId), queryFn: () => fetchAllDrives(companyId), retry: false })
}

export type NewDrive = { date: string; vehicleId: string | null; driver: { memberId: string } | { name: string }; direction: Direction; route: string; km: number | null }

export async function addDrive(companyId: string, eventId: string, drive: NewDrive) {
  const { error } = await getSupabase()
    .from('event_drives')
    .insert({
      company_id: companyId,
      event_id: eventId,
      drive_date: drive.date,
      vehicle_id: drive.vehicleId,
      ...('memberId' in drive.driver ? { member_id: drive.driver.memberId } : { driver_name: drive.driver.name.trim() }),
      direction: drive.direction,
      route: drive.route.trim(),
      km: drive.km,
    })
  if (error) throw error
}

export async function removeDrive(id: string) {
  const { error } = await getSupabase().from('event_drives').delete().eq('id', id)
  if (error) throw error
}
