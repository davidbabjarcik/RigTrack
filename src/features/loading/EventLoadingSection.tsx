import { Rotate3d, Truck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCases } from '@/features/cases/useCases'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/features/equipment/model'
import type { CompanyEvent } from '@/features/events/model'
import { useVehicles } from '@/features/vehicles/useVehicles'
import { VIEW_NAMES } from './isometric'
import { LoadDiagram } from './LoadDiagram'
import { LOAD_FILLS } from './fills'
import { LoadDiagram3D } from './LoadDiagram3D'
import { ObstacleLegend } from './ObstacleLegend'
import { describePlace, loadingOrder, planLoading, type Unplaced } from './model'
import { byCapacity, cargoSpaceOf, parcelOf } from './sources'

const REASONS: Record<Unplaced['reason'], string> = {
  'too-big': 'nezmestí sa do žiadneho vozidla',
  'too-heavy': 'je ťažší než nosnosť ktoréhokoľvek vozidla',
  'no-vehicle': 'už naň neostalo miesto ani nosnosť – treba ďalšie vozidlo',
}

type Props = { companyId: string; event: CompanyEvent }

/**
 * Návrh nakladania na event: koľko vozidiel treba a kam ktorý case uložiť.
 * Počíta sa z cases pridaných na event ako celok; nič sa neukladá, plán sa prepočíta pri každej zmene.
 */
export function EventLoadingSection({ companyId, event }: Props) {
  const cases = useCases(companyId)
  const vehicles = useVehicles(companyId)
  const [excluded, setExcluded] = useState<string[]>([])
  const [view, setView] = useState<'3d' | 'top'>('3d')
  const [turns, setTurns] = useState(0)

  const caseIds = [...new Set(event.equipment.map((item) => item.caseId).filter((id): id is string => id !== null))]
  const loose = event.equipment.filter((item) => item.caseId === null).length
  if (caseIds.length === 0 && loose === 0) return null

  const eventCases = caseIds.map((id) => cases.data?.find((item) => item.id === id)).filter((item) => item !== undefined)
  const parcels = eventCases.map(parcelOf).filter((parcel) => parcel !== null)
  const withoutSize = eventCases.filter((item) => parcelOf(item) === null)
  const withoutWeight = eventCases.filter((item) => parcelOf(item) !== null && item.weightKg === null)

  const active = (vehicles.data ?? []).filter((vehicle) => vehicle.status === 'active')
  const spaces = byCapacity(active.map(cargoSpaceOf).filter((space) => space !== null))
  const unmeasured = active.filter((vehicle) => cargoSpaceOf(vehicle) === null)
  const plan = planLoading(
    spaces.filter((space) => !excluded.includes(space.id)),
    parcels,
  )
  const toggle = (id: string) => setExcluded((current) => (current.includes(id) ? current.filter((other) => other !== id) : [...current, id]))
  const vehicleWord = (count: number) => (count === 1 ? 'vozidlo' : count < 5 ? 'vozidlá' : 'vozidiel')

  return (
    <section aria-labelledby="event-loading-heading" className="mb-6">
      <h2 id="event-loading-heading" className="mb-2 text-sm font-medium text-muted-foreground">
        Nakladanie
      </h2>

      {cases.isPending || vehicles.isPending ? (
        <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Počítam…</p>
      ) : cases.isError || vehicles.isError ? (
        <p className="rounded-xl border bg-surface p-4 text-sm text-destructive">Plán nakladania sa nepodarilo pripraviť.</p>
      ) : caseIds.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">
          Plán nakladania sa počíta z celých cases. Na evente je zatiaľ len jednotlivá technika.
        </p>
      ) : spaces.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">
          Žiadne aktívne vozidlo nemá zapísané rozmery nákladného priestoru. Doplňte ich v úprave vozidla (
          <Link to="/vehicles" className="text-accent hover:underline">
            Vozidlá
          </Link>
          ).
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border bg-surface p-4">
            <p className="flex items-center gap-2 text-lg font-semibold">
              <Truck className="size-5 text-muted-foreground" aria-hidden />
              {plan.loads.length === 0
                ? 'Nie je čo nakladať'
                : `${plan.unplaced.length > 0 ? 'Nestačí: ' : 'Treba '}${plan.loads.length} ${vehicleWord(plan.loads.length)}`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {parcels.length} z {caseIds.length} cases v pláne · spolu {formatNumber(parcels.reduce((sum, parcel) => sum + parcel.weightKg, 0))} kg
            </p>
            <fieldset className="mt-3">
              <legend className="mb-1 text-sm font-medium">Vozidlá, s ktorými počítať</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {spaces.map((space) => (
                  <label key={space.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4" checked={!excluded.includes(space.id)} onChange={() => toggle(space.id)} />
                    {space.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {(plan.unplaced.length > 0 || withoutSize.length > 0) && (
            <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
              <p className="font-medium text-destructive">Do plánu sa nedostalo všetko</p>
              <ul className="mt-1 list-disc pl-5">
                {plan.unplaced.map(({ parcel, reason }) => (
                  <li key={parcel.id}>
                    {parcel.name} – {REASONS[reason]}
                  </li>
                ))}
                {withoutSize.map((item) => (
                  <li key={item.id}>
                    <Link to={`/cases/${item.id}/edit`} className="underline">
                      {item.name}
                    </Link>{' '}
                    – nemá zapísané rozmery
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plan.loads.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-2" role="group" aria-label="Pohľad na náklad">
                {(
                  [
                    ['3d', '3D'],
                    ['top', 'Zhora'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={view === id}
                    onClick={() => setView(id)}
                    className={
                      view === id
                        ? 'h-9 rounded-lg border bg-primary px-3 text-sm font-medium text-primary-foreground'
                        : 'h-9 rounded-lg border bg-surface px-3 text-sm font-medium hover:bg-muted'
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              {view === '3d' && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setTurns((turns + 1) % 4)}>
                    <Rotate3d className="size-4" aria-hidden />
                    Otočiť
                  </Button>
                  <span className="text-sm text-muted-foreground">Pohľad {VIEW_NAMES[turns]}</span>
                </>
              )}
            </div>
          )}

          {plan.loads.map((load) => {
            const order = loadingOrder(load.placements)
            return (
              <div key={load.space.id} className="rounded-xl border bg-surface p-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <Link to={`/vehicles/${load.space.id}`} className="font-medium hover:underline">
                    {load.space.name}
                  </Link>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {formatNumber(load.weightKg)}
                    {load.space.payloadKg !== null && ` z ${load.space.payloadKg}`} kg · objem {Math.round(load.volumeShare * 100)} %
                  </span>
                </div>
                {view === '3d' ? (
                  <LoadDiagram3D space={load.space} placements={order} turns={turns} />
                ) : (
                  <>
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>← dvere</span>
                      <span>kabína →</span>
                    </div>
                    <LoadDiagram space={load.space} placements={order} />
                  </>
                )}
                <ObstacleLegend obstacles={load.space.obstacles} />
                <ol className="mt-3 flex flex-col gap-1 text-sm">
                  {order.map((placement, index) => (
                    <li key={placement.id} className="flex gap-2">
                      <span
                        className="inline-flex size-5 shrink-0 items-center justify-center rounded text-[11px] font-bold text-neutral-900 tabular-nums"
                        style={{ backgroundColor: LOAD_FILLS[index % LOAD_FILLS.length] }}
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <Link to={`/cases/${placement.id}`} className="font-medium hover:underline">
                          {placement.name}
                        </Link>
                        <span className="text-muted-foreground">
                          {' '}
                          – {describePlace(placement, load.space)}
                          {placement.rotated && ', otočený o 90°'} · {formatNumber(placement.weightKg)} kg
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )
          })}

          <p className="text-sm text-muted-foreground">
            Nakladajte v uvedenom poradí, od kabíny dozadu. Návrh je výpočet z rozmerov, nie záruka: nepozná tvar kolies na cases, popruhy
            ani rozloženie váhy na nápravy.
            {withoutWeight.length > 0 && ` Bez zapísanej hmotnosti (rátajú sa ako 0 kg): ${withoutWeight.map((item) => item.name).join(', ')}.`}
            {loose > 0 && ` Jednotlivá technika mimo cases (${loose}) sa do plánu neráta.`}
            {unmeasured.length > 0 && ` Vozidlá bez rozmerov: ${unmeasured.map((vehicle) => vehicle.plate).join(', ')}.`}
          </p>
        </div>
      )}
    </section>
  )
}
