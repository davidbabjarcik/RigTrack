// Kilometre zo skladu na akciu: adresa → súradnice (OpenStreetMap Nominatim) → trasa autom (OSRM).
// Posiela sa len text adresy skladu a akcie, nič iné.

type Point = { lat: number; lon: number }

async function geocode(address: string): Promise<Point | null> {
  const params = new URLSearchParams({ q: address, format: 'json', limit: '1', countrycodes: 'sk,cz,pl,hu,at', 'accept-language': 'sk' })
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
  if (!response.ok) throw new Error('Geocoding failed')
  const results = (await response.json()) as { lat: string; lon: string }[]
  return results[0] ? { lat: Number(results[0].lat), lon: Number(results[0].lon) } : null
}

/** Km autom jedným smerom medzi dvoma adresami; null, keď sa niektorá adresa nenájde. */
export async function drivingKm(from: string, to: string): Promise<{ km: number } | { missing: 'from' | 'to' }> {
  const start = await geocode(from)
  if (!start) return { missing: 'from' }
  const end = await geocode(to)
  if (!end) return { missing: 'to' }
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=false`)
  if (!response.ok) throw new Error('Routing failed')
  const data = (await response.json()) as { routes?: { distance: number }[] }
  const meters = data.routes?.[0]?.distance
  if (meters === undefined) throw new Error('No route')
  return { km: Math.round(meters / 100) / 10 }
}

/** Odkaz na trasu v Google Mapách (na otvorenie v telefóne). */
export function routeUrl(from: string, to: string) {
  return `https://www.google.com/maps/dir/?api=1&${new URLSearchParams({ origin: from, destination: to, travelmode: 'driving' })}`
}
