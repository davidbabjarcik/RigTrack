import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Car, ExternalLink, Route } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useCompanyProfile } from '@/features/companies/profile'
import { formatNumber } from '@/features/equipment/model'
import { drivingKm, routeUrl } from './geo'
import type { CompanyEvent } from './model'
import { dayKm, eventDates, STAY_LABELS, STAYS, totalKm, type Stay, type TravelDay } from './plan'
import { deleteTravel, fetchPlace, fetchTravel, planKeys, savePlace, saveTravel } from './planApi'

const weekday = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('sk-SK', { weekday: 'short', day: 'numeric', month: 'numeric' })

function TravelRow({ companyId, eventId, date, day, distanceKm, canEdit }: { companyId: string; eventId: string; date: string; day: TravelDay | undefined; distanceKm: number | null; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Omit<TravelDay, 'id'> | null>(null)
  const current = draft ?? { date, vehicles: day?.vehicles ?? 1, roundTrips: day?.roundTrips ?? 1, stay: day?.stay ?? 'home', stayPlace: day?.stayPlace ?? '', extraKm: day?.extraKm ?? 0, note: day?.note ?? '' }
  const refresh = () => queryClient.invalidateQueries({ queryKey: planKeys.travel(companyId, eventId) })
  const save = useMutation({ mutationFn: () => saveTravel(companyId, eventId, { ...current, id: day?.id }), onSuccess: async () => (await refresh(), setDraft(null)) })
  const remove = useMutation({ mutationFn: () => deleteTravel(day!.id), onSettled: refresh })
  const number = (value: string, max: number) => Math.min(max, Math.max(0, Math.round(Number(value) || 0)))

  if (!canEdit) {
    if (!day) return null
    return (
      <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
        <span className="w-24 font-medium capitalize">{weekday(date)}</span>
        <span>
          {day.vehicles} {day.vehicles === 1 ? 'auto' : day.vehicles < 5 ? 'autá' : 'áut'} × {day.roundTrips} {day.roundTrips === 1 ? 'otočka' : 'otočky'}
        </span>
        <span>{STAY_LABELS[day.stay]}{day.stayPlace && ` (${day.stayPlace})`}</span>
        <span className="ml-auto font-medium tabular-nums">{formatNumber(dayKm(distanceKm, day))} km</span>
      </li>
    )
  }
  return (
    <li className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
      <span className="w-24 shrink-0 font-medium capitalize">{weekday(date)}</span>
      <label className="flex items-center gap-1">
        <Car className="size-4 text-muted-foreground" aria-hidden />
        <input aria-label="Počet áut" type="number" min={0} max={50} className="h-9 w-14 rounded-lg border bg-surface px-2" value={current.vehicles} onChange={(event) => setDraft({ ...current, vehicles: number(event.target.value, 50) })} />
        áut
      </label>
      <label className="flex items-center gap-1">
        ×
        <input aria-label="Otočky" type="number" min={0} max={20} className="h-9 w-14 rounded-lg border bg-surface px-2" value={current.roundTrips} onChange={(event) => setDraft({ ...current, roundTrips: number(event.target.value, 20) })} />
        otočky
      </label>
      <select aria-label="Kde sa spalo" className="h-9 rounded-lg border bg-surface px-2" value={current.stay} onChange={(event) => setDraft({ ...current, stay: event.target.value as Stay })}>
        {STAYS.map((stay) => (
          <option key={stay} value={stay}>
            {STAY_LABELS[stay]}
          </option>
        ))}
      </select>
      {current.stay === 'elsewhere' && (
        <input aria-label="Kde" placeholder="kde (hotel, mesto)" className="h-9 w-40 rounded-lg border bg-surface px-2" maxLength={160} value={current.stayPlace} onChange={(event) => setDraft({ ...current, stayPlace: event.target.value })} />
      )}
      <label className="flex items-center gap-1">
        +
        <input aria-label="Km navyše" type="number" min={0} step="0.1" className="h-9 w-20 rounded-lg border bg-surface px-2" value={current.extraKm} onChange={(event) => setDraft({ ...current, extraKm: Math.max(0, Number(event.target.value) || 0) })} />
        km navyše
      </label>
      <span className="ml-auto font-medium tabular-nums">{formatNumber(dayKm(distanceKm, current))} km</span>
      {(draft || !day) && (
        <Button size="sm" variant={day ? 'default' : 'outline'} disabled={save.isPending} onClick={() => save.mutate()}>
          {day ? 'Uložiť' : 'Zapísať'}
        </Button>
      )}
      {day && !draft && (
        <Button variant="ghost" size="sm" disabled={remove.isPending} onClick={() => remove.mutate()}>
          Zmazať
        </Button>
      )}
    </li>
  )
}

/** Doprava: adresa akcie, km zo skladu (z mapy alebo ručne) a po dňoch koľko áut, otočiek a kde sa spalo. */
export function EventTravelSection({ companyId, event, canEdit }: { companyId: string; event: CompanyEvent; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const profile = useCompanyProfile(companyId)
  const place = useQuery({ queryKey: planKeys.place(companyId, event.id), queryFn: () => fetchPlace(companyId, event.id), retry: false })
  const travel = useQuery({ queryKey: planKeys.travel(companyId, event.id), queryFn: () => fetchTravel(companyId, event.id), retry: false })
  const [address, setAddress] = useState<string | null>(null)
  const [km, setKm] = useState<string | null>(null)
  const [problem, setProblem] = useState('')
  const savePlaceMutation = useMutation({
    mutationFn: ({ nextAddress, nextKm }: { nextAddress: string; nextKm: number | null }) => savePlace(companyId, event.id, nextAddress, nextKm),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: planKeys.place(companyId, event.id) })
      setAddress(null)
      setKm(null)
    },
  })
  const compute = useMutation({
    mutationFn: async () => {
      const result = await drivingKm(profile.data!.warehouseAddress, (address ?? place.data!.address) || event.venue)
      if ('missing' in result) throw new Error(result.missing === 'from' ? 'Adresu skladu som na mape nenašiel.' : 'Adresu akcie som na mape nenašiel – skúste ju napísať presnejšie (ulica, mesto).')
      return result.km
    },
    onSuccess: (value) => {
      setProblem('')
      setKm(String(value))
    },
    onError: (error) => setProblem(error instanceof Error && error.message.includes('nenašiel') ? error.message : 'Trasu sa nepodarilo vypočítať. Km môžete zadať ručne.'),
  })

  if (place.isError || travel.isError) return null
  if (!place.data) return null
  const warehouse = profile.data?.warehouseAddress ?? ''
  const currentAddress = address ?? place.data.address
  const currentKm = km ?? (place.data.distanceKm === null ? '' : String(place.data.distanceKm))
  const distance = place.data.distanceKm
  const total = totalKm(distance, travel.data ?? [])
  const dirty = address !== null || km !== null
  const target = currentAddress || event.venue

  return (
    <CollapsibleSection id="event.travel" title={`Doprava${total > 0 ? ` (${formatNumber(total)} km)` : ''}`}>
      <div className="mb-3 flex flex-col gap-3 rounded-xl border bg-surface p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
          <Field label="Adresa akcie (ulica, mesto)" placeholder={event.venue || 'napr. Hlavná 1, Košice'} disabled={!canEdit} value={currentAddress} onChange={(input) => setAddress(input.target.value)} />
          <Field label="Km zo skladu (1 smer)" inputMode="decimal" disabled={!canEdit} value={currentKm} onChange={(input) => setKm(input.target.value)} />
        </div>
        <p className="text-sm text-muted-foreground">
          Sklad: {warehouse || <Link to="/settings" className="text-accent hover:underline">nastavte adresu skladu v Nastaveniach</Link>}
        </p>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" disabled={!warehouse || !target || compute.isPending} onClick={() => compute.mutate()}>
              <Route className="size-4" aria-hidden />
              {compute.isPending ? 'Počítam…' : 'Vypočítať km z mapy'}
            </Button>
          )}
          {warehouse && target && (
            <a href={routeUrl(warehouse, target)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1 rounded-lg border bg-surface px-3 text-sm font-medium hover:bg-muted">
              Trasa v Google Mapách
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
          {canEdit && dirty && (
            <Button
              size="sm"
              disabled={savePlaceMutation.isPending}
              onClick={() => savePlaceMutation.mutate({ nextAddress: currentAddress, nextKm: currentKm.trim() === '' ? null : Math.max(0, Number(currentKm.replace(',', '.')) || 0) })}
            >
              Uložiť adresu a km
            </Button>
          )}
        </div>
        {problem && <p className="text-sm text-destructive">{problem}</p>}
        <p className="text-xs text-muted-foreground">Km z mapy: OpenStreetMap (adresa → poloha) a OSRM (trasa autom); posiela sa len adresa skladu a akcie.</p>
      </div>
      <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
        {eventDates(event.startsOn, event.endsOn).map((date) => (
          <TravelRow key={date} companyId={companyId} eventId={event.id} date={date} day={travel.data?.find((item) => item.date === date)} distanceKm={distance} canEdit={canEdit} />
        ))}
      </ul>
      <p className="mt-2 text-sm">
        Spolu: <span className="font-semibold tabular-nums">{formatNumber(total)} km</span>
        <span className="text-muted-foreground"> – tam a späť × otočky × autá + km navyše (napr. po meste)</span>
      </p>
    </CollapsibleSection>
  )
}
