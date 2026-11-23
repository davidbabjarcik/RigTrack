import type { MapView } from './geo'

export const MARKER_KINDS = ['stage', 'foh', 'power', 'generator', 'truck', 'gate', 'tent', 'toilet', 'bar', 'first_aid', 'tower', 'label'] as const
export type MarkerKind = (typeof MARKER_KINDS)[number]
export const MARKER_LABELS: Record<MarkerKind, string> = {
  stage: 'Pódium',
  foh: 'FOH / réžia',
  power: 'Elektrina (rozvádzač)',
  generator: 'Generátor',
  truck: 'Kamión / vykládka',
  gate: 'Vstup',
  tent: 'Stan',
  toilet: 'WC',
  bar: 'Bar',
  first_aid: 'Zdravotníci',
  tower: 'Delay / veža',
  label: 'Popis',
}
/** Krátka skratka do značky (čitateľné aj čiernobielo). */
export const MARKER_CODES: Record<MarkerKind, string> = { stage: 'P', foh: 'F', power: 'E', generator: 'G', truck: 'K', gate: 'V', tent: 'S', toilet: 'WC', bar: 'B', first_aid: '+', tower: 'D', label: '•' }

export const ROUTE_KINDS = ['power', 'signal', 'network', 'dmx', 'water', 'other'] as const
export type RouteKind = (typeof ROUTE_KINDS)[number]
export const ROUTE_LABELS: Record<RouteKind, string> = { power: 'Elektrina', signal: 'Signál (audio)', network: 'Sieť', dmx: 'DMX', water: 'Voda', other: 'Iné' }
export const ROUTE_DASH: Record<RouteKind, string> = { power: '', signal: '10 5', network: '4 4', dmx: '2 5', water: '14 4 2 4', other: '8 3' }

export type SiteMarker = { id: string; kind: MarkerKind; lat: number; lon: number; label: string }
export type SiteRoute = { id: string; kind: RouteKind; label: string; equipment_id: string | null; slack_pct: number; points: [number, number][] }
export type SitePlan = { view: MapView; markers: SiteMarker[]; routes: SiteRoute[]; note: string; version: number; updatedAt: string | null }

export const DEFAULT_VIEW: MapView = { lat: 48.1486, lon: 17.1077, zoom: 17 }
export const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
