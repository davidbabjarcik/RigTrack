import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, Droplets, ExternalLink, Wind } from 'lucide-react'
import { useState } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { formatDate, todayIso } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CompanyEvent } from './model'
import { fetchForecast, fetchHourly, findPlace, forecastLinks, forecastWindow, weatherLabel, weatherWarnings, type Place } from './weather'

/** Hodinová predpoveď na jeden deň. */
function HourlyForecast({ place, date }: { place: Place; date: string }) {
  const hours = useQuery({
    queryKey: ['weather', 'hourly', place.latitude, place.longitude, date],
    queryFn: () => fetchHourly(place, date),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  })
  if (hours.isPending) return <p className="mt-2 text-sm text-muted-foreground">Načítavam hodiny…</p>
  if (hours.isError) return <p className="mt-2 text-sm text-destructive">Hodinovú predpoveď sa nepodarilo načítať.</p>
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full min-w-[28rem] text-sm tabular-nums">
        <thead className="text-xs text-muted-foreground">
          <tr className="text-left">
            <th className="py-1 pr-3 font-normal">Čas</th>
            <th className="py-1 pr-3 font-normal">Počasie</th>
            <th className="py-1 pr-3 text-right font-normal">°C</th>
            <th className="py-1 pr-3 text-right font-normal">Dážď</th>
            <th className="py-1 text-right font-normal">Nárazy</th>
          </tr>
        </thead>
        <tbody>
          {hours.data
            .filter((_, index) => index % 2 === 0)
            .map((hour) => (
              <tr key={hour.time} className={cn('border-t', (hour.rainChance >= 60 || hour.gustKmh >= 50 || hour.code >= 95) && 'text-amber-700 dark:text-amber-300')}>
                <td className="py-1 pr-3">{hour.time}</td>
                <td className="py-1 pr-3">{weatherLabel(hour.code)}</td>
                <td className="py-1 pr-3 text-right">{Math.round(hour.temp)}°</td>
                <td className="py-1 pr-3 text-right">
                  {hour.rainChance} %{hour.rainMm > 0 && ` · ${hour.rainMm.toLocaleString('sk-SK')} mm`}
                </td>
                <td className="py-1 text-right">{Math.round(hour.gustKmh)} km/h</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

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
  const [openDay, setOpenDay] = useState<string | null>(null)
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
            <li key={day.date} className={cn('rounded-lg border text-sm', openDay === day.date && 'sm:col-span-2 lg:col-span-3')}>
              <button
                type="button"
                className="w-full p-3 text-left hover:bg-muted"
                aria-expanded={openDay === day.date}
                onClick={() => setOpenDay(openDay === day.date ? null : day.date)}
              >
                <span className="flex items-center justify-between gap-2 font-medium">
                  <span>
                    {formatDate(day.date)} · {weatherLabel(day.code)}
                  </span>
                  <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', openDay === day.date && 'rotate-180')} aria-hidden />
                </span>
                <span className="block text-lg font-semibold tabular-nums">
                  {Math.round(day.tempMin)}° / {Math.round(day.tempMax)}°
                </span>
                <span className="flex flex-wrap gap-x-3 text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Droplets className="size-3.5" aria-hidden />
                    {day.rainChance} % · {day.rainMm.toLocaleString('sk-SK')} mm
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Wind className="size-3.5" aria-hidden />
                    nárazy {Math.round(day.gustKmh)} km/h
                  </span>
                </span>
              </button>
              {openDay === day.date && (
                <div className="border-t px-3 pb-3">
                  <HourlyForecast place={place.data!} date={day.date} />
                </div>
              )}
            </li>
          ))}
        </ul>
        {warnings.map((warning) => (
          <p key={warning} className="mt-2 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {warning}
          </p>
        ))}
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">Kliknite na deň pre hodinovú predpoveď. Podrobnejšie:</span>
          {forecastLinks(place.data).map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
              {link.label}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ))}
        </p>
      </>
    )
  }

  return (
    <CollapsibleSection id="event.weather" title="Počasie">
      <div className="rounded-xl border bg-surface p-4">{body}</div>
    </CollapsibleSection>
  )
}
