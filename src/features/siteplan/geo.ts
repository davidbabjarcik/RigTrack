// Site plán: Web Mercator (dlaždice OpenStreetMap 256 px), vzdialenosti na zemi a dĺžky káblov.

export const TILE = 256
export const TILE_URL = (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors'

export type LatLon = { lat: number; lon: number }
export type MapView = LatLon & { zoom: number }

/** Bod na mape → pixely celého sveta pri danom priblížení. */
export function project(point: LatLon, zoom: number) {
  const scale = TILE * 2 ** zoom
  const sin = Math.sin((Math.max(-85.0511, Math.min(85.0511, point.lat)) * Math.PI) / 180)
  return { x: ((point.lon + 180) / 360) * scale, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale }
}

export function unproject(pixel: { x: number; y: number }, zoom: number): LatLon {
  const scale = TILE * 2 ** zoom
  const lon = (pixel.x / scale) * 360 - 180
  const n = Math.PI - (2 * Math.PI * pixel.y) / scale
  return { lat: (180 / Math.PI) * Math.atan(Math.sinh(n)), lon }
}

/** Metre na pixel v strede výrezu. */
export const metersPerPixel = (lat: number, zoom: number) => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom

/** Vzdialenosť dvoch bodov na zemi v metroch (haversine). */
export function distance(a: LatLon, b: LatLon) {
  const R = 6371008.8
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Dĺžka trasy (súčet úsekov) a s rezervou v percentách, zaokrúhlené nahor na metre. */
export function routeLength(points: [number, number][], slackPct: number) {
  let meters = 0
  for (let index = 1; index < points.length; index++) meters += distance({ lat: points[index - 1][0], lon: points[index - 1][1] }, { lat: points[index][0], lon: points[index][1] })
  return { measured: Math.round(meters), withSlack: Math.ceil(meters * (1 + slackPct / 100)) }
}

/** Koľko kusov kábla danej dĺžky treba na trasu (spájajú sa za sebou). */
export const cablePieces = (meters: number, pieceM: number | undefined) => (pieceM && pieceM > 0 ? Math.max(1, Math.ceil(meters / pieceM)) : null)

/** Pekná dĺžka mierky (1, 2, 5, 10, 20, 50… m) do maximálnej šírky v pixeloch. */
export function scaleBar(lat: number, zoom: number, maxPx: number) {
  const perPx = metersPerPixel(lat, zoom)
  const max = perPx * maxPx
  const nice = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000].filter((value) => value <= max).at(-1) ?? 1
  return { meters: nice, px: nice / perPx }
}
