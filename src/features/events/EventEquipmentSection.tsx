import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
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
import { useGearBusyElsewhere } from './elsewhere'
import { PackagePicker } from '@/features/packages/PackagePicker'
import { busyElsewhere, eventsSinceCheck, sameGearAt, whereBusy, type CompanyEvent } from './model'
import { piecesInService } from '@/features/service/model'
import { useServiceRecords } from '@/features/service/useServiceRecords'
import { useLinkedEquipment } from '@/features/links/api'
import { useEquipmentLookups } from '@/features/equipment/useEquipmentLookups'
import { tx, tf } from '@/lib/i18n'

type Props = { companyId: string; event: CompanyEvent; events: CompanyEvent[]; canEdit: boolean }


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

  // Vlastná technika zdieľaná s inou firmou: kusy, ktoré sú v termíne na evente tej firmy (0091).
  const gearElsewhere = useGearBusyElsewhere(companyId, event.startsOn, event.endsOn)
  const otherCompany = (equipmentId: string) => gearElsewhere.data?.find((item) => item.equipmentId === equipmentId)?.quantity ?? 0
  // Kusy v rozpracovanom servise sa rátajú ako nedostupné (kým sa servis neuzavrie).
  const service = useServiceRecords(companyId)
  const inService = piecesInService(service.data ?? [])
  const freeOf = (equipmentId: string, total: number) =>
    total - busyElsewhere(event, equipmentId, events, loans.data ?? [], today) - otherCompany(equipmentId) - (inService.get(equipmentId) ?? 0)
  // Pri nedostatku návrh: rovnakú techniku majú prepojené firmy (len tie, ktoré techniku zdieľajú).
  const short = event.equipment.some((line) => line.quantity > freeOf(line.equipmentId, itemOf(line.equipmentId)?.quantity ?? 0))
  const linked = useLinkedEquipment(companyId, short)
  const grouped = groupByCase(event.equipment)

  return (
    <CollapsibleSection id="event.equipment" title={<>{tx('Technika (')}{grouped.cases.length + grouped.single.length})</>} actions={
        <>
        {canEdit && (
          <div className="flex flex-wrap justify-end gap-2">
            <LinkButton to={`/events/${event.id}/import`} variant="outline" size="sm">
              <FileUp className="size-4" aria-hidden />{tx('Import z Capture')}</LinkButton>
            <Button variant="outline" size="sm" onClick={() => setAdding(!adding)}>
              {!adding && <Plus className="size-4" aria-hidden />}
              {adding ? 'Hotovo' : tx('Pridať techniku')}
            </Button>
          </div>
        )}
        </>
      }>

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
        <ErrorBlock message={tx('Techniku sa nepodarilo načítať.')} onRetry={() => void equipment.refetch()} />
      ) : event.equipment.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface px-6 py-8 text-center text-sm text-muted-foreground">{tx('Na event zatiaľ nie je naplánovaná žiadna technika.')}</p>
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
                  <span className="shrink-0 font-medium">{tx('celý case')}</span>
                  {canEdit && (
                    <Button variant="ghost" size="sm" aria-label={tf('Odobrať z eventu case: {0}', name)} disabled={busy} onClick={() => removeCase.mutate(caseId)}>
                      <X className="size-4" aria-hidden />
                    </Button>
                  )}
                </div>
                {collision && content.map((line) => {
                  const piece = itemOf(line.equipmentId)
                  const free = freeOf(line.equipmentId, piece?.quantity ?? 0)
                  if (!piece || line.quantity <= free) return null
                  return (
                    <Shortage
                      key={line.equipmentId}
                      title={piece.name}
                      missing={line.quantity - Math.max(free, 0)}
                      where={whereBusy(event, line.equipmentId, events, loans.data ?? [], today)}
                      inService={inService.get(line.equipmentId) ?? 0}
                      partners={sameGearAt(piece, linked.data ?? [])}
                    />
                  )
                })}
                {unchecked && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                    <ClipboardCheck className="size-4 shrink-0" aria-hidden />
                    {checkedOn === null
                      ? tx('Obsah tohto case ešte nikto neskontroloval.')
                      : tf('Case nebol skontrolovaný od {0}, odvtedy bol na {1} {2}.', formatDate(checkedOn), sinceCheck, sinceCheck === 1 ? 'evente' : 'eventoch')}{' '}
                    <Link to={`/cases/${caseId}`} className="font-medium underline">{tx('Skontrolovať')}</Link>
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
                    <span className="block truncate text-sm text-muted-foreground">{tx('voľné')}{' '}{Math.max(free, 0)} z {piece?.quantity ?? 0}{' '}{tx('ks v tomto termíne')}</span>
                  </Link>
                  {canEdit ? (
                    <>
                      <Field
                        label={tf('Počet: {0}', piece?.name ?? 'technika')}
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
                        aria-label={tf('Odobrať z eventu: {0}', piece?.name ?? 'technika')}
                        disabled={busy}
                        onClick={() => remove.mutate(item.equipmentId)}
                      >
                        <X className="size-4" aria-hidden />
                      </Button>
                    </>
                  ) : (
                    <span className="shrink-0 font-medium">{item.quantity}{' '}{tx('ks')}</span>
                  )}
                </div>
                {collision && piece && (
                  <Shortage
                    missing={item.quantity - Math.max(free, 0)}
                    where={whereBusy(event, item.equipmentId, events, loans.data ?? [], today)}
                    inService={inService.get(item.equipmentId) ?? 0}
                    partners={sameGearAt(piece, linked.data ?? [])}
                  />
                )}
                {otherCompany(item.equipmentId) > 0 && (
                  <p className="mt-1 flex items-center gap-2 text-sm text-accent">
                    <TriangleAlert className="size-4 shrink-0" aria-hidden />
                    {otherCompany(item.equipmentId)}{' '}{tx('ks tejto vlastnej techniky je v tomto termíne na evente inej firmy.')}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {mutations.some((mutation) => mutation.isError) && (
        <p role="alert" className="mt-2 text-sm text-destructive">{tx('Zmena sa nepodarila.')}</p>
      )}

      {adding && (
        <div className="mt-4">
          <PackagePicker companyId={companyId} equipment={lendable} cases={cases.data ?? []} disabled={busy} onAdd={(additions) => addPackage.mutate(additions)} />
          <LoanPicker
            title={tx('Pridať techniku na event')}
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
    </CollapsibleSection>
  )
}

/** Prečo technika nestačí: kde je v termíne, koľko je v servise a kto z prepojených firiem ju má. */
function Shortage({ title, missing, where, inService, partners }: {
  title?: string
  missing: number
  where: ReturnType<typeof whereBusy>
  inService: number
  partners: { companyName: string; quantity: number }[]
}) {
  const term = (from: string, to: string) => (from === to ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`)
  return (
    <div className="mt-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-sm">
      <p className="flex items-center gap-2 font-medium text-destructive">
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
        {title ? tf('{0}: chýba {1} ks v tomto termíne.', title, missing) : tf('Chýba {0} ks v tomto termíne.', missing)}
      </p>
      <ul className="mt-1 flex flex-col gap-0.5 pl-6 text-muted-foreground">
        {where.onEvents.map((row) => (
          <li key={row.id}>
            {row.quantity}{' '}{tx('ks na evente')}{' '}<Link to={`/events/${row.id}`} className="font-medium text-foreground underline">{row.name}</Link>{' '}({term(row.startsOn, row.endsOn)})
          </li>
        ))}
        {where.onLoans.map((row) => (
          <li key={row.id}>
            {row.quantity}{' '}{tx('ks na výpožičke:')}{' '}<Link to={`/loans/${row.id}`} className="font-medium text-foreground underline">{row.borrower}</Link>
            {row.overdue && <span className="text-destructive">{' '}{tx('(po termíne vrátenia)')}</span>}
          </li>
        ))}
        {inService > 0 && <li>{inService}{' '}{tx('ks je v servise (neuzavretý záznam)')}</li>}
      </ul>
      {partners.length > 0 && (
        <p className="mt-1 pl-6">
          {tx('Majú ju prepojené firmy:')}{' '}{partners.map((partner) => `${partner.companyName} (${partner.quantity} ks)`).join(', ')}
        </p>
      )}
    </div>
  )
}
