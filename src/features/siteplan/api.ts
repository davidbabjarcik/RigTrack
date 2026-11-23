import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import type { MapView } from './geo'
import type { SiteMarker, SitePlan, SiteRoute } from './model'

export const siteKeys = { ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'site-plan'] as const }

type Row = { view: MapView; markers: SiteMarker[]; routes: SiteRoute[]; note: string; version: number; updated_at: string }

/** Site plán akcie; null = zatiaľ neuložený. Bez migrácie 0204 chyba. */
export async function fetchSitePlan(companyId: string, eventId: string): Promise<SitePlan | null> {
  const { data, error } = await getSupabase().from('event_site_plans').select('view, markers, routes, note, version, updated_at').eq('company_id', companyId).eq('event_id', eventId).maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as Row
  const num = (value: unknown) => Number(value)
  return {
    view: { lat: num(row.view.lat), lon: num(row.view.lon), zoom: num(row.view.zoom) },
    markers: (row.markers ?? []).map((marker) => ({ ...marker, lat: num(marker.lat), lon: num(marker.lon) })),
    routes: (row.routes ?? []).map((route) => ({ ...route, points: route.points.map(([lat, lon]) => [num(lat), num(lon)] as [number, number]) })),
    note: row.note,
    version: row.version,
    updatedAt: row.updated_at,
  }
}

export function useSitePlan(companyId: string, eventId: string) {
  return useQuery({ queryKey: siteKeys.ofEvent(companyId, eventId), queryFn: () => fetchSitePlan(companyId, eventId), retry: false })
}

export async function saveSitePlan(eventId: string, expectedVersion: number, plan: Pick<SitePlan, 'view' | 'markers' | 'routes' | 'note'>): Promise<number> {
  const { data, error } = await getSupabase().rpc('save_site_plan', { _event_id: eventId, _expected_version: expectedVersion, _view: plan.view, _markers: plan.markers, _routes: plan.routes, _note: plan.note })
  if (error) throw error
  return data as number
}
