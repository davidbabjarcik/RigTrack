import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, QrCode, ScanLine, Search, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { RectEditor } from '@/components/plan/RectEditor'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { caseKeys } from '@/features/cases/api'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { useEquipmentLookups } from '@/features/equipment/useEquipmentLookups'
import { LiveScanner } from '@/features/scan/LiveScanner'
import { parseQr } from '@/features/scan/qr'
import { caseTitle } from '@/features/cases/model'
import { can } from '@/lib/permissions'
import { addSpot, deleteSpot, fetchWarehouse, placeCase, saveWarehouse, updateSpot, warehouseKeys } from './api'
import {
  byLevel,
  casesBySpot,
  describeSpot,
  findCases,
  metres,
  nextSpotName,
  SPOT_KIND_FILLS,
  SPOT_KIND_LABELS,
  SPOT_KINDS,
  type Spot,
  type SpotKind,
  type Warehouse,
} from './model'
import { WarehousePlan } from './WarehousePlan'
import { DevNotice } from '@/components/feedback/DevNotice'

function SizeForm({ companyId, current, onDone }: { companyId: string; current: Warehouse | null; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [length, setLength] = useState(current ? String(current.lengthCm / 100) : '')
  const [width, setWidth] = useState(current ? String(current.widthCm / 100) : '')
  const save = useMutation({
    mutationFn: (size: Warehouse) => saveWarehouse(companyId, size),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: warehouseKeys.plan(companyId) })
      onDone()
    },
  })
  const toCm = (value: string) => Math.round(Number(value.replace(',', '.')) * 100)
  const valid = [length, width].every((value) => toCm(value) >= 100 && toCm(value) <= 100000)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (valid) save.mutate({ lengthCm: toCm(length), widthCm: toCm(width) })
  }

  return (
    <form onSubmit={submit} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border bg-surface p-4">
      <Field label="Dĺžka skladu (m)" inputMode="decimal" className="w-40" value={length} onChange={(e) => setLength(e.target.value)} />
      <Field label="Šírka skladu (m)" inputMode="decimal" className="w-40" value={width} onChange={(e) => setWidth(e.target.value)} />
      <Button type="submit" disabled={!valid || save.isPending}>
        {save.isPending ? 'Ukladám…' : 'Uložiť rozmery'}
      </Button>
      <p className="basis-full text-sm text-muted-foreground">
        Stačí približne – plán je pomôcka na orientáciu. Dĺžka je na pláne vodorovne, šírka zvislo; najmenej 1 m.
      </p>
      {save.isError && (
        <p role="alert" className="basis-full text-sm text-destructive">
          Rozmery sa nepodarilo uložiť.
        </p>
      )}
    </form>
  )
}

export function WarehousePage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const canPlan = can(company, 'lookups.manage')
  const canPlace = can(company, 'cases.edit')
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState(false)
  const [search, setSearch] = useState('')
  const [addCaseId, setAddCaseId] = useState('')
  const [addLevel, setAddLevel] = useState(1)
  // Skenovanie: „find“ ukáže, kde case / technika leží; „place“ ukladá naskenované cases na vybrané miesto.
  const [scanning, setScanning] = useState<'find' | 'place' | null>(null)
  const [found, setFound] = useState<{ text: string; to?: string } | null>(null)

  const plan = useQuery({ queryKey: warehouseKeys.plan(companyId), queryFn: () => fetchWarehouse(companyId) })
  const cases = useCases(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: can(company, 'equipment.view') })
  const { locations } = useEquipmentLookups(companyId)

  const refreshPlan = () => queryClient.invalidateQueries({ queryKey: warehouseKeys.plan(companyId) })
  // Zmazanie miesta vyprázdni miesto na cases, preto aj ich zoznam.
  const refreshAll = () => Promise.all([refreshPlan(), queryClient.invalidateQueries({ queryKey: caseKeys.list(companyId) })])
  const add = useMutation({ mutationFn: (spot: Omit<Spot, 'id'>) => addSpot(companyId, spot), onSettled: refreshPlan })
  const change = useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: Partial<Omit<Spot, 'id'>> }) => updateSpot(companyId, id, fields),
    onSettled: refreshPlan,
  })
  const remove = useMutation({ mutationFn: (id: string) => deleteSpot(companyId, id), onSettled: refreshAll })
  const place = useMutation({
    mutationFn: ({ caseId, spotId, level }: { caseId: string; spotId: string | null; level: number | null }) =>
      placeCase(companyId, caseId, spotId, level),
    onSettled: refreshAll,
  })
  const mutations = [add, change, remove, place]

  if (plan.isPending || cases.isPending) return <LoadingBlock />
  if (plan.isError || cases.isError) {
    return <ErrorBlock message="Plán skladu sa nepodarilo načítať." onRetry={() => void Promise.all([plan.refetch(), cases.refetch()])} />
  }

  const { warehouse, spots } = plan.data
  const selectedId = spots.some((spot) => spot.id === params.get('spot')) ? params.get('spot') : null
  const select = (id: string | null) => setParams(id ? { spot: id } : {}, { replace: true })
  const selected = spots.find((spot) => spot.id === selectedId)
  const bySpot = casesBySpot(cases.data)
  const unplaced = cases.data.filter((item) => !item.spotId || !spots.some((spot) => spot.id === item.spotId))
  const hits = findCases(cases.data, search)
  const spotOf = (id: string | null) => spots.find((spot) => spot.id === id)
  const where = (item: { spotId: string | null; spotLevel: number | null }) => {
    const spot = spotOf(item.spotId)
    return spot ? describeSpot(spot, item.spotLevel) : 'nemá miesto v sklade'
  }

  /** Naskenovaný štítok: ukáže, kde leží (case, technika v case, miesto), alebo ho uloží na vybrané miesto. */
  const onScan = (text: string): string | void => {
    const target = parseQr(text)
    if (!target) return 'Tento QR kód nie je z RigTracku.'
    if (scanning === 'place' && selected) {
      if (target.kind !== 'case') return 'Na miesto sa ukladajú cases – naskenujte štítok case.'
      const item = cases.data.find((candidate) => candidate.id === target.id)
      if (!item) return '✗ Tento case v evidencii nie je.'
      if (item.spotId === selected.id) return `✓ ${item.name} už tu je.`
      const level = selected.levels > 1 ? Math.min(addLevel, selected.levels) : null
      place.mutate({ caseId: item.id, spotId: selected.id, level })
      return `✓ ${item.name} → ${describeSpot(selected, level)}`
    }
    setScanning(null)
    setSearch('')
    if (target.kind === 'spot') {
      const spot = spotOf(target.id)
      setFound(spot ? null : { text: 'Toto miesto už v pláne skladu nie je.' })
      if (spot) select(spot.id)
      return
    }
    if (target.kind === 'case') {
      const item = cases.data.find((candidate) => candidate.id === target.id)
      if (!item) return void setFound({ text: 'Tento case v evidencii nie je.' })
      if (item.spotId) select(item.spotId)
      return void setFound({ text: `${item.name}: ${where(item)}`, to: `/cases/${item.id}` })
    }
    const piece = equipment.data?.find((candidate) => candidate.id === target.id)
    if (!piece) return void setFound({ text: 'Táto technika v evidencii nie je.' })
    const inCase = cases.data.find((candidate) => candidate.id === piece.caseId)
    if (inCase) {
      if (inCase.spotId) select(inCase.spotId)
      return void setFound({ text: `${piece.name} je v case ${caseTitle(inCase)}: ${where(inCase)}`, to: `/equipment/${piece.id}` })
    }
    const location = locations.find((candidate) => candidate.id === piece.locationId)?.name
    setFound({ text: `${piece.name} nie je v žiadnom case${location ? ` – umiestnenie: ${location}` : ''}.`, to: `/equipment/${piece.id}` })
  }

  return (
    <>
      <PageHeader
        title="Sklad"
        description={warehouse ? `Plán ${metres(warehouse.lengthCm)} × ${metres(warehouse.widthCm)}, pohľad zhora` : 'Kde ktorý case leží'}
        action={
          warehouse && (
            <div className="flex flex-wrap gap-2">
              {!editing && (
                <Button variant="outline" onClick={() => setScanning('find')}>
                  <ScanLine className="size-4" aria-hidden />
                  Skenovať
                </Button>
              )}
              {canPlan && spots.length > 0 && (
                <LinkButton to="/qr/spots" variant="outline">
                  <QrCode className="size-4" aria-hidden />
                  QR štítky miest
                </LinkButton>
              )}
              {canPlan && (
                <Button variant="outline" onClick={() => setEditing(!editing)}>
                  {editing ? <Check className="size-4" aria-hidden /> : <Pencil className="size-4" aria-hidden />}
                  {editing ? 'Hotovo' : 'Upraviť plán'}
                </Button>
              )}
            </div>
          )
        }
      />
      <DevNotice className="mb-4" />
      {scanning && (
        <LiveScanner
          title={scanning === 'place' && selected ? `Uložiť na ${selected.name}` : 'Kde to je?'}
          onClose={() => setScanning(null)}
          onResult={onScan}
        />
      )}
      {found && (
        <p role="status" className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
          <span>
            {found.text}
            {found.to && (
              <>
                {' '}
                <Link to={found.to} className="font-medium text-accent hover:underline">
                  Detail
                </Link>
              </>
            )}
          </span>
          <button type="button" aria-label="Zavrieť" className="text-muted-foreground hover:text-foreground" onClick={() => setFound(null)}>
            <X className="size-4" aria-hidden />
          </button>
        </p>
      )}

      {!warehouse &&
        (canPlan ? (
          <SizeForm companyId={companyId} current={null} onDone={() => setEditing(true)} />
        ) : (
          <p className="rounded-xl border border-dashed bg-surface px-6 py-16 text-center text-sm text-muted-foreground">
            Plán skladu ešte nikto nenakreslil.
          </p>
        ))}

      {warehouse && editing && (
        <>
          <SizeForm key={`${warehouse.lengthCm}x${warehouse.widthCm}`} companyId={companyId} current={warehouse} onDone={() => {}} />
          <RectEditor
            length={warehouse.lengthCm}
            width={warehouse.widthCm}
            rects={spots}
            snap={10}
            grid={100}
            selected={selected ? spots.indexOf(selected) : null}
            onSelect={(index) => select(index === null ? null : (spots[index]?.id ?? null))}
            onChange={(index, rect) => change.mutate({ id: spots[index].id, fields: rect })}
            onAdd={(rect) => add.mutate({ name: nextSpotName(spots), kind: 'rack', levels: 1, ...rect })}
            fillOf={(index) => SPOT_KIND_FILLS[spots[index].kind]}
            labelOf={(index) => spots[index].name}
            describe={(rect) => `${metres(rect.length)} × ${metres(rect.width)} · ${metres(rect.x)} zľava, ${metres(rect.y)} zhora`}
            ariaLabel="Editor plánu skladu"
            className="max-h-[70dvh]"
            footer={
              <span className="text-muted-foreground">
                Ťahaním po prázdnom mieste nakreslíte regál, paletu alebo zónu. Kliknutím miesto vyberiete, ťahaním posuniete, za roh zmeníte
                veľkosť. Mriežka má štvorce po 1 m.
              </span>
            }
          />
          {selected && (
            <div key={selected.id} className="mt-3 grid items-end gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-4">
              <Field
                label="Názov miesta"
                defaultValue={selected.name}
                maxLength={60}
                onBlur={(event) => {
                  const name = event.target.value.trim()
                  if (name && name !== selected.name) change.mutate({ id: selected.id, fields: { name } })
                  else event.target.value = selected.name
                }}
              />
              <SelectField
                label="Druh"
                value={selected.kind}
                onChange={(event) => {
                  const kind = event.target.value as SpotKind
                  change.mutate({ id: selected.id, fields: { kind, ...(kind !== 'rack' && { levels: 1 }) } })
                }}
              >
                {SPOT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {SPOT_KIND_LABELS[kind]}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Poschodia"
                value={selected.levels}
                disabled={selected.kind !== 'rack'}
                onChange={(event) => change.mutate({ id: selected.id, fields: { levels: Number(event.target.value) } })}
              >
                {Array.from({ length: 10 }, (_, index) => index + 1).map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </SelectField>
              <Button
                variant="destructive"
                disabled={remove.isPending}
                onClick={() => {
                  const count = bySpot.get(selected.id)?.length ?? 0
                  const warning = count > 0 ? ` Cases, ktoré na ňom ležia (${count}), ostanú bez miesta.` : ''
                  if (window.confirm(`Odstrániť miesto „${selected.name}“?${warning}`)) remove.mutate(selected.id)
                }}
              >
                <Trash2 className="size-4" aria-hidden />
                Odstrániť miesto
              </Button>
            </div>
          )}
        </>
      )}

      {warehouse && !editing && (
        <>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" aria-hidden />
            <Field
              label="Nájsť case"
              hideLabel
              type="search"
              placeholder="Nájsť case – názov alebo číslo (aj staré)"
              className="[&_input]:pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search.trim() !== '' && (
            <ul className="mb-3 divide-y overflow-hidden rounded-xl border bg-surface">
              {hits.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">Taký case v evidencii nie je.</li>}
              {hits.slice(0, 8).map((item) => {
                const spot = spotOf(item.spotId)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={!spot}
                      onClick={() => select(spot!.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-muted disabled:hover:bg-transparent"
                    >
                      <span className="min-w-0 truncate font-medium">
                        {item.name}
                        {[item.inventoryNumber, item.labelNumber && `č. ${item.labelNumber}`, item.oldNumbers && `staré: ${item.oldNumbers}`].filter(Boolean).length > 0 && (
                          <span className="font-normal text-muted-foreground">
                            {' · '}
                            {[item.inventoryNumber, item.labelNumber && `č. ${item.labelNumber}`, item.oldNumbers && `staré: ${item.oldNumbers}`].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </span>
                      <span className={spot ? 'shrink-0 text-sm text-accent' : 'shrink-0 text-sm text-muted-foreground'}>
                        {spot ? describeSpot(spot, item.spotLevel) : 'nemá miesto'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <WarehousePlan
            warehouse={warehouse}
            spots={spots}
            counts={new Map([...bySpot].map(([id, list]) => [id, list.length]))}
            selectedId={selectedId}
            highlighted={new Set(hits.map((item) => item.spotId).filter((id): id is string => id !== null))}
            onSelect={select}
          />
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Legenda">
            {SPOT_KINDS.map((kind) => (
              <li key={kind} className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm" style={{ backgroundColor: SPOT_KIND_FILLS[kind] }} />
                {SPOT_KIND_LABELS[kind]}
              </li>
            ))}
            <li className="text-muted-foreground">štvorec mriežky = 1 m</li>
          </ul>

          {spots.length === 0 && (
            <p className="mt-4 rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">
              Plán je zatiaľ prázdny.{canPlan && ' Tlačidlom Upraviť plán doň nakreslíte regály, palety a zóny.'}
            </p>
          )}

          {selected && (
            <section aria-labelledby="spot-heading" className="mt-5 rounded-xl border bg-surface p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="spot-heading" className="truncate text-lg font-semibold">
                    {selected.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {SPOT_KIND_LABELS[selected.kind]} · {metres(selected.length)} × {metres(selected.width)}
                    {selected.levels > 1 && ` · poschodí: ${selected.levels}`}
                  </p>
                </div>
                <Button variant="ghost" size="sm" aria-label="Zavrieť" onClick={() => select(null)}>
                  <X className="size-4" aria-hidden />
                </Button>
              </div>

              {(bySpot.get(selected.id)?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Na tomto mieste zatiaľ nič neleží.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {byLevel(selected, bySpot.get(selected.id) ?? []).map((group) => (
                    <div key={group.level ?? 'none'}>
                      {(selected.levels > 1 || group.level === null) && (
                        <h3 className="mb-1 text-sm font-medium text-muted-foreground">
                          {group.level ? `${group.level}. poschodie` : selected.levels > 1 ? 'Bez poschodia' : ''}
                        </h3>
                      )}
                      {group.cases.length === 0 ? (
                        <p className="text-sm text-muted-foreground">prázdne</p>
                      ) : (
                        <ul className="divide-y rounded-lg border">
                          {group.cases.map((item) => (
                            <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
                              <Link to={`/cases/${item.id}`} className="min-w-0 truncate font-medium hover:underline">
                                {item.name}
                              </Link>
                              {canPlace && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label={`Vybrať z miesta: ${item.name}`}
                                  disabled={place.isPending}
                                  onClick={() => place.mutate({ caseId: item.id, spotId: null, level: null })}
                                >
                                  <X className="size-4" aria-hidden />
                                </Button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {canPlace && (
                <form
                  className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (!addCaseId) return
                    place.mutate({ caseId: addCaseId, spotId: selected.id, level: selected.levels > 1 ? Math.min(addLevel, selected.levels) : null })
                    setAddCaseId('')
                  }}
                >
                  <SelectField label="Uložiť sem case" className="min-w-56 flex-1" value={addCaseId} onChange={(e) => setAddCaseId(e.target.value)}>
                    <option value="">— vyberte case —</option>
                    {cases.data
                      .filter((item) => item.spotId !== selected.id)
                      .map((item) => {
                        const from = spotOf(item.spotId)
                        return (
                          <option key={item.id} value={item.id}>
                            {item.name}
                            {from ? ` (teraz: ${from.name})` : ''}
                          </option>
                        )
                      })}
                  </SelectField>
                  {selected.levels > 1 && (
                    <SelectField label="Poschodie" className="w-28" value={Math.min(addLevel, selected.levels)} onChange={(e) => setAddLevel(Number(e.target.value))}>
                      {Array.from({ length: selected.levels }, (_, index) => index + 1).map((level) => (
                        <option key={level} value={level}>
                          {level}.
                        </option>
                      ))}
                    </SelectField>
                  )}
                  <Button type="submit" disabled={!addCaseId || place.isPending}>
                    Uložiť sem
                  </Button>
                  <Button variant="outline" onClick={() => setScanning('place')}>
                    <ScanLine className="size-4" aria-hidden />
                    Uložiť sem skenovaním
                  </Button>
                </form>
              )}
            </section>
          )}

          {unplaced.length > 0 && (
            <section className="mt-5" aria-labelledby="unplaced-heading">
              <h2 id="unplaced-heading" className="mb-2 text-sm font-medium text-muted-foreground">
                Cases bez miesta ({unplaced.length})
              </h2>
              <p className="rounded-xl border bg-surface p-4 text-sm">
                {unplaced.map((item, index) => (
                  <span key={item.id}>
                    {index > 0 && ', '}
                    <Link to={`/cases/${item.id}`} className="hover:underline">
                      {item.name}
                    </Link>
                  </span>
                ))}
              </p>
            </section>
          )}
        </>
      )}

      {mutations.some((mutation) => mutation.isError) && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          Zmenu sa nepodarilo uložiť.
        </p>
      )}
    </>
  )
}
