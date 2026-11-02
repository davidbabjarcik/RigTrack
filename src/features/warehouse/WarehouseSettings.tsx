import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { errorDetail } from '@/lib/supabase/errors'
import { addSpot, deleteSpot, fetchWarehouse, updateSpot, warehouseKeys } from './api'
import { BaysEditor } from './BaysEditor'
import { metres, nextSpotName, PALLET_CM, rackBays, type RackBay, type Spot } from './model'
import { SizeForm } from './SizeForm'

/** Stojka medzi poliami (cm) – šírka regála na pláne = polia + stojky. */
const POST_CM = 9

const rackLength = (bays: RackBay[]) => bays.reduce((sum, bay) => sum + bay.widthCm, 0) + POST_CM * (bays.length + 1)
const rackHeight = (bays: RackBay[]) => Math.max(...bays.map((bay) => bay.levels.reduce((sum, level) => sum + level.heightCm + 12, 0)))

/**
 * Nastavenia → Sklad: rozmery skladu a regály – polia (šírka), police (výška každej zvlášť) a palety.
 * Kde regál stojí, sa ťahá na stránke Sklad (Upraviť plán). Smie ten, kto má warehouse.manage.
 */
export function WarehouseSettings({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient()
  const plan = useQuery({ queryKey: warehouseKeys.plan(companyId), queryFn: () => fetchWarehouse(companyId) })
  const [open, setOpen] = useState<string | null>(null)
  const refresh = () => queryClient.invalidateQueries({ queryKey: warehouseKeys.plan(companyId) })

  // Uloží polia a prispôsobí regál na pláne: dlhšia strana = polia so stojkami, poschodia = najviac políc.
  const saveBays = useMutation({
    mutationFn: ({ spot, bays }: { spot: Spot; bays: RackBay[] }) => {
      const length = rackLength(bays)
      const horizontal = spot.length >= spot.width
      return updateSpot(companyId, spot.id, {
        bays,
        levels: Math.min(20, Math.max(...bays.map((bay) => bay.levels.length))),
        ...(horizontal ? { length } : { width: length }),
      })
    },
    onSuccess: () => setOpen(null),
    onSettled: refresh,
  })
  const setDepth = useMutation({
    mutationFn: ({ spot, depth }: { spot: Spot; depth: number }) => updateSpot(companyId, spot.id, spot.length >= spot.width ? { width: depth } : { length: depth }),
    onSettled: refresh,
  })
  const add = useMutation({
    mutationFn: (spots: Spot[]) => {
      const bays: RackBay[] = [{ widthCm: 267, levels: [{ heightCm: 150, pallets: 3 }, { heightCm: 120 }, { heightCm: 120 }] }]
      return addSpot(companyId, { name: nextSpotName(spots).replace('Miesto', 'Regál'), kind: 'rack', x: 0, y: 0, length: rackLength(bays), width: 110, levels: 3, bays })
    },
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: (id: string) => deleteSpot(companyId, id), onSettled: refresh })

  if (plan.isPending) return <p className="text-sm text-muted-foreground">Načítavam…</p>
  if (plan.isError) return <p className="text-sm text-destructive">Sklad sa nepodarilo načítať.</p>

  const { warehouse, spots } = plan.data
  const racks = spots.filter((spot) => spot.kind === 'rack')
  const error = [saveBays, setDepth, add, remove].find((mutation) => mutation.isError)?.error

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 font-medium">Rozmery skladu</h3>
        <SizeForm key={warehouse ? `${warehouse.lengthCm}x${warehouse.widthCm}` : 'new'} companyId={companyId} current={warehouse} onDone={() => {}} />
      </div>

      <div>
        <h3 className="mb-1 font-medium">Regály ({racks.length})</h3>
        <p className="mb-2 text-sm text-muted-foreground">
          Regál má polia (časť medzi dvoma stojkami, napr. 267 cm) a v každom poli police – každá môže byť inak vysoká a mať palety
          (europaleta {PALLET_CM} cm spredu). Kde regál stojí, posuniete na stránke{' '}
          <Link to="/warehouse" className="text-accent hover:underline">
            Sklad
          </Link>{' '}
          → Upraviť plán.
        </p>
        <ul className="flex flex-col gap-2">
          {racks.map((spot) => {
            const bays = rackBays(spot)
            const depth = Math.min(spot.length, spot.width)
            const expanded = open === spot.id
            return (
              <li key={spot.id} className="rounded-xl border bg-surface">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : spot.id)}>
                    {expanded ? <ChevronUp className="size-4 shrink-0" aria-hidden /> : <ChevronDown className="size-4 shrink-0" aria-hidden />}
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{spot.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {bays.length} {bays.length === 1 ? 'pole' : bays.length < 5 ? 'polia' : 'polí'} · {metres(rackLength(bays))} dlhý · {rackHeight(bays)} cm vysoký · police{' '}
                        {bays.map((bay) => bay.levels.length).join(' / ')} · paliet {bays.reduce((sum, bay) => sum + bay.levels.reduce((total, level) => total + (level.pallets ?? 0), 0), 0)}
                      </span>
                    </span>
                  </button>
                  <label className="flex items-center gap-2 text-sm">
                    Hĺbka
                    <input
                      type="number"
                      min={20}
                      max={500}
                      defaultValue={depth}
                      className="h-9 w-20 rounded-lg border bg-surface px-2 text-sm tabular-nums"
                      onBlur={(event) => {
                        const value = Math.round(Number(event.target.value))
                        if (value >= 20 && value <= 500 && value !== depth) setDepth.mutate({ spot, depth: value })
                      }}
                    />
                    cm
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="size-8 p-0"
                    aria-label={`Odstrániť ${spot.name}`}
                    disabled={remove.isPending}
                    onClick={() => window.confirm(`Odstrániť regál „${spot.name}“? Cases na ňom ostanú bez miesta.`) && remove.mutate(spot.id)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
                {expanded && (
                  <div className="border-t px-4 pb-4">
                    <BaysEditor bays={bays} saving={saveBays.isPending} onCancel={() => setOpen(null)} onSave={(next) => saveBays.mutate({ spot, bays: next })} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <Button size="sm" className="mt-2" disabled={!warehouse || add.isPending} onClick={() => add.mutate(spots)}>
          <Plus className="size-4" aria-hidden />
          Pridať regál
        </Button>
        {!warehouse && <p className="mt-1 text-sm text-muted-foreground">Najprv zadajte rozmery skladu.</p>}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          Nepodarilo sa uložiť. {errorDetail(error)}
        </p>
      )}
    </div>
  )
}
