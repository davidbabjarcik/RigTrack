import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, Plus, TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useCases } from '@/features/cases/useCases'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { PhotoThumb } from '@/features/equipment/PhotoThumb'
import { usePhotoThumbs } from '@/features/equipment/usePhotoThumbs'
import { LoanPicker } from '@/features/loans/LoanPicker'
import { describeContent, groupByCase } from '@/features/loans/model'
import { useLoans } from '@/features/loans/useLoans'
import { todayIso } from '@/lib/format'
import { addEventCase, addEventEquipment, eventKeys, removeEventCase, removeEventEquipment, setEventEquipmentQuantity } from './api'
import { busyElsewhere, type CompanyEvent } from './model'

type Props = { companyId: string; event: CompanyEvent; events: CompanyEvent[]; canEdit: boolean }

const COLLISION = 'Kolízia: v tomto termíne je časť techniky na inom evente alebo výpožičke.'

/** Technika naplánovaná na event, s upozornením na kolízie s inými eventmi a výpožičkami. */
export function EventEquipmentSection({ companyId, event, events, canEdit }: Props) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const today = todayIso()

  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const cases = useCases(companyId)
  const loans = useLoans(companyId)
  const all = equipment.data ?? []
  const lendable = all.filter((item) => item.status !== 'retired' && item.kind !== 'consumable')
  const itemOf = (equipmentId: string) => all.find((item) => item.id === equipmentId)
  const nameOf = (equipmentId: string) => itemOf(equipmentId)?.name ?? 'Technika'
  // Náhľady pre naplánovanú techniku; pri otvorenom výbere aj pre celý sklad.
  const thumbs = usePhotoThumbs(
    companyId,
    (adding ? lendable : event.equipment.map((item) => itemOf(item.equipmentId))).map((item) => item?.photoPath ?? ''),
  )

  const refresh = () => queryClient.invalidateQueries({ queryKey: eventKeys.list(companyId) })
  const add = useMutation({ mutationFn: (equipmentId: string) => addEventEquipment(companyId, event.id, equipmentId), onSettled: refresh })
  const addCase = useMutation({
    mutationFn: (caseId: string) =>
      addEventCase(
        companyId,
        event.id,
        caseId,
        lendable.filter((item) => item.caseId === caseId && item.quantity > 0).map((item) => ({ equipmentId: item.id, quantity: item.quantity })),
      ),
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: (equipmentId: string) => removeEventEquipment(event.id, equipmentId), onSettled: refresh })
  const removeCase = useMutation({ mutationFn: (caseId: string) => removeEventCase(event.id, caseId), onSettled: refresh })
  const quantity = useMutation({
    mutationFn: ({ equipmentId, value }: { equipmentId: string; value: number }) => setEventEquipmentQuantity(event.id, equipmentId, value),
    onSettled: refresh,
  })
  const mutations = [add, addCase, remove, removeCase, quantity]
  const busy = mutations.some((mutation) => mutation.isPending)

  const freeOf = (equipmentId: string, total: number) => total - busyElsewhere(event, equipmentId, events, loans.data ?? [], today)
  const grouped = groupByCase(event.equipment)

  return (
    <section aria-labelledby="event-equipment-heading" className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="event-equipment-heading" className="text-sm font-medium text-muted-foreground">
          Technika ({grouped.cases.length + grouped.single.length})
        </h2>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setAdding(!adding)}>
            {!adding && <Plus className="size-4" aria-hidden />}
            {adding ? 'Hotovo' : 'Pridať techniku'}
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
          {grouped.cases.map(({ caseId, content }) => {
            const name = cases.data?.find((item) => item.id === caseId)?.name ?? 'Case'
            const collision = content.some((item) => item.quantity > freeOf(item.equipmentId, itemOf(item.equipmentId)?.quantity ?? 0))
            return (
              <li key={caseId} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Package className="size-5" aria-hidden />
                  </span>
                  <Link to={`/cases/${caseId}`} className="min-w-0 flex-1 hover:underline">
                    <span className="block truncate font-medium">{name}</span>
                    <span className="block text-xs text-muted-foreground">{describeContent(content, nameOf)}</span>
                  </Link>
                  <span className="shrink-0 font-medium">celý case</span>
                  {canEdit && (
                    <Button variant="ghost" size="sm" aria-label={`Odobrať z eventu case: ${name}`} disabled={busy} onClick={() => removeCase.mutate(caseId)}>
                      <X className="size-4" aria-hidden />
                    </Button>
                  )}
                </div>
                {collision && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-destructive">
                    <TriangleAlert className="size-4 shrink-0" aria-hidden />
                    {COLLISION}
                  </p>
                )}
              </li>
            )
          })}
          {grouped.single.map((item) => {
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
                    {COLLISION}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {mutations.some((mutation) => mutation.isError) && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Zmena sa nepodarila.
        </p>
      )}

      {adding && (
        <div className="mt-4">
          <LoanPicker
            title="Pridať techniku na event"
            equipment={lendable}
            cases={cases.data ?? []}
            chosen={new Set(event.equipment.map((item) => item.equipmentId))}
            chosenCases={new Set(grouped.cases.map((group) => group.caseId))}
            thumbs={thumbs}
            freeOf={(item) => freeOf(item.id, item.quantity)}
            disabled={busy}
            onAdd={(item) => add.mutate(item.id)}
            onAddCase={(caseId) => addCase.mutate(caseId)}
          />
        </div>
      )}
    </section>
  )
}
