import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { useCompanyProfile } from '@/features/companies/profile'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { formatNumber } from '@/features/equipment/model'
import type { CompanyEvent } from '@/features/events/model'
import { eventDates } from '@/features/events/plan'
import { fetchPlace, planKeys } from '@/features/events/planApi'
import { useVehicles } from '@/features/vehicles/useVehicles'
import { addDrive, driveKeys, removeDrive, useEventDrives } from './api'
import { DIRECTION_LABELS, DIRECTIONS, suggestedKm, type Direction, type Drive } from './model'

const EXTERNAL = 'external'
const weekday = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('sk-SK', { weekday: 'short', day: 'numeric', month: 'numeric' })

type Props = { companyId: string; event: CompanyEvent; canEdit: boolean }

/** Kto pri evente šoféroval: deň, auto, šofér, smer a kilometre. */
export function EventDrivesSection({ companyId, event, canEdit }: Props) {
  const userId = useAuth().session?.user.id
  const queryClient = useQueryClient()
  const drives = useEventDrives(companyId, event.id)
  const members = useMembers(companyId)
  const vehicles = useVehicles(companyId)
  const profile = useCompanyProfile(companyId)
  const place = useQuery({ queryKey: planKeys.place(companyId, event.id), queryFn: () => fetchPlace(companyId, event.id), retry: false })
  const dates = eventDates(event.startsOn, event.endsOn)
  const crew = event.crew.some((person) => person.memberId === userId && person.response !== 'no')
  const from = profile.data?.warehouseAddress ? 'Sklad' : 'Firma'
  const to = event.venue || place.data?.address || 'akcia'
  const empty = { date: dates[0] ?? event.startsOn, vehicleId: '', who: canEdit ? '' : (userId ?? ''), name: '', direction: 'both' as Direction, km: '' }
  const [form, setForm] = useState<typeof empty | null>(null)
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: driveKeys.ofEvent(companyId, event.id) }), queryClient.invalidateQueries({ queryKey: driveKeys.all(companyId) })])

  const add = useMutation({
    mutationFn: (values: typeof empty) =>
      addDrive(companyId, event.id, {
        date: values.date,
        vehicleId: values.vehicleId || null,
        driver: values.who === EXTERNAL ? { name: values.name } : { memberId: values.who },
        direction: values.direction,
        route: values.direction === 'back' ? `${to} → ${from}` : values.direction === 'there' ? `${from} → ${to}` : `${from} ⇄ ${to}`,
        km: values.km.trim() === '' ? suggestedKm(place.data?.distanceKm ?? null, values.direction) : Math.max(0, Number(values.km.replace(',', '.')) || 0),
      }),
    onSuccess: () => setForm(null),
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: removeDrive, onSettled: refresh })

  if (drives.isError) return null
  const list = drives.data ?? []
  if (!canEdit && !crew && list.length === 0) return null
  const totalKm = list.reduce((sum, drive) => sum + (drive.km ?? 0), 0)
  const driverOf = (drive: Drive) => (drive.memberId ? memberName(members.data, drive.memberId) || 'Bývalý člen' : drive.driverName)
  const plateOf = (id: string | null) => (id ? vehicles.data?.find((vehicle) => vehicle.id === id)?.plate : undefined)
  const current = form ?? empty
  const valid = Boolean(current.date) && (current.who === EXTERNAL ? current.name.trim() !== '' : current.who !== '')
  const km = suggestedKm(place.data?.distanceKm ?? null, current.direction)

  return (
    <CollapsibleSection id="event.drives" title={<>Kto šoféroval ({list.length}{totalKm > 0 ? ` · ${formatNumber(totalKm)} km` : ''})</>}>
      {list.length > 0 && (
        <ul className="mb-3 divide-y overflow-hidden rounded-xl border bg-surface text-sm">
          {list.map((drive) => (
            <li key={drive.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
              <span className="w-24 shrink-0 font-medium capitalize">{weekday(drive.date)}</span>
              <span className="min-w-0 flex-1">
                <span className="font-medium">{driverOf(drive)}</span>
                <span className="text-muted-foreground">
                  {' · '}
                  {[plateOf(drive.vehicleId), DIRECTION_LABELS[drive.direction], drive.route].filter(Boolean).join(' · ')}
                </span>
              </span>
              {drive.km !== null && <span className="tabular-nums">{formatNumber(drive.km)} km</span>}
              {(canEdit || drive.memberId === userId) && (
                <Button variant="ghost" size="sm" aria-label="Zmazať jazdu" disabled={remove.isPending} onClick={() => remove.mutate(drive.id)}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {(canEdit || crew) &&
        (form ? (
          <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-surface p-3 text-sm">
            <select aria-label="Deň" className="h-9 rounded-lg border bg-background px-2" value={current.date} onChange={(e) => setForm({ ...current, date: e.target.value })}>
              {dates.map((date) => (
                <option key={date} value={date}>
                  {weekday(date)}
                </option>
              ))}
            </select>
            {canEdit ? (
              <select aria-label="Šofér" className="h-9 rounded-lg border bg-background px-2" value={current.who} onChange={(e) => setForm({ ...current, who: e.target.value })}>
                <option value="">— šofér —</option>
                {(members.data ?? []).map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.fullName || member.email}
                  </option>
                ))}
                <option value={EXTERNAL}>Externista (napísať meno)</option>
              </select>
            ) : (
              <span className="self-center">Ja</span>
            )}
            {current.who === EXTERNAL && (
              <input aria-label="Meno šoféra" placeholder="meno" maxLength={80} className="h-9 w-36 rounded-lg border bg-background px-2" value={current.name} onChange={(e) => setForm({ ...current, name: e.target.value })} />
            )}
            <select aria-label="Auto" className="h-9 rounded-lg border bg-background px-2" value={current.vehicleId} onChange={(e) => setForm({ ...current, vehicleId: e.target.value })}>
              <option value="">— auto —</option>
              {(vehicles.data ?? [])
                .filter((vehicle) => vehicle.status !== 'retired')
                .map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate}
                    {vehicle.model && ` (${vehicle.model})`}
                  </option>
                ))}
            </select>
            <select aria-label="Smer" className="h-9 rounded-lg border bg-background px-2" value={current.direction} onChange={(e) => setForm({ ...current, direction: e.target.value as Direction })}>
              {DIRECTIONS.map((direction) => (
                <option key={direction} value={direction}>
                  {DIRECTION_LABELS[direction]}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1">
              <input
                aria-label="Kilometre"
                inputMode="decimal"
                placeholder={km !== null ? String(km) : 'km'}
                className="h-9 w-20 rounded-lg border bg-background px-2"
                value={current.km}
                onChange={(e) => setForm({ ...current, km: e.target.value })}
              />
              km
            </label>
            <Button size="sm" disabled={!valid || add.isPending} onClick={() => add.mutate(current)}>
              Zapísať
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setForm(null)}>
              Zrušiť
            </Button>
            {km !== null && <p className="basis-full text-xs text-muted-foreground">Prázdne km = podľa vzdialenosti zo skladu ({formatNumber(km)} km).</p>}
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setForm(empty)}>
            <Plus className="size-4" aria-hidden />
            {canEdit ? 'Pridať jazdu' : 'Šoféroval(a) som'}
          </Button>
        ))}
      {(add.isError || remove.isError) && <p className="mt-2 text-sm text-destructive">Zmena sa nepodarila.</p>}
    </CollapsibleSection>
  )
}
