import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ClipboardCheck, PackageOpen, Plus, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
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
import { CHECK_PRIORITIES, CHECK_PRIORITY_LABELS, filterCases, needsCheck, NO_CASE_FILTER, type CaseFilter } from './model'
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

const advancedCount = (filter: CaseFilter) => [filter.check, filter.priority, filter.locationId, filter.owner, filter.labelCategory, filter.content].filter(Boolean).length

function unpackedLabel(count: number) {
  if (count === 1) return '1 položka techniky nie je v žiadnom case'
  if (count >= 2 && count <= 4) return `${count} položky techniky nie sú v žiadnom case`
  return `${count} položiek techniky nie je v žiadnom case`
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
  for (const item of equipment.data ?? []) {
    if (item.caseId) counts.set(item.caseId, (counts.get(item.caseId) ?? 0) + 1)
  }

  const unpacked = unpackedEquipment(equipment.data ?? [])
  const thumbs = usePhotoThumbs(
    company.companyId,
    (cases.data ?? []).map((item) => item.photoPath),
  )
  const all = cases.data ?? []
  const visible = filterCases(all, filter, counts, now, checkDays)
  const due = all.filter((item) => needsCheck(item, now, checkDays)).length
  const ownerIds = new Set(all.map((item) => item.ownerStaffId).filter(Boolean))
  const owners = staff.people.filter((person) => person.staffId && ownerIds.has(person.staffId))
  const labelCategories = [...new Set(all.map((item) => item.labelCategory).filter(Boolean))].sort()
  const extra = advancedCount(filter)

  return (
    <>
      <PageHeader
        title="Cases a racks"
        description={cases.data ? `${visible.length} z ${all.length}` : undefined}
        action={
          canEdit && (
            <LinkButton to="/cases/new">
              <Plus className="size-4" aria-hidden />
              Pridať
            </LinkButton>
          )
        }
      />

      {unpacked.length > 0 && (
        <Link
          to={`/equipment?case=${NO_CASE}`}
          className="mb-4 flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4 hover:bg-accent/15"
        >
          <PackageOpen className="size-5 shrink-0 text-accent" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{unpackedLabel(unpacked.length)}</span>
            <span className="block text-sm text-muted-foreground">Zobraziť a dať do poriadku</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
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
        <div className="flex flex-wrap items-end gap-2">
          <Button variant="outline" size="sm" aria-expanded={more} onClick={() => setMore(!more)}>
            <SlidersHorizontal className="size-4" aria-hidden />
            Filter{extra > 0 && ` (${extra})`}
          </Button>
          <SelectField label="Triediť" hideLabel className="w-56" value={filter.sort} onChange={(e) => set({ sort: e.target.value as CaseFilter['sort'] })}>
            <option value="name">Podľa názvu</option>
            <option value="priority">Podľa priority kontroly</option>
            <option value="lastCheck">Najdlhšie nekontrolované</option>
            <option value="pieces">Najviac techniky</option>
          </SelectField>
          {extra > 0 && (
            <button type="button" className="px-2 py-2 text-sm text-accent hover:underline" onClick={() => setFilter({ ...NO_CASE_FILTER, search: filter.search, sort: filter.sort })}>
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
          {visible.map((item) => {
            const details = [
              item.inventoryNumber,
              locations.find((l) => l.id === item.locationId)?.name,
              equipment.data && pieces(counts.get(item.id) ?? 0),
            ].filter(Boolean)
            const check = item.lastCheck
              ? `Kontrola ${formatDateTime(item.lastCheck.checkedAt)} · ${item.lastCheck.checkedByName || 'neznámy'}`
              : 'Zatiaľ nekontrolované'
            const priority = item.checkPriority ?? 'normal'
            const late = needsCheck(item, now, checkDays)
            return (
              <li key={item.id}>
                <Link to={`/cases/${item.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted">
                  {item.photoPath && <PhotoThumb url={thumbs[item.photoPath]} />}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{item.name}</span>
                      {priority !== 'normal' && (
                        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', priority === 'high' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground')}>
                          {priority === 'none' ? 'bez kontroly' : `${CHECK_PRIORITY_LABELS[priority].toLowerCase()} kontrola`}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">{details.join(' · ')}</span>
                    <span className={cn('block truncate text-sm', late ? 'text-accent' : 'text-muted-foreground')}>
                      {check}
                      {late && ' · treba skontrolovať'}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
