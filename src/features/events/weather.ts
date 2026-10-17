// Počasie pre eventy vonku: Open-Meteo (open-meteo.com), bezplatné, bez kľúča.
// Posiela sa im len názov miesta (na vyhľadanie súradníc) a súradnice s dátumami.

/** Predpoveď siaha najviac 16 dní dopredu. */
export const FORECAST_DAYS = 16

export type Place = { name: string; region: string; country: string; latitude: number; longitude: number }
export type DayForecast = {
  date: string
  code: number
  tempMax: number
  tempMin: number
  /** Pravdepodobnosť zrážok v %. */
  rainChance: number
  /** Zrážky v mm. */
  rainMm: number
  /** Najsilnejšie nárazy vetra v km/h. */
  gustKmh: number
}

/** Kód počasia WMO → slovenský popis. */
export function weatherLabel(code: number) {
  if (code === 0) return 'jasno'
  if (code <= 2) return 'polojasno'
  if (code === 3) return 'zamračené'
  if (code === 45 || code === 48) return 'hmla'
  if (code >= 51 && code <= 57) return 'mrholenie'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'dážď'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'sneh'
  if (code >= 95) return 'búrka'
  return 'premenlivo'
}

const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * Či sa dá predpoveď pre event ukázať: `ok` s dňami, ktoré predpoveď pokrýva,
 * `early` s počtom dní, kým bude dostupná, alebo `past`, ak event skončil.
 */
export function forecastWindow(startsOn: string, endsOn: string, today: string) {
  if (endsOn < today) return { state: 'past' as const }
  const last = addDays(today, FORECAST_DAYS - 1)
  if (startsOn > last) {
    const days = Math.round((Date.parse(startsOn) - Date.parse(last)) / 86_400_000)
    return { state: 'early' as const, days }
  }
  const from = startsOn < today ? today : startsOn
  const to = endsOn > last ? last : endsOn
  return { state: 'ok' as const, from, to }
}

/** Na čo si dať pozor: búrka, dážď, silný vietor (truss, plachty), mráz. */
export function weatherWarnings(days: DayForecast[]) {
  const warnings: string[] = []
  if (days.some((day) => day.code >= 95)) warnings.push('Hrozí búrka.')
  if (days.some((day) => day.rainChance >= 60 || day.rainMm >= 5)) warnings.push('Pravdepodobne bude pršať – kryty na techniku a stany.')
  const gust = Math.max(0, ...days.map((day) => day.gustKmh))
  if (gust >= 50) warnings.push(`Nárazy vetra do ${Math.round(gust)} km/h – pozor na truss, plachty a bannery.`)
  if (days.some((day) => day.tempMin <= 0)) warnings.push('Mráz – pozor na batérie a displeje.')
  return warnings
}

// ---------------------------------------------------------------------------
// Volania Open-Meteo
// ---------------------------------------------------------------------------

/** Nájde miesto podľa názvu; uprednostní Slovensko a Česko. */
export async function findPlace(name: string): Promise<Place | null> {
  const query = name.trim()
  if (!query) return null
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=sk&format=json`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Geocoding failed')
  const data = (await response.json()) as {
    results?: { name: string; admin1?: string; country?: string; country_code?: string; latitude: number; longitude: number }[]
  }
  const results = data.results ?? []
  const best = results.find((item) => item.country_code === 'SK') ?? results.find((item) => item.country_code === 'CZ') ?? results[0]
  return best ? { name: best.name, region: best.admin1 ?? '', country: best.country ?? '', latitude: best.latitude, longitude: best.longitude } : null
}

export async function fetchForecast(place: Place, from: string, to: string): Promise<DayForecast[]> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_gusts_10m_max',
    timezone: 'Europe/Bratislava',
    start_date: from,
    end_date: to,
  })
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!response.ok) throw new Error('Forecast failed')
  const data = (await response.json()) as {
    daily: {
      time: string[]
      weather_code: number[]
      temperature_2m_max: number[]
      temperature_2m_min: number[]
      precipitation_probability_max: (number | null)[]
      precipitation_sum: (number | null)[]
      wind_gusts_10m_max: (number | null)[]
    }
  }
  const daily = data.daily
  return daily.time.map((date, index) => ({
    date,
    code: daily.weather_code[index],
    tempMax: daily.temperature_2m_max[index],
    tempMin: daily.temperature_2m_min[index],
    rainChance: daily.precipitation_probability_max[index] ?? 0,
    rainMm: daily.precipitation_sum[index] ?? 0,
    gustKmh: daily.wind_gusts_10m_max[index] ?? 0,
  }))
}
