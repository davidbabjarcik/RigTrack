import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CirclePlus, ClipboardList, Copy, MapPin, Pencil, Plus, QrCode, Star, Tag, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button, LinkButton } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList, setEquipmentCase, setEquipmentLabelRole, splitEquipmentIntoCase, splitEquipmentUnits } from '@/features/equipment/api'
import { unitIdsOf } from '@/features/equipment/model'
import { filterEquipment, type LabelRole } from '@/features/equipment/model'
import { PhotoThumb } from '@/features/equipment/PhotoThumb'
import { StatusBadge } from '@/features/equipment/StatusBadge'
import { usePhotoThumbs } from '@/features/equipment/usePhotoThumbs'
import { useEquipmentLookups } from '@/features/equipment/useEquipmentLookups'
import { OwnerLink } from '@/features/staff/OwnerLink'
import { UsageHistory } from '@/features/usage/UsageHistory'
import { fetchWarehouse, warehouseKeys } from '@/features/warehouse/api'
import { describeSpot } from '@/features/warehouse/model'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { caseKeys, deleteCase, duplicateCase } from './api'
import { ResponsibleFor } from '@/features/responsibilities/ResponsibleFor'
import { CaseChecks } from './CaseChecks'
import { CasePhoto } from './CasePhoto'
import { formatWeight } from './label'
import { caseTitle, formatDimensions, kindLabel } from './model'
import { useCases } from './useCases'

// Pri veľkom sklade nemá zmysel vykresliť tisíce riadkov; používateľ zúži výber hľadaním.
const PICKER_LIMIT = 30

export function CaseDetailPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const canEdit = can(company, 'cases.edit')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  // Technika, ktorá už je v inom case, sa ponúkne len na požiadanie (presun z case do case).
  const [fromOtherCases, setFromOtherCases] = useState(false)

  const cases = useCases(companyId)
  // Plán skladu je len doplnok: ak sa nenačíta, detail case funguje ďalej bez neho.
  const warehouse = useQuery({ queryKey: warehouseKeys.plan(companyId), queryFn: () => fetchWarehouse(companyId) })
  const { locations } = useEquipmentLookups(companyId)
  const equipment = useQuery({
    queryKey: equipmentKeys.list(companyId),
    queryFn: () => fetchEquipmentList(companyId),
  })

  const thumbs = usePhotoThumbs(
    companyId,
    (equipment.data ?? []).filter((item) => item.caseId === id).map((item) => item.photoPath),
  )

  const move = useMutation({
    // S počtom menším ako všetky kusy sa položka rozdelí (časť ide do case, zvyšok ostane).
    mutationFn: ({ equipmentId, caseId, count, units }: { equipmentId: string; caseId: string | null; count?: number; units?: number[] }) =>
      units ? splitEquipmentUnits(equipmentId, caseId, units).then(() => undefined) : count ? splitEquipmentIntoCase(equipmentId, caseId, count).then(() => undefined) : setEquipmentCase(companyId, equipmentId, caseId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: equipmentKeys.list(companyId) }),
  })

  // Kópia s ďalším číslom (rozmery, fotka, kategória…), bez techniky; otvorí sa nový case.
  const duplicate = useMutation({
    mutationFn: () => duplicateCase(companyId, cases.data!.find((c) => c.id === id)!, cases.data ?? []),
    onSuccess: async (newId) => {
      await queryClient.invalidateQueries({ queryKey: caseKeys.list(companyId) })
      navigate(`/cases/${newId}`)
    },
  })

  const mark = useMutation({
    mutationFn: ({ equipmentId, role }: { equipmentId: string; role: LabelRole | null }) =>
      setEquipmentLabelRole(companyId, equipmentId, role),
    onSettled: () => queryClient.invalidateQueries({ queryKey: equipmentKeys.list(companyId) }),
  })

  const remove = useMutation({
    mutationFn: () => deleteCase(id),
    onSuccess: async () => {
      // Zmazanie case vyprázdni case_id na technike, preto aj zoznam techniky.
      await queryClient.invalidateQueries({ queryKey: caseKeys.list(companyId) })
      await queryClient.invalidateQueries({ queryKey: equipmentKeys.list(companyId) })
      navigate('/cases', { replace: true })
    },
  })

  const back = (
    <Link to="/cases" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      Cases
    </Link>
  )

  if (cases.isPending) return <LoadingBlock />
  if (cases.isError) return <ErrorBlock message="Case sa nepodarilo načítať." onRetry={() => void cases.refetch()} />
  const current = cases.data.find((c) => c.id === id)
  if (!current) {
    return (
      <>
        {back}
        <ErrorBlock message="Tento case neexistuje alebo k nemu nemáte prístup." />
      </>
    )
  }

  const all = equipment.data ?? []
  const content = all.filter((item) => item.caseId === id)
  const onLabelCount = content.filter((item) => item.labelRole).length
  const inOtherCases = all.filter((item) => item.caseId && item.caseId !== id && item.status !== 'retired').length
  const candidates = filterEquipment(
    all.filter((item) => item.caseId !== id && item.status !== 'retired' && (fromOtherCases || !item.caseId)),
    { search, status: '', categoryId: '', locationId: '', caseId: '' },
  )
  const spot = warehouse.data?.spots.find((item) => item.id === current.spotId)
  const caseName = (caseId: string | null) => {
    const box = cases.data.find((c) => c.id === caseId)
    return box ? caseTitle(box) : ''
  }
  const info = [
    kindLabel(current),
    current.inventoryNumber,
    current.oldNumbers && `staré č. ${current.oldNumbers}`,
    locations.find((l) => l.id === current.locationId)?.name,
    formatDimensions(current),
    formatWeight(current.weightKg),
  ].filter(Boolean)

  return (
    <>
      {back}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{caseTitle(current)}</h1>
          {info.length > 0 && <p className="mt-1 text-sm text-muted-foreground">{info.join(' · ')}</p>}
          <OwnerLink companyId={companyId} staffId={current.ownerStaffId} className="mt-1" />
          <ResponsibleFor companyId={companyId} caseId={id} kinds={[...new Set(all.filter((item) => item.caseId === id).map((item) => item.kind))]} className="mt-1" />
          {spot && (
            <Link to={`/warehouse?spot=${spot.id}`} className="mt-1 inline-flex items-center gap-1 text-sm text-accent hover:underline">
              <MapPin className="size-4" aria-hidden />
              V sklade: {describeSpot(spot, current.spotLevel)}
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton to={`/cases/${id}/label`} variant="outline" size="sm">
            <Tag className="size-4" aria-hidden />
            Štítok
          </LinkButton>
          <LinkButton to={`/qr/cases?ids=${id}`} variant="outline" size="sm">
            <QrCode className="size-4" aria-hidden />
            QR štítok
          </LinkButton>
          <LinkButton to={`/cases/${id}/content`} variant="outline" size="sm">
            <ClipboardList className="size-4" aria-hidden />
            Obsah A4
          </LinkButton>
          {canEdit && (
            <LinkButton to={`/cases/${id}/edit`} variant="outline" size="sm">
              <Pencil className="size-4" aria-hidden />
              Upraviť
            </LinkButton>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" disabled={duplicate.isPending} onClick={() => duplicate.mutate()}>
              <Copy className="size-4" aria-hidden />
              {duplicate.isPending ? 'Kopírujem…' : 'Duplikovať'}
            </Button>
          )}
          {can(company, 'cases.delete') && (
            <Button
              variant="destructive"
              size="sm"
              disabled={remove.isPending}
              onClick={() => {
                const message = `Presunúť case „${current.name}“ do koša? Technika v ňom ostane v evidencii bez case. Admin case 30 dní vie obnoviť aj s obsahom.`
                if (window.confirm(message)) remove.mutate()
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              Odstrániť
            </Button>
          )}
        </div>
      </header>

      {(remove.isError || move.isError || mark.isError) && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          Zmena sa nepodarila. Skúste to znova.
        </p>
      )}

      {current.note && <p className="mb-6 rounded-xl border bg-surface p-4 whitespace-pre-wrap">{current.note}</p>}

      <div className="mb-6">
        <CasePhoto companyId={companyId} caseId={id} name={current.name} photoPath={current.photoPath} canEdit={canEdit} />
      </div>

      <CaseChecks companyId={companyId} caseId={id} canCheck={can(company, 'cases.check') || canEdit} />

      <div className="mb-6">
        <UsageHistory
          companyId={companyId}
          equipmentIds={(equipment.data ?? []).filter((item) => item.caseId === id).map((item) => item.id)}
          caseId={id}
        />
      </div>

      <section aria-labelledby="content-heading">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 id="content-heading" className="text-sm font-medium text-muted-foreground">
            Obsah ({content.length}){onLabelCount > 0 && ` · na štítku ${onLabelCount}`}
            {canEdit && content.length > 0 && (
              <span className="mt-1 block font-normal">
                Hviezdička = hlavný prvok štítku (jeden, s fotkou), plus = vedľajší prvok.
              </span>
            )}
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
          <ErrorBlock message="Obsah sa nepodarilo načítať." onRetry={() => void equipment.refetch()} />
        ) : content.length === 0 ? (
          <div role="status" className="flex flex-col items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 px-6 py-8 text-center text-sm">
            <p>
              <strong>{current.kind === 'rack' ? 'Rack je prázdny' : 'Case je prázdny'}</strong> – zatiaľ v ňom nie je žiadna technika.
            </p>
            {canEdit && !adding && (
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus className="size-4" aria-hidden />
                Pridať techniku
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
            {content.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <PhotoThumb url={thumbs[item.photoPath]} />
                <Link to={`/equipment/${item.id}`} className="min-w-0 flex-1 hover:underline">
                  <span className="block truncate font-medium">
                    {item.name}
                    {item.quantity > 1 && <span className="font-normal text-muted-foreground"> · {item.quantity} ks</span>}
                    {item.trackUnits && <span className="font-normal text-muted-foreground"> · {unitIdsOf(item).map((unit) => `#${unit}`).join(', ')}</span>}
                  </span>
                  {item.inventoryNumber && (
                    <span className="block truncate text-sm text-muted-foreground">inv. č. {item.inventoryNumber}</span>
                  )}
                </Link>
                <StatusBadge status={item.status} />
                {canEdit ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-pressed={item.labelRole === 'main'}
                      aria-label={`Hlavný prvok štítku: ${item.name}`}
                      title={item.labelRole === 'main' ? 'Hlavný prvok štítku — kliknutím zrušiť' : 'Nastaviť ako hlavný prvok štítku'}
                      disabled={mark.isPending}
                      onClick={() => mark.mutate({ equipmentId: item.id, role: item.labelRole === 'main' ? null : 'main' })}
                    >
                      <Star
                        className={cn('size-4', item.labelRole === 'main' ? 'fill-accent text-accent' : 'text-muted-foreground')}
                        aria-hidden
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-pressed={item.labelRole === 'secondary'}
                      aria-label={`Vedľajší prvok štítku: ${item.name}`}
                      title={item.labelRole === 'secondary' ? 'Vedľajší prvok štítku — kliknutím zrušiť' : 'Pridať na štítok ako vedľajší prvok'}
                      disabled={mark.isPending}
                      onClick={() => mark.mutate({ equipmentId: item.id, role: item.labelRole === 'secondary' ? null : 'secondary' })}
                    >
                      <CirclePlus
                        className={cn('size-4', item.labelRole === 'secondary' ? 'text-accent' : 'text-muted-foreground')}
                        aria-hidden
                      />
                    </Button>
                  </>
                ) : (
                  item.labelRole && (
                    <span className="text-xs text-muted-foreground">{item.labelRole === 'main' ? 'hlavný' : 'vedľajší'}</span>
                  )
                )}
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Vybrať z case: ${item.name}`}
                    disabled={move.isPending}
                    onClick={() => move.mutate({ equipmentId: item.id, caseId: null })}
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {adding && (
        <section aria-labelledby="add-heading" className="mt-6 rounded-xl border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="add-heading" className="font-medium">
              Pridať techniku do case
            </h2>
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
          {inOtherCases > 0 && (
            <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" className="size-4" checked={fromOtherCases} onChange={(e) => setFromOtherCases(e.target.checked)} />
              Aj technika, ktorá už je v inom case (presunúť sem)
            </label>
          )}
          {candidates.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{fromOtherCases ? 'Žiadna ďalšia technika.' : 'Všetka technika už je v cases.'}</p>
          ) : (
            <ul className="mt-3 divide-y">
              {candidates.slice(0, PICKER_LIMIT).map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {[
                        item.inventoryNumber && `inv. č. ${item.inventoryNumber}`,
                        item.trackUnits && item.unitIds.length > 0 && item.unitIds.length <= 16 && item.unitIds.map((unit) => `#${unit}`).join(', '),
                        item.caseId && `teraz v: ${caseName(item.caseId)}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <AddToCase
                    quantity={item.quantity}
                    units={unitIdsOf(item)}
                    label={item.caseId ? 'Presunúť' : 'Pridať'}
                    disabled={move.isPending}
                    onAdd={(count) => move.mutate({ equipmentId: item.id, caseId: id, count: count < item.quantity ? count : undefined })}
                    onAddUnits={(units) => move.mutate({ equipmentId: item.id, caseId: id, units })}
                  />
                </li>
              ))}
            </ul>
          )}
          {candidates.length > PICKER_LIMIT && (
            <p className="mt-3 text-sm text-muted-foreground">
              Zobrazených prvých {PICKER_LIMIT} z {candidates.length}. Spresnite hľadanie.
            </p>
          )}
        </section>
      )}
    </>
  )
}

type AddProps = { quantity: number; units: number[]; label: string; disabled: boolean; onAdd: (count: number) => void; onAddUnits: (units: number[]) => void }

/** Tlačidlo Pridať; pri viacerých kusoch počet, koľko z nich ide do case, alebo presné čísla kusov (#7, #8). */
function AddToCase({ quantity, units, label, disabled, onAdd, onAddUnits }: AddProps) {
  const [count, setCount] = useState(quantity)
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<number[]>([])
  if (picking) {
    return (
      <span className="flex max-w-xs flex-col items-end gap-1.5">
        <span className="flex flex-wrap justify-end gap-1" role="group" aria-label="Čísla kusov">
          {units.map((unit) => {
            const on = picked.includes(unit)
            return (
              <button
                key={unit}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked(on ? picked.filter((value) => value !== unit) : [...picked, unit].sort((a, b) => a - b))}
                className={on ? 'h-8 min-w-9 rounded-md bg-primary px-2 text-sm font-medium text-primary-foreground' : 'h-8 min-w-9 rounded-md border px-2 text-sm hover:bg-muted'}
              >
                #{unit}
              </button>
            )
          })}
        </span>
        <span className="flex gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => (setPicking(false), setPicked([]))}>
            Späť
          </Button>
          <Button variant="outline" size="sm" disabled={disabled || picked.length === 0} onClick={() => onAddUnits(picked)}>
            {label} {picked.length > 0 && `(${picked.map((unit) => `#${unit}`).join(', ')})`}
          </Button>
        </span>
      </span>
    )
  }
  return (
    <span className="flex flex-wrap items-center justify-end gap-1.5">
      {quantity > 1 && (
        <button type="button" className="text-sm text-accent hover:underline" onClick={() => setPicking(true)}>
          Vybrať čísla
        </button>
      )}
      {quantity > 1 && (
        <label className="flex items-center gap-1 text-sm text-muted-foreground">
          <input
            type="number"
            min={1}
            max={quantity}
            value={count}
            aria-label="Koľko kusov dať do case"
            onChange={(event) => setCount(Math.min(quantity, Math.max(1, Math.trunc(Number(event.target.value)) || 1)))}
            className="h-9 w-16 rounded-lg border bg-background px-2 text-right text-foreground"
          />
          / {quantity} ks
        </label>
      )}
      <Button variant="outline" size="sm" disabled={disabled} onClick={() => onAdd(count)}>
        {label}
      </Button>
    </span>
  )
}
