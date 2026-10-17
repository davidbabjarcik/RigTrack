import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck, FileUp, Package, Plus, TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button, LinkButton } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useCases } from '@/features/cases/useCases'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { PhotoThumb } from '@/features/equipment/PhotoThumb'
import { usePhotoThumbs } from '@/features/equipment/usePhotoThumbs'
import { LoanPicker } from '@/features/loans/LoanPicker'
import { describeContent, groupByCase } from '@/features/loans/model'
import { useLoans } from '@/features/loans/useLoans'
import { formatDate, todayIso } from '@/lib/format'
import { addEventCase, addEventEquipment, eventKeys, removeEventCase, removeEventEquipment, setEventEquipmentQuantity } from './api'
import { EventReminders } from './EventReminders'
import { PackagePicker } from '@/features/packages/PackagePicker'
import { busyElsewhere, eventsSinceCheck, type CompanyEvent } from './model'
import { useEquipmentLookups } from '@/features/equipment/useEquipmentLookups'

type Props = { companyId: string; event: CompanyEvent; events: CompanyEvent[]; canEdit: boolean }

const COLLISION = 'Kolízia: v tomto termíne je časť techniky na inom evente alebo výpožičke.'

/** Technika naplánovaná na event, s upozornením na kolízie s inými eventmi a výpožičkami. */
export function EventEquipmentSection({ companyId, event, events, canEdit }: Props) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const today = todayIso()

  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const cases = useCases(companyId)
  const { categories } = useEquipmentLookups(companyId)
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
  // Z pripomienky: pridá chýbajúci počet kusov (k technike, ktorá už na evente je, pripočíta).
  const addCount = useMutation({
    mutationFn: async ({ equipmentId, count }: { equipmentId: string; count: number }) => {
      const existing = event.equipment.find((item) => item.equipmentId === equipmentId)
      if (existing) return setEventEquipmentQuantity(event.id, equipmentId, existing.quantity + count)
      await addEventEquipment(companyId, event.id, equipmentId)
      if (count > 1) await setEventEquipmentQuantity(event.id, equipmentId, count)
    },
    onSettled: refresh,
  })
  // Balík: celé cases a technika (počty sa pripočítajú k tomu, čo už na evente je).
  const addPackage = useMutation({
    mutationFn: async (additions: { items: { equipmentId: string; quantity: number }[]; cases: string[] }) => {
      for (const caseId of additions.cases) {
        const content = lendable.filter((item) => item.caseId === caseId && item.quantity > 0).map((item) => ({ equipmentId: item.id, quantity: item.quantity }))
        if (content.length > 0) await addEventCase(companyId, event.id, caseId, content)
      }
      for (const { equipmentId, quantity: count } of additions.items) {
        const existing = event.equipment.find((item) => item.equipmentId === equipmentId)
        if (existing) await setEventEquipmentQuantity(event.id, equipmentId, existing.quantity + count)
        else if (!additions.cases.some((caseId) => lendable.some((item) => item.id === equipmentId && item.caseId === caseId))) {
          await addEventEquipment(companyId, event.id, equipmentId)
          if (count > 1) await setEventEquipmentQuantity(event.id, equipmentId, count)
        }
      }
    },
    onSettled: refresh,
  })
  const mutations = [add, addCase, remove, removeCase, quantity, addCount, addPackage]
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
          <div className="flex flex-wrap justify-end gap-2">
            <LinkButton to={`/events/${event.id}/import`} variant="outline" size="sm">
              <FileUp className="size-4" aria-hidden />
              Import z Capture
            </LinkButton>
            <Button variant="outline" size="sm" onClick={() => setAdding(!adding)}>
              {!adding && <Plus className="size-4" aria-hidden />}
              {adding ? 'Hotovo' : 'Pridať techniku'}
            </Button>
          </div>
        )}
      </div>

      {equipment.data && (
        <EventReminders
          companyId={companyId}
          lines={event.equipment}
          where="na evente"
          storageKey={event.id}
          equipment={all}
          categories={categories}
          cases={cases.data ?? []}
          canEdit={canEdit}
          busy={busy}
          onAddEquipment={(equipmentId, count) => addCount.mutate({ equipmentId, count })}
          onAddCase={(caseId) => addCase.mutate(caseId)}
          onOpenPicker={() => setAdding(true)}
        />
      )}

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
            const box = cases.data?.find((item) => item.id === caseId)
            const name = box?.name ?? 'Case'
            // Len upozornenie v aplikácii; do tlače eventu nejde.
            const checkedOn = box?.lastCheck?.checkedAt.slice(0, 10) ?? null
            const sinceCheck = eventsSinceCheck(caseId, checkedOn, events, event.id, today)
            const unchecked = box && (checkedOn === null || sinceCheck > 0)
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
                {unchecked && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                    <ClipboardCheck className="size-4 shrink-0" aria-hidden />
                    {checkedOn === null
                      ? 'Obsah tohto case ešte nikto neskontroloval.'
                      : `Case nebol skontrolovaný od ${formatDate(checkedOn)}, odvtedy bol na ${sinceCheck} ${sinceCheck === 1 ? 'evente' : 'eventoch'}.`}{' '}
                    <Link to={`/cases/${caseId}`} className="font-medium underline">
                      Skontrolovať
                    </Link>
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
          <PackagePicker companyId={companyId} equipment={lendable} cases={cases.data ?? []} disabled={busy} onAdd={(additions) => addPackage.mutate(additions)} />
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
