import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, ClipboardCheck, Pencil, PackageOpen, Plus, QrCode as QrCodeIcon, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { ScanButton } from '@/features/scan/ScanButton'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { PhotoThumb } from '@/features/equipment/PhotoThumb'
import { usePhotoThumbs } from '@/features/equipment/usePhotoThumbs'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { NO_CASE, unpackedEquipment } from '@/features/equipment/model'
import { useEquipmentLookups } from '@/features/equipment/useEquipmentLookups'
import { formatDateTime } from '@/lib/format'
import { can } from '@/lib/permissions'
import { useCheckLevels } from '@/features/checks/levels'
import { useStaff } from '@/features/staff/useStaff'
import { cn } from '@/lib/utils'
import { CASE_KIND_LABELS, CASE_KINDS, caseNumber, CHECK_PRIORITIES, CHECK_PRIORITY_LABELS, filterCases, groupCases, kindLabel, needsCheck, NO_CASE_FILTER, type Case, type CaseFilter } from './model'
import { useCases } from './useCases'

const FILTER_KEY = 'rigtrack.cases.filter'

function savedFilter(): CaseFilter {
  try {
    const saved = sessionStorage.getItem(FILTER_KEY)
    return saved ? { ...NO_CASE_FILTER, ...(JSON.parse(saved) as CaseFilter) } : NO_CASE_FILTER
  } catch {
    return NO_CASE_FILTER
  }
}

const advancedCount = (filter: CaseFilter) => [filter.check, filter.priority, filter.locationId, filter.owner, filter.labelCategory, filter.content, filter.kind].filter(Boolean).length

/** Ráta kusy, nie položky: 10 hláv v jednej položke je 10 kusov. */
function unpackedLabel(count: number) {
  if (count === 1) return '1 kus techniky nie je v žiadnom case'
  if (count >= 2 && count <= 4) return `${count} kusy techniky nie sú v žiadnom case`
  return `${count} kusov techniky nie je v žiadnom case`
}

function pieces(count: number) {
  if (count === 1) return '1 kus'
  if (count >= 2 && count <= 4) return `${count} kusy`
  return `${count} kusov`
}

export function CasesListPage() {
  const company = useCompany().active!
  const canEdit = can(company, 'cases.edit')
  const [filter, setFilter] = useState<CaseFilter>(savedFilter)
  const [more, setMore] = useState(() => advancedCount(savedFilter()) > 0)
  const set = (patch: Partial<CaseFilter>) => setFilter((current) => ({ ...current, ...patch }))
  useEffect(() => {
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify(filter))
    } catch {
      // Bez úložiska sa filter len nezapamätá.
    }
  }, [filter])
  const staff = useStaff(company.companyId)
  const checkDays = useCheckLevels(company.companyId).days
  // Čas sa zoberie raz pri otvorení stránky (render musí byť čistý).
  const [now] = useState(() => Date.now())
  const cases = useCases(company.companyId)
  const { locations } = useEquipmentLookups(company.companyId)
  const equipment = useQuery({
    queryKey: equipmentKeys.list(company.companyId),
    queryFn: () => fetchEquipmentList(company.companyId),
  })

  const counts = new Map<string, number>()
  // Čo je v case: „Beam 7R #7, #8“ – pri rozbalenej sade cases je hneď vidno, ktoré kusy kde sú.
  const contents = new Map<string, string[]>()
  for (const item of equipment.data ?? []) {
    if (!item.caseId) continue
    counts.set(item.caseId, (counts.get(item.caseId) ?? 0) + item.quantity)
    const units = item.unitIds.length > 0 ? ` ${item.unitIds.map((unit) => `#${unit}`).join(', ')}` : item.quantity > 1 ? ` ${item.quantity}×` : ''
    contents.set(item.caseId, [...(contents.get(item.caseId) ?? []), `${item.name}${units}`])
  }
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const toggleGroup = (key: string) =>
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  // Fotka v zozname: vlastná fotka case, inak hlavný prvok štítku, inak prvá technika vnútri s fotkou.
  const contentPhoto = new Map<string, string>()
  for (const item of [...(equipment.data ?? [])].sort((a, b) => Number(b.labelRole === 'main') - Number(a.labelRole === 'main'))) {
    if (item.caseId && item.photoPath && !contentPhoto.has(item.caseId)) contentPhoto.set(item.caseId, item.photoPath)
  }
  const photoOf = (item: { id: string; photoPath: string }) => item.photoPath || contentPhoto.get(item.id) || ''
  const unpacked = unpackedEquipment(equipment.data ?? [])
  const thumbs = usePhotoThumbs(
    company.companyId,
    (cases.data ?? []).map(photoOf).filter(Boolean),
  )
  const all = cases.data ?? []
  const visible = filterCases(all, filter, counts, now, checkDays)
  const due = all.filter((item) => needsCheck(item, now, checkDays)).length
  // Prázdne sa rátajú, až keď je technika načítaná (inak by boli prázdne všetky).
  const empty = equipment.data ? all.filter((item) => !counts.get(item.id)).length : 0
  const ownerIds = new Set(all.map((item) => item.ownerStaffId).filter(Boolean))
  const owners = staff.people.filter((person) => person.staffId && ownerIds.has(person.staffId))
  const labelCategories = [...new Set(all.map((item) => item.labelCategory).filter(Boolean))].sort()
  const extra = advancedCount(filter)

  const row = (item: Case, title: string, inGroup: boolean) => {
    const details = inGroup
      ? [(contents.get(item.id) ?? []).join(', ') || (equipment.data && 'prázdny'), item.inventoryNumber]
      : [item.kind === 'rack' && kindLabel(item), item.inventoryNumber, locations.find((l) => l.id === item.locationId)?.name, equipment.data && pieces(counts.get(item.id) ?? 0)]
    const check = item.lastCheck ? `Kontrola ${formatDateTime(item.lastCheck.checkedAt)} · ${item.lastCheck.checkedByName || 'neznámy'}` : 'Zatiaľ nekontrolované'
    const priority = item.checkPriority ?? 'normal'
    const late = needsCheck(item, now, checkDays)
    return (
      <Link to={`/cases/${item.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted">
        {!inGroup && <PhotoThumb url={thumbs[photoOf(item)]} />}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium">{title}</span>
            {equipment.data && !counts.get(item.id) && <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">prázdny</span>}
            {priority !== 'normal' && (
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', priority === 'high' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground')}>
                {priority === 'none' ? 'bez kontroly' : `${CHECK_PRIORITY_LABELS[priority].toLowerCase()} kontrola`}
              </span>
            )}
          </span>
          <span className="block truncate text-sm text-muted-foreground">{details.filter(Boolean).join(' · ')}</span>
          <span className={cn('block truncate text-sm', late ? 'text-accent' : 'text-muted-foreground')}>
            {check}
            {late && ' · treba skontrolovať'}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    )
  }

  return (
    <>
      <PageHeader
        title="Cases a racks"
        description={cases.data ? `${visible.length} z ${all.length}` : undefined}
        action={
          <div className="flex flex-wrap gap-2">
            <ScanButton />
            {canEdit && (
              <LinkButton to="/qr/cases" variant="outline">
                <QrCodeIcon className="size-4" aria-hidden />
                QR štítky
              </LinkButton>
            )}
            {canEdit && (
              <LinkButton to="/cases/new">
                <Plus className="size-4" aria-hidden />
                Pridať
              </LinkButton>
            )}
          </div>
        }
      />

      {unpacked.length > 0 && (
        <Link
          to={`/equipment?case=${NO_CASE}`}
          className="mb-4 flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4 hover:bg-accent/15"
        >
          <PackageOpen className="size-5 shrink-0 text-accent" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{unpackedLabel(unpacked.reduce((sum, item) => sum + item.quantity, 0))}</span>
            <span className="block truncate text-sm text-muted-foreground">
              {unpacked
                .slice(0, 4)
                .map((item) => `${item.quantity > 1 ? `${item.quantity}× ` : ''}${item.name}`)
                .join(', ')}
              {unpacked.length > 4 && ' …'} – zaradiť do case, alebo pri technike zaškrtnúť „Nepatrí do case“
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      )}

      {empty > 0 && filter.content !== 'empty' && (
        <button
          type="button"
          onClick={() => set({ content: 'empty' })}
          className="mb-4 flex w-full items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4 text-left hover:bg-accent/15"
        >
          <PackageOpen className="size-5 shrink-0 text-accent" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">Prázdne cases a racky: {empty}</span>
            <span className="block text-sm text-muted-foreground">Nie je v nich žiadna technika. Zobraziť ich.</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      )}

      {due > 0 && filter.check !== 'due' && (
        <button
          type="button"
          onClick={() => set({ check: 'due', sort: 'priority' })}
          className="mb-4 flex w-full items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4 text-left hover:bg-accent/15"
        >
          <ClipboardCheck className="size-5 shrink-0 text-accent" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">Na kontrolu: {due}</span>
            <span className="block text-sm text-muted-foreground">Nekontrolované alebo dlhšie, ako dovoľuje ich priorita. Zobraziť od najdôležitejších.</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      )}

      <div className="mb-4 flex flex-col gap-3">
        <Field label="Hľadať" hideLabel type="search" placeholder="Názov, označenie, kategória štítku, poznámka" value={filter.search} onChange={(e) => set({ search: e.target.value })} />
        <div className="grid grid-cols-2 items-end gap-2 sm:flex sm:flex-wrap">
          <SelectField label="Triediť" hideLabel className="sm:w-56" value={filter.sort} onChange={(e) => set({ sort: e.target.value as CaseFilter['sort'] })}>
            <option value="name">Podľa názvu</option>
            <option value="priority">Podľa priority kontroly</option>
            <option value="lastCheck">Najdlhšie nekontrolované</option>
            <option value="pieces">Najviac techniky</option>
          </SelectField>
          <Button variant="outline" aria-expanded={more} onClick={() => setMore(!more)}>
            <SlidersHorizontal className="size-4" aria-hidden />
            Viac filtrov{extra > 0 && ` (${extra})`}
          </Button>
          {extra > 0 && (
            <button type="button" className="col-span-2 px-2 py-2 text-left text-sm text-accent hover:underline" onClick={() => setFilter({ ...NO_CASE_FILTER, search: filter.search, sort: filter.sort })}>
              Zrušiť filter
            </button>
          )}
        </div>
        {more && (
          <div className="grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField label="Kontrola" value={filter.check} onChange={(e) => set({ check: e.target.value as CaseFilter['check'] })}>
              <option value="">Bez ohľadu</option>
              <option value="due">Treba skontrolovať</option>
              <option value="never">Nikdy nekontrolované</option>
              <option value="ok">Skontrolované načas</option>
            </SelectField>
            <SelectField label="Priorita kontroly" value={filter.priority} onChange={(e) => set({ priority: e.target.value as CaseFilter['priority'] })}>
              <option value="">Všetky</option>
              {CHECK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {CHECK_PRIORITY_LABELS[priority]}
                </option>
              ))}
            </SelectField>
            <SelectField label="Umiestnenie" value={filter.locationId} onChange={(e) => set({ locationId: e.target.value })}>
              <option value="">Všetky</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Vlastník" value={filter.owner} onChange={(e) => set({ owner: e.target.value })}>
              <option value="">Všetci</option>
              <option value="company">Firemné</option>
              {owners.map((person) => (
                <option key={person.staffId} value={person.staffId!}>
                  {person.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Kategória na štítku" value={filter.labelCategory} onChange={(e) => set({ labelCategory: e.target.value })}>
              <option value="">Všetky</option>
              {labelCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </SelectField>
            <SelectField label="Case alebo rack" value={filter.kind ?? ''} onChange={(e) => set({ kind: e.target.value as CaseFilter['kind'] })}>
              <option value="">Oboje</option>
              {CASE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind === 'case' ? 'Len cases' : 'Len racky'}
                </option>
              ))}
            </SelectField>
            <SelectField label="Obsah" value={filter.content} onChange={(e) => set({ content: e.target.value as CaseFilter['content'] })}>
              <option value="">Bez ohľadu</option>
              <option value="filled">S technikou</option>
              <option value="empty">Prázdne</option>
            </SelectField>
          </div>
        )}
      </div>

      {cases.isPending ? (
        <LoadingBlock />
      ) : cases.isError ? (
        <ErrorBlock message="Cases sa nepodarilo načítať." onRetry={() => void cases.refetch()} />
      ) : all.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
          <p className="font-medium">Zatiaľ tu nie je žiadny case</p>
          {canEdit && <p className="mt-1 text-sm text-muted-foreground">Začnite tlačidlom Pridať.</p>}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-12 text-center">
          <p className="font-medium">Hľadaniu nič nezodpovedá</p>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {groupCases(visible).map((group) => {
            if (group.items.length === 1) return <li key={group.key}>{row(group.items[0], group.items[0].name, false)}</li>
            const expanded = open.has(group.key) || filter.search.trim() !== ''
            const first = group.items[0]
            const total = group.items.reduce((sum, item) => sum + (counts.get(item.id) ?? 0), 0)
            const late = group.items.filter((item) => needsCheck(item, now, checkDays)).length
            return (
              <li key={group.key}>
                <button type="button" aria-expanded={expanded} onClick={() => toggleGroup(group.key)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted">
                  <PhotoThumb url={thumbs[photoOf(first)]} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{group.name}</span>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {group.items.length}× {first.kind === 'rack' ? 'rack' : 'case'}
                      </span>
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {[first.kind === 'rack' && kindLabel(first), equipment.data && pieces(total), group.items.map((item) => `#${caseNumber(item) || '?'}`).join(' ')].filter(Boolean).join(' · ')}
                    </span>
                    {late > 0 && <span className="block text-sm text-accent">Na kontrolu: {late}</span>}
                  </span>
                  <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')} aria-hidden />
                </button>
                {expanded && (
                  <ul className="divide-y border-t bg-muted/30">
                    {canEdit && (
                      <li className="py-2 pr-4 pl-10">
                        <Link to={`/cases/${first.id}/edit?group=${group.items.map((item) => item.id).join(',')}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                          <Pencil className="size-4" aria-hidden />
                          Upraviť všetky naraz ({group.items.length})
                        </Link>
                      </li>
                    )}
                    {group.items.map((item) => (
                      <li key={item.id} className="pl-6">
                        {row(item, `${CASE_KIND_LABELS[item.kind ?? 'case']} ${caseNumber(item) ? `#${caseNumber(item)}` : item.name}`, true)}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
