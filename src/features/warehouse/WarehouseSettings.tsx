import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Map, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, LinkButton } from '@/components/ui/button'
import { errorDetail } from '@/lib/supabase/errors'
import { fetchWarehouse, saveRackTypes, warehouseKeys } from './api'
import { BaysEditor } from './BaysEditor'
import { metres, PALLET_CM, palletTypesOf, rackHeightCm, rackLengthCm, type RackType } from './model'
import { PalletTypesSettings } from './PalletTypesSettings'
import { PlanColorsSettings } from './PlanColorsSettings'
import { SizeForm } from './SizeForm'
import { tx, tf } from '@/lib/i18n'

const newType = (count: number): RackType => ({
  id: crypto.randomUUID(),
  name: tf('Regál typ {0}', count + 1),
  depthCm: 110,
  bays: [{ widthCm: 267, levels: [{ heightCm: 150, pallets: 3 }, { heightCm: 120 }, { heightCm: 120 }] }],
})

/**
 * Nastavenia → Sklad: rozmery skladu a typy regálov, ktoré firma používa (hĺbka, polia, police s výškami, palety).
 * Regály sa z typov pridávajú a rozmiestňujú na stránke Sklad → Upraviť plán. Smie ten, kto má warehouse.manage.
 */
export function WarehouseSettings({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient()
  const plan = useQuery({ queryKey: warehouseKeys.plan(companyId), queryFn: () => fetchWarehouse(companyId) })
  const [open, setOpen] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: (types: RackType[]) => saveRackTypes(companyId, types),
    onSuccess: () => setOpen(null),
    onSettled: () => queryClient.invalidateQueries({ queryKey: warehouseKeys.plan(companyId) }),
  })

  if (plan.isPending) return <p className="text-sm text-muted-foreground">{tx('Načítavam…')}</p>
  if (plan.isError) return <p className="text-sm text-destructive">{tx('Sklad sa nepodarilo načítať.')}</p>

  const { warehouse } = plan.data
  const types = warehouse?.rackTypes ?? []
  const update = (id: string, patch: Partial<RackType>) => save.mutate(types.map((item) => (item.id === id ? { ...item, ...patch } : item)))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 font-medium">{tx('Rozmery skladu')}</h3>
        <SizeForm key={warehouse ? `${warehouse.lengthCm}x${warehouse.widthCm}` : 'new'} companyId={companyId} current={warehouse} onDone={() => {}} />
      </div>

      <div>
        <h3 className="mb-1 font-medium">{tx('Typy regálov (')}{types.length})</h3>
        <p className="mb-2 text-sm text-muted-foreground">{tx('Regály, ktoré používate: hĺbka a polia (časť medzi dvoma stojkami, napr. 267 cm) s policami – každá môže byť inak vysoká a mať palety (europaleta')}{' '}{PALLET_CM}{' '}{tx('cm spredu). Regály z nich pridáte a rozmiestnite v Sklade → Upraviť plán (posunúť, otočiť).')}</p>
        <ul className="flex flex-col gap-2">
          {types.map((type) => {
            const expanded = open === type.id
            return (
              <li key={type.id} className="rounded-xl border bg-surface">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : type.id)}>
                    {expanded ? <ChevronUp className="size-4 shrink-0" aria-hidden /> : <ChevronDown className="size-4 shrink-0" aria-hidden />}
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{type.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {metres(rackLengthCm(type.bays))}{' '}{tx('dlhý ·')}{' '}{type.depthCm}{' '}{tx('cm hlboký ·')}{' '}{rackHeightCm(type.bays)}{' '}{tx('cm vysoký ·')}{' '}{type.bays.length}{' '}
                        {type.bays.length === 1 ? 'pole' : type.bays.length < 5 ? 'polia' : tx('polí')}{' '}{tx('· police')}{' '}{type.bays.map((bay) => bay.levels.length).join(' / ')}
                      </span>
                    </span>
                  </button>
                  <Button size="sm" variant="ghost" className="size-8 p-0" aria-label={tf('Zmazať {0}', type.name)} disabled={save.isPending} onClick={() => window.confirm(tf('Zmazať typ „{0}“? Regály v sklade ostanú.', type.name)) && save.mutate(types.filter((item) => item.id !== type.id))}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
                {expanded && (
                  <div className="border-t px-4 pt-3 pb-4">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <label className="flex items-center gap-2">{tx('Názov')}<input
                          className="h-9 w-56 rounded-lg border bg-surface px-2"
                          maxLength={60}
                          defaultValue={type.name}
                          onBlur={(event) => {
                            const name = event.target.value.trim()
                            if (name && name !== type.name) update(type.id, { name })
                          }}
                        />
                      </label>
                      <label className="flex items-center gap-2">{tx('Hĺbka')}<input
                          type="number"
                          min={20}
                          max={500}
                          className="h-9 w-20 rounded-lg border bg-surface px-2 tabular-nums"
                          defaultValue={type.depthCm}
                          onBlur={(event) => {
                            const value = Math.round(Number(event.target.value))
                            if (value >= 20 && value <= 500 && value !== type.depthCm) update(type.id, { depthCm: value })
                          }}
                        />{tx('cm')}</label>
                    </div>
                    <BaysEditor bays={type.bays} saving={save.isPending} onCancel={() => setOpen(null)} onSave={(bays) => update(type.id, { bays })} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!warehouse || save.isPending}
            onClick={() => {
              const created = newType(types.length)
              save.mutate([...types, created], { onSuccess: () => setOpen(created.id) })
            }}
          >
            <Plus className="size-4" aria-hidden />{tx('Nový typ regálu')}</Button>
          {warehouse && (
            <LinkButton to="/warehouse?edit=1" size="sm">
              <Map className="size-4" aria-hidden />{tx('Rozmiestniť regály v sklade')}</LinkButton>
          )}
        </div>
        {!warehouse && <p className="mt-1 text-sm text-muted-foreground">{tx('Najprv zadajte rozmery skladu.')}</p>}
      </div>

      <PalletTypesSettings companyId={companyId} types={palletTypesOf(warehouse)} disabled={!warehouse} />

      {warehouse && <PlanColorsSettings key={JSON.stringify(warehouse.planColors ?? {})} companyId={companyId} warehouse={warehouse} />}

      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          {/rack_types/.test(String(save.error?.message ?? '')) ? tx('Typy regálov ešte databáza nepozná – spustite v Supabase supabase/update-all.sql (migrácia 0126).') : tf('Nepodarilo sa uložiť. {0}', errorDetail(save.error))}
        </p>
      )}
    </div>
  )
}
