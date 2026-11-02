import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, LayoutGrid, Pencil, QrCode, RotateCw, ScanLine, Search, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
import { cn } from '@/lib/utils'
import { addSpot, deleteSpot, fetchCaseBays, fetchWarehouse, placeCase, setCasePallet, setCaseSize, updateSpot, warehouseKeys } from './api'
import { CellCases } from './CellCases'
import { BaysEditor } from './BaysEditor'
import { RackFront, type RackCell } from './RackFront'
import {
  byLevel,
  casesBySpot,
  casesInCell,
  cellUsage,
  layoutCell,
  describeSpot,
  findCases,
  isStructure,
  levelUsage,
  metres,
  PALLET_COLORS,
  palletName,
  palletTypesOf,
  wallItemRect,
  rackLengthCm,
  rotated,
  rackBays,
  SPOT_KIND_FILLS,
  SPOT_KIND_LABELS,
  SPOT_KINDS,
  type RackBay,
  type Spot,
} from './model'
import { WarehousePlan } from './WarehousePlan'
import { DevNotice } from '@/components/feedback/DevNotice'
import { PlanAddBar } from './PlanAddBar'
import { buildSpot, DEFAULT_ADD, type AddSelection } from './planAdd'
import { SizeForm } from './SizeForm'

export function WarehousePage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const canPlan = can(company, 'warehouse.manage')
  const canPlace = can(company, 'cases.edit')
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  // ?edit=1 (z Nastavení → Sklad) otvorí rovno úpravu plánu.
  const [editing, setEditing] = useState(() => params.get('edit') === '1')
  const [search, setSearch] = useState('')
  const [addSelection, setAddSelection] = useState<AddSelection>(DEFAULT_ADD)
  const [addCaseId, setAddCaseId] = useState('')
  const [addLevel, setAddLevel] = useState(1)
  // Skenovanie: „find“ ukáže, kde case / technika leží; „place“ ukladá naskenované cases na vybrané miesto.
  const [scanning, setScanning] = useState<'find' | 'place' | null>(null)
  const [found, setFound] = useState<{ text: string; to?: string } | null>(null)
  // Pohľad spredu na regál: vybraná polica (pole, polica zdola) a úprava polí.
  const [cell, setCell] = useState<RackCell | null>(null)
  const [editingBays, setEditingBays] = useState(false)

  const plan = useQuery({ queryKey: warehouseKeys.plan(companyId), queryFn: () => fetchWarehouse(companyId) })
  const casesQuery = useCases(companyId)
  const caseBays = useQuery({ queryKey: warehouseKeys.bays(companyId), queryFn: () => fetchCaseBays(companyId) })
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
    mutationFn: ({ caseId, spotId, level, bay = null, pallet = null }: { caseId: string; spotId: string | null; level: number | null; bay?: number | null; pallet?: number | null }) =>
      placeCase(companyId, caseId, spotId, level, bay, pallet),
    onSettled: refreshAll,
  })
  const movePallet = useMutation({ mutationFn: ({ caseId, pallet }: { caseId: string; pallet: number | null }) => setCasePallet(companyId, caseId, pallet), onSettled: refreshAll })
  const resize = useMutation({
    mutationFn: ({ caseId, size }: { caseId: string; size: Parameters<typeof setCaseSize>[2] }) => setCaseSize(companyId, caseId, size),
    onSettled: refreshAll,
  })
  const mutations = [add, change, remove, place, movePallet, resize]

  if (plan.isPending || casesQuery.isPending) return <LoadingBlock />
  if (plan.isError || casesQuery.isError) {
    return <ErrorBlock message="Plán skladu sa nepodarilo načítať." onRetry={() => void Promise.all([plan.refetch(), casesQuery.refetch()])} />
  }
  // Pole regála, v ktorom case leží (0124).
  const cases = {
    data: casesQuery.data.map((item) => ({ ...item, spotBay: caseBays.data?.get(item.id)?.bay ?? null, spotPallet: caseBays.data?.get(item.id)?.pallet ?? null })),
  }

  const { warehouse, spots } = plan.data
  const selectedId = spots.some((spot) => spot.id === params.get('spot')) ? params.get('spot') : null
  const selected = spots.find((spot) => spot.id === selectedId)
  // V editore sú miestnosti vespod, aby sa dalo chytiť, čo je v nich.
  const editorSpots = [...spots.filter((spot) => spot.kind === 'room'), ...spots.filter((spot) => spot.kind !== 'room')]
  // Klik na regál prepne na pohľad spredu; ostatné miesta sa len vyberú.
  const select = (id: string | null) => {
    const spot = spots.find((item) => item.id === id)
    // Hliník: klik otvorí stohy trussov.
    if (spot?.kind === 'truss' && !editing) return void navigate('/warehouse/truss')
    setCell(null)
    setEditingBays(false)
    setParams(id ? { spot: id, ...(spot?.kind === 'rack' && !editing ? { view: 'front' } : {}) } : {}, { replace: true })
  }
  const front = !editing && selected?.kind === 'rack' && params.get('view') === 'front'
  const bays: RackBay[] = selected?.kind === 'rack' ? rackBays(selected) : []
  const multiBay = bays.length > 1 || (selected?.bays?.length ?? 0) > 0
  const backToPlan = () => {
    setCell(null)
    setEditingBays(false)
    setParams(selected ? { spot: selected.id } : {}, { replace: true })
  }
  const bySpot = casesBySpot(cases.data)
  const unplaced = cases.data.filter((item) => !item.spotId || !spots.some((spot) => spot.id === item.spotId))
  const hits = findCases(cases.data, search)
  const spotOf = (id: string | null) => spots.find((spot) => spot.id === id)
  const where = (item: { spotId: string | null; spotLevel: number | null; spotBay?: number | null }) => {
    const spot = spotOf(item.spotId)
    return spot ? describeSpot(spot, item.spotLevel, item.spotBay) : 'nemá miesto v sklade'
  }
  // Kam uložiť: pri regáli s poliami vybraná polica (a paleta), inak poschodie z výberu.
  const placeTarget = (spot: Spot) =>
    spot.kind === 'rack' && multiBay && cell
      ? { level: cell.level, bay: cell.bay, pallet: cell.pallet ?? null }
      : { level: spot.levels > 1 ? Math.min(addLevel, spot.levels) : null, bay: null, pallet: null }
  const cellLevel = cell ? bays[cell.bay - 1]?.levels[cell.level - 1] : undefined

  /** Naskenovaný štítok: ukáže, kde leží (case, technika v case, miesto), alebo ho uloží na vybrané miesto. */
  const onScan = (text: string): string | void => {
    const target = parseQr(text)
    if (!target) return 'Tento QR kód nie je z RigTracku.'
    if (scanning === 'place' && selected) {
      if (target.kind !== 'case') return 'Na miesto sa ukladajú cases – naskenujte štítok case.'
      const item = cases.data.find((candidate) => candidate.id === target.id)
      if (!item) return '✗ Tento case v evidencii nie je.'
      if (item.spotId === selected.id) return `✓ ${item.name} už tu je.`
      const into = placeTarget(selected)
      place.mutate({ caseId: item.id, spotId: selected.id, ...into })
      return `✓ ${item.name} → ${describeSpot(selected, into.level, into.bay)}${into.pallet ? `, paleta ${into.pallet}` : ''}`
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
      return void setFound({ text: `${item.name}: ${where(cases.data.find((candidate) => candidate.id === item.id)!)}`, to: `/cases/${item.id}` })
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
          <PlanAddBar warehouse={warehouse} spots={spots} busy={add.isPending} selection={addSelection} onSelection={setAddSelection} onAdd={(spot) => add.mutate(spot)} />
          <RectEditor
            length={warehouse.lengthCm}
            width={warehouse.widthCm}
            rects={editorSpots}
            snap={10}
            grid={100}
            selected={selected ? editorSpots.indexOf(selected) : null}
            onSelect={(index) => select(index === null ? null : (editorSpots[index]?.id ?? null))}
            onChange={(index, rect) => {
              const spot = editorSpots[index]
              // Dvere a okno sa prichytia k stene skladu.
              change.mutate({ id: spot.id, fields: spot.kind === 'door' || spot.kind === 'window' ? wallItemRect(rect, spot, warehouse) : rect })
            }}
            onAdd={(rect) => {
              // Nakreslí sa to, čo je hore vybrané (regál typu, paleta, miesto, okno…).
              const spot = buildSpot(addSelection, warehouse, spots, rect)
              if (spot) add.mutate(spot)
            }}
            fillOf={(index) => (editorSpots[index].kind === 'pallet' ? PALLET_COLORS[editorSpots[index].material ?? 'wood'].fill : SPOT_KIND_FILLS[editorSpots[index].kind])}
            labelOf={(index) => editorSpots[index].name}
            describe={(rect) => `${metres(rect.length)} × ${metres(rect.width)} · ${metres(rect.x)} zľava, ${metres(rect.y)} zhora`}
            ariaLabel="Editor plánu skladu"
            className="max-h-[70dvh]"
            footer={
              <span className="text-muted-foreground">
                Hore vyberte, čo pridať, alebo ťahaním po prázdnom mieste nakreslite regál. Kliknutím miesto vyberiete, ťahaním posuniete, za
                roh zmeníte veľkosť. Mriežka má štvorce po 1 m.
              </span>
            }
          />
          {selected && (
            <div key={selected.id} className="mt-3 grid items-end gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-4">
              <div className="flex flex-wrap gap-2 sm:col-span-4">
                <Button variant="outline" size="sm" disabled={change.isPending} onClick={() => change.mutate({ id: selected.id, fields: rotated(selected, warehouse) })}>
                  <RotateCw className="size-4" aria-hidden />
                  Otočiť o 90°
                </Button>
                {selected.kind === 'pallet' && (
                  <select
                    aria-label="Typ palety"
                    className="h-9 rounded-lg border bg-surface px-2 text-sm"
                    value=""
                    onChange={(event) => {
                      const type = palletTypesOf(warehouse).find((item) => item.id === event.target.value)
                      if (!type) return
                      // Dlhšia strana ostane v smere, v akom paleta leží.
                      const horizontal = selected.length >= selected.width
                      const [long, short] = [Math.max(type.length, type.width), Math.min(type.length, type.width)]
                      change.mutate({ id: selected.id, fields: { material: type.material, ...(horizontal ? { length: long, width: short } : { length: short, width: long }) } })
                    }}
                  >
                    <option value="">{palletName(selected, palletTypesOf(warehouse))} – zmeniť typ…</option>
                    {palletTypesOf(warehouse).map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} ({type.length} × {type.width} cm)
                      </option>
                    ))}
                  </select>
                )}
                {selected.kind === 'rack' && (warehouse.rackTypes ?? []).length > 0 && (
                  <select
                    aria-label="Nastaviť typ regálu"
                    className="h-9 rounded-lg border bg-surface px-2 text-sm"
                    value=""
                    onChange={(event) => {
                      const type = warehouse.rackTypes!.find((item) => item.id === event.target.value)
                      if (!type) return
                      // Dlhšia strana ostane v smere, v akom regál stojí.
                      const length = rackLengthCm(type.bays)
                      const horizontal = selected.length >= selected.width
                      change.mutate({
                        id: selected.id,
                        fields: {
                          bays: type.bays,
                          levels: Math.min(20, Math.max(...type.bays.map((bay) => bay.levels.length))),
                          ...(horizontal ? { length, width: type.depthCm } : { length: type.depthCm, width: length }),
                        },
                      })
                    }}
                  >
                    <option value="">Nastaviť podľa typu…</option>
                    {warehouse.rackTypes!.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
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
              {selected.kind === 'rack' && (selected.bays?.length ?? 0) === 0 && (
                <Field
                  label="Výška poschodia (cm)"
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={1000}
                  placeholder="napr. 120"
                  defaultValue={selected.levelHeightCm ?? ''}
                  onBlur={(event) => {
                    const value = event.target.value.trim() === '' ? null : Math.round(Number(event.target.value))
                    if (value !== (selected.levelHeightCm ?? null) && (value === null || (value >= 5 && value <= 1000))) change.mutate({ id: selected.id, fields: { levelHeightCm: value } })
                  }}
                />
              )}
              <Field
                label="Poznámka"
                className="sm:col-span-2"
                maxLength={300}
                placeholder={isStructure(selected.kind) ? 'napr. nosný stĺp, brána 3 m' : 'napr. ťažké dole, káble hore'}
                defaultValue={selected.note ?? ''}
                onBlur={(event) => {
                  const note = event.target.value.trim()
                  if (note !== (selected.note ?? '')) change.mutate({ id: selected.id, fields: { note } })
                }}
              />
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
                        {spot ? describeSpot(spot, item.spotLevel, item.spotBay) : 'nemá miesto'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Pohľad spredu: na širokej obrazovke regál vľavo, polica alebo úprava polí vpravo. */}
          <div className={front ? 'grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)] lg:items-start' : undefined}>
          {front && selected && (
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={backToPlan}>
                  <ArrowLeft className="size-4" aria-hidden />
                  Pôdorys skladu
                </Button>
                <span className="flex-1 truncate font-medium">{selected.name}</span>
                {canPlan && !editingBays && (
                  <Button variant="outline" size="sm" onClick={() => setEditingBays(true)}>
                    <LayoutGrid className="size-4" aria-hidden />
                    Upraviť polia a police
                  </Button>
                )}
              </div>
              <RackFront
                name={selected.name}
                bays={bays}
                cases={bySpot.get(selected.id) ?? []}
                selected={cell}
                highlighted={new Set(hits.map((item) => item.id))}
                onSelect={setCell}
              />
              <p className="mt-2 text-sm text-muted-foreground">Kliknite na policu alebo paletu – uvidíte, čo na nej je, a môžete tam uložiť case. Bez zvolenej palety sa cases poskladajú na palety samy. Prerušovaná škatuľa = case bez rozmerov.</p>
            </div>
          )}
          {front && selected && editingBays && (
            <BaysEditor
              compact
              bays={bays}
              saving={change.isPending}
              onCancel={() => setEditingBays(false)}
              onSave={(next) =>
                change.mutate(
                  { id: selected.id, fields: { bays: next, levels: Math.min(20, Math.max(...next.map((bay) => bay.levels.length))) } },
                  { onSuccess: () => setEditingBays(false) },
                )
              }
            />
          )}
          {!front && (
          <WarehousePlan
            warehouse={warehouse}
            spots={spots}
            counts={new Map([...bySpot].map(([id, list]) => [id, list.length]))}
            usage={
              new Map(
                spots
                  .filter((spot) => spot.kind === 'rack' && (bySpot.get(spot.id)?.length ?? 0) > 0)
                  .map((spot) => [spot.id, Math.round(levelUsage(spot, bySpot.get(spot.id) ?? []).percent / Math.max(1, spot.levels))]),
              )
            }
            selectedId={selectedId}
            highlighted={new Set(hits.map((item) => item.spotId).filter((id): id is string => id !== null))}
            onSelect={select}
          />
          )}
          {!front && (
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Legenda">
            {SPOT_KINDS.filter((kind) => kind === 'rack' || kind === 'pallet' || kind === 'zone' || spots.some((spot) => spot.kind === kind)).map((kind) => (
              <li key={kind} className="flex items-center gap-1.5">
                <span className={cn('size-3 rounded-sm', kind === 'zone' && 'border border-dashed')} style={{ backgroundColor: kind === 'zone' ? 'transparent' : SPOT_KIND_FILLS[kind], borderColor: SPOT_KIND_FILLS[kind] }} />
                {SPOT_KIND_LABELS[kind]}
              </li>
            ))}
            <li className="text-muted-foreground">pásik pri regáli = obsadenosť · štvorec mriežky = 1 m · klik na regál = pohľad spredu</li>
          </ul>
          )}

          {spots.length === 0 && (
            <p className="mt-4 rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">
              Plán je zatiaľ prázdny.{canPlan && ' Tlačidlom Upraviť plán doň nakreslíte regály, palety a zóny.'}
            </p>
          )}

          {selected && !(front && editingBays) && (
            <section aria-labelledby="spot-heading" className={cn('mt-5 rounded-xl border bg-surface p-4', front && 'lg:mt-0')}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="spot-heading" className="truncate text-lg font-semibold">
                    {selected.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selected.kind === 'pallet'
                      ? `Paleta · ${palletName(selected, palletTypesOf(warehouse))}`
                      : `${SPOT_KIND_LABELS[selected.kind]} · ${metres(selected.length)} × ${metres(selected.width)}`}
                    {selected.levels > 1 && ` · poschodí: ${selected.levels}`}
                    {selected.levelHeightCm && ` · poschodie ${selected.levelHeightCm} cm na výšku`}
                  </p>
                  {selected.note && <p className="mt-1 text-sm">{selected.note}</p>}
                </div>
                <Button variant="ghost" size="sm" aria-label="Zavrieť" onClick={() => select(null)}>
                  <X className="size-4" aria-hidden />
                </Button>
              </div>

              {selected.kind === 'rack' && multiBay ? (
                <div className="flex flex-col gap-3">
                  {bays.flatMap((bay, bayIndex) =>
                    bay.levels
                      .map((level, levelIndex) => ({ bay, level, bayNo: bayIndex + 1, levelNo: levelIndex + 1 }))
                      .reverse()
                      .filter((entry) => !cell || (cell.bay === entry.bayNo && cell.level === entry.levelNo))
                      .filter((entry) => cell || casesInCell(bySpot.get(selected.id) ?? [], entry.bayNo, entry.levelNo).length > 0)
                      .map(({ bay: currentBay, level, bayNo, levelNo }) => {
                        const inside = casesInCell(bySpot.get(selected.id) ?? [], bayNo, levelNo)
                        const usage = cellUsage(currentBay, level, inside)
                        const layout = layoutCell(currentBay, level, inside)
                        const onPallet = cell?.bay === bayNo && cell.level === levelNo ? cell.pallet : null
                        return (
                          <div key={`${bayNo}-${levelNo}`}>
                            <h3 className="mb-1 text-sm font-medium">
                              Pole {bayNo}, {levelNo}. polica{onPallet ? `, paleta ${onPallet}` : ''}{' '}
                              <span className="font-normal text-muted-foreground">· {level.heightCm} cm na výšku · {currentBay.widthCm} cm</span>
                            </h3>
                            <p className={cn('mb-1 text-xs', layout.notFit.length > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                              {layout.notFit.length > 0 ? `nezmestí sa: ${layout.notFit.map((item) => item.name).join(', ')}` : `voľné spredu ${layout.freeCm} cm`}
                              {level.pallets ? ` · ${level.pallets} palety` : ` · zmestia sa ${usage.palletFit} palety + ${usage.palletRest} cm`}
                              {usage.unknown > 0 && ` · ${usage.unknown} bez rozmerov`}
                            </p>
                            <CellCases
                              boxes={layout.boxes}
                              pallets={layout.pallets.length}
                              pallet={onPallet}
                              canEdit={canPlace}
                              busy={place.isPending || movePallet.isPending || resize.isPending}
                              onRemove={(item) => place.mutate({ caseId: item.id, spotId: null, level: null })}
                              onPallet={(item, pallet) => movePallet.mutate({ caseId: item.id, pallet })}
                              onSize={(item, size) => resize.mutate({ caseId: item.id, size })}
                            />
                          </div>
                        )
                      }),
                  )}
                  {!cell && (bySpot.get(selected.id)?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Regál je prázdny. Kliknite na policu v pohľade spredu.</p>}
                </div>
              ) : isStructure(selected.kind) ? (
                <p className="text-sm text-muted-foreground">Stavebný prvok – na pláne len na orientáciu, cases sa naň neukladajú.</p>
              ) : (bySpot.get(selected.id)?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Na tomto mieste zatiaľ nič neleží{selected.kind !== 'zone' && ` – voľných ${metres(Math.sqrt(selected.length * selected.width)).replace(' m', '')} m strany, ${String(Math.round((selected.length * selected.width) / 1000) / 10).replace('.', ',')} m² na poschodie`}.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {byLevel(selected, bySpot.get(selected.id) ?? []).map((group) => (
                    <div key={group.level ?? 'none'}>
                      {(selected.levels > 1 || group.level === null) && (
                        <h3 className="mb-1 text-sm font-medium text-muted-foreground">
                          {group.level ? `${group.level}. poschodie` : selected.levels > 1 ? 'Bez poschodia' : ''}
                        </h3>
                      )}
                      {/* Koľko plochy poschodia zaberajú cases (z ich rozmerov) a čo sa nezmestí na výšku. */}
                      {group.level !== null && group.cases.length > 0 && (() => {
                        const usage = levelUsage(selected, group.cases)
                        return (
                          <div className="mb-1.5">
                            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                              <div className={cn('h-full rounded-full', usage.percent > 100 ? 'bg-destructive' : usage.percent > 85 ? 'bg-accent' : 'bg-emerald-500')} style={{ width: `${Math.min(100, usage.percent)}%` }} />
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              obsadené {usage.percent} % plochy · voľné asi {String(Math.round(usage.freeM2 * 10) / 10).replace('.', ',')} m²
                              {usage.unknown > 0 && ` · ${usage.unknown} bez rozmerov`}
                            </p>
                            {usage.tooTall.length > 0 && <p className="text-xs text-destructive">Na výšku sa nezmestí: {usage.tooTall.map((item) => item.name).join(', ')}</p>}
                          </div>
                        )
                      })()}
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

              {canPlace && !isStructure(selected.kind) && (
                <form
                  className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (!addCaseId) return
                    place.mutate({ caseId: addCaseId, spotId: selected.id, ...placeTarget(selected) })
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
                  {selected.kind === 'rack' && multiBay && (
                    <SelectField
                      label="Polica"
                      className="w-44"
                      value={cell ? `${cell.bay}-${cell.level}` : ''}
                      onChange={(e) => {
                        const [bay, level] = e.target.value.split('-').map(Number)
                        setCell(e.target.value ? { bay, level } : null)
                      }}
                    >
                      <option value="">— vyberte policu —</option>
                      {bays.flatMap((bay, bayIndex) =>
                        bay.levels.map((_, levelIndex) => (
                          <option key={`${bayIndex}-${levelIndex}`} value={`${bayIndex + 1}-${levelIndex + 1}`}>
                            Pole {bayIndex + 1}, {levelIndex + 1}. polica
                          </option>
                        )),
                      )}
                    </SelectField>
                  )}
                  {selected.kind === 'rack' && multiBay && (cellLevel?.pallets ?? 0) > 0 && (
                    <SelectField
                      label="Paleta"
                      className="w-40"
                      value={cell?.pallet ? String(cell.pallet) : ''}
                      onChange={(e) => cell && setCell({ bay: cell.bay, level: cell.level, pallet: e.target.value ? Number(e.target.value) : null })}
                    >
                      <option value="">automaticky</option>
                      {Array.from({ length: cellLevel!.pallets! }, (_, index) => (
                        <option key={index} value={index + 1}>
                          paleta {index + 1}
                        </option>
                      ))}
                    </SelectField>
                  )}
                  {selected.levels > 1 && !(selected.kind === 'rack' && multiBay) && (
                    <SelectField label="Poschodie" className="w-28" value={Math.min(addLevel, selected.levels)} onChange={(e) => setAddLevel(Number(e.target.value))}>
                      {Array.from({ length: selected.levels }, (_, index) => index + 1).map((level) => (
                        <option key={level} value={level}>
                          {level}.
                        </option>
                      ))}
                    </SelectField>
                  )}
                  <Button type="submit" disabled={!addCaseId || place.isPending || (selected.kind === 'rack' && multiBay && !cell)}>
                    Uložiť sem
                  </Button>
                  <Button variant="outline" disabled={selected.kind === 'rack' && multiBay && !cell} onClick={() => setScanning('place')}>
                    <ScanLine className="size-4" aria-hidden />
                    Uložiť sem skenovaním
                  </Button>
                </form>
              )}
            </section>
          )}
          </div>

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
