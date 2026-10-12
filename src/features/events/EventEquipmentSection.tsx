import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { filterEquipment } from '@/features/equipment/model'
import { PhotoThumb } from '@/features/equipment/PhotoThumb'
import { usePhotoThumbs } from '@/features/equipment/usePhotoThumbs'
import { useLoans } from '@/features/loans/useLoans'
import { todayIso } from '@/lib/format'
import { addEventEquipment, eventKeys, removeEventEquipment, setEventEquipmentQuantity } from './api'
import { busyElsewhere, type CompanyEvent } from './model'

// Pri veľkom sklade nemá zmysel vykresliť tisíce riadkov; používateľ zúži výber hľadaním.
const PICKER_LIMIT = 20

type Props = { companyId: string; event: CompanyEvent; events: CompanyEvent[]; canEdit: boolean }

/** Technika naplánovaná na event, s upozornením na kolízie s inými eventmi a výpožičkami. */
export function EventEquipmentSection({ companyId, event, events, canEdit }: Props) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const today = todayIso()

  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const loans = useLoans(companyId)
  const all = equipment.data ?? []
  const itemOf = (equipmentId: string) => all.find((item) => item.id === equipmentId)
  const thumbs = usePhotoThumbs(
    companyId,
    event.equipment.map((item) => itemOf(item.equipmentId)?.photoPath ?? ''),
  )

  const refresh = () => queryClient.invalidateQueries({ queryKey: eventKeys.list(companyId) })
  const add = useMutation({ mutationFn: (equipmentId: string) => addEventEquipment(companyId, event.id, equipmentId), onSettled: refresh })
  const remove = useMutation({ mutationFn: (equipmentId: string) => removeEventEquipment(event.id, equipmentId), onSettled: refresh })
  const quantity = useMutation({
    mutationFn: ({ equipmentId, value }: { equipmentId: string; value: number }) => setEventEquipmentQuantity(event.id, equipmentId, value),
    onSettled: refresh,
  })
  const busy = add.isPending || remove.isPending || quantity.isPending

  const freeOf = (equipmentId: string, total: number) => total - busyElsewhere(event, equipmentId, events, loans.data ?? [], today)
  const chosen = new Set(event.equipment.map((item) => item.equipmentId))
  const candidates = filterEquipment(
    all.filter((item) => item.status !== 'retired' && item.kind !== 'consumable' && !chosen.has(item.id)),
    { search, status: '', categoryId: '', locationId: '', caseId: '' },
  )

  return (
    <section aria-labelledby="event-equipment-heading" className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="event-equipment-heading" className="text-sm font-medium text-muted-foreground">
          Technika ({event.equipment.length})
        </h2>
        {canEdit && !adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden />
            Pridať techniku
          </Button>
        )}
      </div>

      {equipment.isPending ? (
        <LoadingBlock />
      ) : equipment.isError ? (
        <ErrorBlock message="Techniku sa nepodarilo načítať." onRetry={() => void equipment.refetch()} />
      ) : event.equipment.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface px-6 py-8 text-center text-sm text-muted-foreground">
          Na event zatiaľ nie je naplánovaná žiadna technika.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {event.equipment.map((item) => {
            const piece = itemOf(item.equipmentId)
            const free = freeOf(item.equipmentId, piece?.quantity ?? 0)
            const collision = item.quantity > free
            return (
              <li key={item.equipmentId} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <PhotoThumb url={thumbs[piece?.photoPath ?? '']} />
                  <Link to={`/equipment/${item.equipmentId}`} className="min-w-0 flex-1 hover:underline">
                    <span className="block truncate font-medium">{piece?.name ?? 'Technika'}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      voľné {Math.max(free, 0)} z {piece?.quantity ?? 0} ks v tomto termíne
                    </span>
                  </Link>
                  {canEdit ? (
                    <>
                      <Field
                        label={`Počet: ${piece?.name ?? 'technika'}`}
                        hideLabel
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        className="w-20"
                        disabled={busy}
                        // Kľúč podľa hodnoty: po uložení sa pole prekreslí s novým číslom z databázy.
                        key={item.quantity}
                        defaultValue={item.quantity}
                        onBlur={(e) => {
                          const value = Math.floor(Number(e.target.value))
                          if (value >= 1 && value !== item.quantity) quantity.mutate({ equipmentId: item.equipmentId, value })
                          else e.target.value = String(item.quantity)
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Odobrať z eventu: ${piece?.name ?? 'technika'}`}
                        disabled={busy}
                        onClick={() => remove.mutate(item.equipmentId)}
                      >
                        <X className="size-4" aria-hidden />
                      </Button>
                    </>
                  ) : (
                    <span className="shrink-0 font-medium">{item.quantity} ks</span>
                  )}
                </div>
                {collision && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-destructive">
                    <TriangleAlert className="size-4 shrink-0" aria-hidden />
                    Kolízia: v tomto termíne je časť techniky na inom evente alebo výpožičke.
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {(add.isError || remove.isError || quantity.isError) && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Zmena sa nepodarila.
        </p>
      )}

      {adding && (
        <div className="mt-4 rounded-xl border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-medium">Pridať techniku na event</h3>
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Hotovo
            </Button>
          </div>
          <Field
            label="Hľadať techniku"
            hideLabel
            type="search"
            autoFocus
            placeholder="Názov, výrobca, sériové alebo inventárne číslo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {candidates.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Žiadna ďalšia technika.</p>
          ) : (
            <ul className="mt-3 divide-y">
              {candidates.slice(0, PICKER_LIMIT).map((item) => {
                const free = freeOf(item.id, item.quantity)
                return (
                  <li key={item.id} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.name}</span>
                      <span className={free > 0 ? 'block text-sm text-muted-foreground' : 'block text-sm text-destructive'}>
                        {free > 0 ? `voľné ${free} z ${item.quantity} ks` : 'v tomto termíne obsadené'}
                      </span>
                    </span>
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => add.mutate(item.id)}>
                      Pridať
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
          {candidates.length > PICKER_LIMIT && (
            <p className="mt-3 text-sm text-muted-foreground">
              Zobrazených prvých {PICKER_LIMIT} z {candidates.length}. Spresnite hľadanie.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
