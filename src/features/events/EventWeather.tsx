import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CloudSun, Droplets, Wind } from 'lucide-react'
import { formatDate, todayIso } from '@/lib/format'
import type { CompanyEvent } from './model'
import { fetchForecast, findPlace, forecastWindow, weatherLabel, weatherWarnings } from './weather'

/** Predpoveď počasia pre event vonku (Open-Meteo). Hľadá miesto pre počasie, inak miesto konania. */
export function EventWeather({ event }: { event: CompanyEvent }) {
  const placeName = (event.weatherPlace || event.venue).trim()
  const range = forecastWindow(event.startsOn, event.endsOn, todayIso())
  const place = useQuery({
    queryKey: ['weather', 'place', placeName],
    queryFn: () => findPlace(placeName),
    enabled: placeName !== '' && range.state === 'ok',
    staleTime: Infinity,
    retry: 1,
  })
  const forecast = useQuery({
    queryKey: ['weather', 'forecast', place.data?.latitude, place.data?.longitude, range.state === 'ok' ? range.from : '', range.state === 'ok' ? range.to : ''],
    queryFn: () => fetchForecast(place.data!, (range as { from: string }).from, (range as { to: string }).to),
    enabled: Boolean(place.data) && range.state === 'ok',
    staleTime: 60 * 60 * 1000,
    retry: 1,
  })

  if (range.state === 'past') return null
  let body
  if (!placeName) body = <p className="text-sm text-muted-foreground">Zadajte miesto konania alebo miesto pre počasie.</p>
  else if (range.state === 'early') body = <p className="text-sm text-muted-foreground">Predpoveď bude dostupná o {range.days} {range.days === 1 ? 'deň' : range.days < 5 ? 'dni' : 'dní'} (16 dní pred akciou).</p>
  else if (place.isPending) body = <p className="text-sm text-muted-foreground">Načítavam predpoveď…</p>
  else if (place.isError) body = <p className="text-sm text-destructive">Počasie sa nepodarilo načítať.</p>
  else if (!place.data) body = <p className="text-sm text-muted-foreground">Miesto „{placeName}“ som nenašiel. Upravte v evente „Miesto pre počasie“ (napr. len mesto).</p>
  else if (forecast.isPending) body = <p className="text-sm text-muted-foreground">Načítavam predpoveď…</p>
  else if (forecast.isError) body = <p className="text-sm text-destructive">Počasie sa nepodarilo načítať.</p>
  else {
    const days = forecast.data ?? []
    const warnings = weatherWarnings(days)
    body = (
      <>
        <p className="mb-2 text-xs text-muted-foreground">
          {[place.data.name, place.data.region, place.data.country].filter(Boolean).join(', ')} · Open-Meteo
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {days.map((day) => (
            <li key={day.date} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">
                {formatDate(day.date)} · {weatherLabel(day.code)}
              </p>
              <p className="text-lg font-semibold tabular-nums">
                {Math.round(day.tempMin)}° / {Math.round(day.tempMax)}°
              </p>
              <p className="flex flex-wrap gap-x-3 text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Droplets className="size-3.5" aria-hidden />
                  {day.rainChance} % · {day.rainMm} mm
                </span>
                <span className="inline-flex items-center gap-1">
                  <Wind className="size-3.5" aria-hidden />
                  nárazy {Math.round(day.gustKmh)} km/h
                </span>
              </p>
            </li>
          ))}
        </ul>
        {warnings.map((warning) => (
          <p key={warning} className="mt-2 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {warning}
          </p>
        ))}
      </>
    )
  }

  return (
    <section aria-labelledby="event-weather-heading" className="mb-6 rounded-xl border bg-surface p-4">
      <h2 id="event-weather-heading" className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <CloudSun className="size-4" aria-hidden />
        Počasie
      </h2>
      {body}
    </section>
  )
}
