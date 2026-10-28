import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react'
import { Fragment, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { ScanButton } from '@/features/scan/ScanButton'
import { LinkButton } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useCases } from '@/features/cases/useCases'
import { caseTitle } from '@/features/cases/model'
import { useCompany } from '@/features/companies/company-context'
import { formatUnits, piecesInService, unitsInService } from '@/features/service/model'
import { useServiceRecords } from '@/features/service/useServiceRecords'
import { todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { equipmentKeys, fetchEquipmentList } from './api'
import {
  describeAttributes,
  equipmentGroupLabel,
  makersText,
  EQUIPMENT_STATUSES,
  cableBaseName,
  filterEquipment,
  groupSplitEquipment,
  hoursState,
  needsRestock,
  NO_CASE,
  serviceState,
  STATUS_LABELS,
  type Equipment,
  type EquipmentFilter,
} from './model'
import { useLinkedEquipment } from '@/features/links/api'
import { filterLinkedEquipment } from '@/features/links/filter'
import { LinkedEquipmentList } from '@/features/links/LinkedEquipmentList'
import { useCheckLevels } from '@/features/checks/levels'
import { AdvancedFilter } from './AdvancedFilter'
import { colorOf, COLOR_CLASSES } from './categoryColors'
import { PhotoThumb } from './PhotoThumb'
import { StatusBadge } from './StatusBadge'
import { useStaff } from '@/features/staff/useStaff'
import { useEquipmentLookups } from './useEquipmentLookups'
import { usePhotoThumbs } from './usePhotoThumbs'
import { useKindColors } from './kindColors'
import { useUserPrefs } from '@/features/settings/userPrefs'

const NO_FILTER: EquipmentFilter = { search: '', status: '', categoryId: '', locationId: '', caseId: '' }
const FILTER_KEY = 'rigtrack.equipment.filter'

/** Filter ostane aj po návrate z detailu (len v tejto karte prehliadača). */
function savedFilter(): EquipmentFilter {
  try {
    const saved = sessionStorage.getItem(FILTER_KEY)
    return saved ? { ...NO_FILTER, ...(JSON.parse(saved) as EquipmentFilter) } : NO_FILTER
  } catch {
    return NO_FILTER
  }
}

export function EquipmentListPage() {
  const company = useCompany().active!
  const canWrite = can(company, 'equipment.edit')
  // ?case=none otvorí zoznam rovno s technikou mimo cases (odkaz z prehľadu cases).
  const [params] = useSearchParams()
  const [filter, setFilter] = useState<EquipmentFilter>(() => (params.get('case') ? { ...NO_FILTER, caseId: params.get('case')! } : savedFilter()))
  useEffect(() => {
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify(filter))
    } catch {
      // Bez úložiska sa filter len nezapamätá.
    }
  }, [filter])
  const cases = useCases(company.companyId)
  const caseLabel = (caseId: string) => {
    const box = cases.data?.find((item) => item.id === caseId)
    return box ? caseTitle(box) : ''
  }
  const { categories, locations } = useEquipmentLookups(company.companyId)
  const list = useQuery({
    queryKey: equipmentKeys.list(company.companyId),
    queryFn: () => fetchEquipmentList(company.companyId),
  })

  const set = (patch: Partial<EquipmentFilter>) => setFilter((current) => ({ ...current, ...patch }))
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name
  const staff = useStaff(company.companyId)
  const ownerName = (id: string | null | undefined) => (id ? staff.people.find((person) => person.staffId === id)?.name : undefined)
  const today = todayIso()
  const checkDays = useCheckLevels(company.companyId).days
  const serviceRecords = useServiceRecords(company.companyId).data ?? []
  const inService = piecesInService(serviceRecords)
  const unitsOut = unitsInService(serviceRecords)
  const all = list.data ?? []
  const kindColors = useKindColors(company.companyId).data ?? {}
  const linked = useLinkedEquipment(company.companyId).data ?? []
  const linkedCompanies = [...new Map(linked.map((item) => [item.companyId, { id: item.companyId, name: item.companyName }])).values()]
  const linkedVisible = filterLinkedEquipment(linked, filter)
  // Pri výbere jednej prepojenej firmy sa naša technika neukazuje.
  const ownHidden = Boolean(filter.company && filter.company !== 'all')
  const { prefs } = useUserPrefs()
  const sortContext = { kindOrder: prefs.kindOrder, categoryName: (id: string | null) => categories.find((c) => c.id === id)?.name ?? '' }
  const byGroup = filter.sort === 'category'
  const visible = ownHidden ? [] : filterEquipment(all, filter, today, sortContext)
  const thumbs = usePhotoThumbs(
    company.companyId,
    all.map((item) => item.photoPath),
  )

  // Rozdelená technika (časť v cases) je pod jedným riadkom; rozbalí sa na jednotlivé časti.
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set())
  const toggleGroup = (key: string) =>
    setOpenGroups((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const row = (item: Equipment, sub: boolean, byLength = false) => {
    const color = colorOf(item, categories, kindColors)
    const details = [
      !sub && [item.manufacturer, item.model].filter(Boolean).join(' '),
      ...(sub ? [] : describeAttributes(item, { makers: false })),
      !sub && categoryName(item.categoryId),
      ownerName(item.ownerStaffId) && `patrí: ${ownerName(item.ownerStaffId)}`,
      item.inventoryNumber && `inv. č. ${item.inventoryNumber}`,
      // Pri rozbalených častiach vždy aj 1 ks (napr. XLR 25 m · 1 ks).
      (sub || item.quantity !== 1) && `${item.quantity} ks`,
      // Rozdelená technika: ktoré kusy a v ktorom case sú.
      item.trackUnits && item.unitIds.length > 0 && item.unitIds.length <= 12 && item.unitIds.map((unit) => `#${unit}`).join(', '),
      (!sub || byLength) && item.caseId && caseLabel(item.caseId) && `v ${caseLabel(item.caseId)}`,
      byLength && makersText(item.attributes),
      !item.caseId && item.attributes.inCover && (item.attributes.coverNote ? `obal: ${item.attributes.coverNote}` : 'v obale'),
    ].filter(Boolean)
    const service = serviceState(item, today).state
    const servicing = inService.get(item.id) ?? 0
    return (
      <Link to={`/equipment/${item.id}`} className={`relative flex min-h-16 items-center gap-3 py-3 pr-4 hover:bg-muted ${sub ? 'pl-10' : 'pl-5'}`}>
          {/* Farba kategórie: prúžok úplne vľavo pred fotkou. */}
          {color && <span className={`absolute inset-y-0 left-0 w-1.5 ${COLOR_CLASSES[color]}`} aria-hidden />}
          {!sub && <PhotoThumb url={thumbs[item.photoPath]} />}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{sub && !byLength ? (item.caseId ? caseLabel(item.caseId) || 'V case' : 'Mimo case') : item.name}</span>
            {details.length > 0 && <span className="block truncate text-sm text-muted-foreground">{details.join(' · ')}</span>}
            {servicing > 0 && item.status !== 'in_service' && (
              <span className="block text-sm text-sky-700 dark:text-sky-400">
                V servise {unitsOut.has(item.id) ? `kus ${formatUnits(unitsOut.get(item.id)!)}` : `${servicing} z ${item.quantity} ks`}
              </span>
            )}
            {needsRestock(item) && <span className="block text-sm text-destructive">Treba dokúpiť</span>}
            {['overdue', 'unknown'].includes(hoursState(item, today, checkDays).state) && (
              <span className="block text-sm text-accent">Odčítať prevádzkové hodiny</span>
            )}
            {service === 'overdue' && <span className="block text-sm text-destructive">Servis po termíne</span>}
            {service === 'soon' && <span className="block text-sm text-accent">Servis do 30 dní</span>}
          </span>
          <StatusBadge status={item.status} />
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    )
  }

  const groups = groupSplitEquipment(visible, caseLabel)
  const renderGroup = (group: (typeof groups)[number]) => {
    if (group.items.length === 1) return <li key={group.key}>{row(group.items[0], false)}</li>
    const main = group.items[0]
    const total = group.items.reduce((sum, item) => sum + item.quantity, 0)
    const free = group.items.filter((item) => !item.caseId).reduce((sum, item) => sum + item.quantity, 0)
    const inCases = group.items.filter((item) => item.caseId)
    const expanded = openGroups.has(group.key)
    const cables = main.kind === 'cable'
    const color = colorOf(main, categories, kindColors)
    const lengths = [...new Set(group.items.map((item) => item.attributes.lengthM).filter((value): value is number => value !== undefined))]
    const details = [
      [main.manufacturer, main.model].filter(Boolean).join(' '),
      ...(cables ? [main.attributes.connector, lengths.length > 0 && `${lengths.map((value) => String(value).replace('.', ',')).join(', ')} m`] : describeAttributes(main, { makers: false })),
      categoryName(main.categoryId),
      `${total} ks`,
      free > 0 && `${free} mimo case`,
      inCases.length > 0 && `${inCases.reduce((sum, item) => sum + item.quantity, 0)} v ${inCases.length === 1 ? caseLabel(inCases[0].caseId!) || 'case' : `${inCases.length} cases`}`,
    ].filter(Boolean)
    const late = group.items.some((item) => ['overdue', 'unknown'].includes(hoursState(item, today, checkDays).state))
    return (
      <li key={group.key}>
        {/* Klik na riadok otvorí prehľad všetkých častí; šípka vpravo rozbalí časti priamo v zozname. */}
        <div className="relative flex min-h-16 items-center hover:bg-muted">
          {color && <span className={`absolute inset-y-0 left-0 w-1.5 ${COLOR_CLASSES[color]}`} aria-hidden />}
          <Link to={`/equipment/group?ids=${group.items.map((item) => item.id).join(',')}`} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-5">
            <PhotoThumb url={thumbs[main.photoPath]} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{cables ? cableBaseName(main.name) : main.name}</span>
              <span className="block truncate text-sm text-muted-foreground">{details.join(' · ')}</span>
              {late && <span className="block text-sm text-accent">Odčítať prevádzkové hodiny</span>}
            </span>
            <StatusBadge status={main.status} />
          </Link>
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={expanded ? 'Zbaliť časti' : 'Rozbaliť časti'}
            onClick={() => toggleGroup(group.key)}
            className="flex h-16 w-12 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={`size-5 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
          </button>
        </div>
        {expanded && (
          <ul className="divide-y border-t bg-muted/30">
            {group.items.map((item) => (
              <li key={item.id}>{row(item, true, cables)}</li>
            ))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <>
      <PageHeader
        title="Technika"
        description={list.data ? `${visible.length} z ${all.length} položiek` : undefined}
        action={
          <div className="flex flex-wrap gap-2">
            <ScanButton />
            {canWrite && (
              <LinkButton to="/equipment/new">
                <Plus className="size-4" aria-hidden />
                Pridať
              </LinkButton>
            )}
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-4">
          <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" aria-hidden />
          <Field
            label="Hľadať"
            hideLabel
            type="search"
            placeholder="Názov, výrobca, sériové alebo inventárne číslo"
            className="[&_input]:pl-9"
            value={filter.search}
            onChange={(e) => set({ search: e.target.value })}
          />
        </div>
        <AdvancedFilter
          filter={filter}
          onChange={set}
          items={all}
          owners={staff.people.filter((person) => person.staffId).map((person) => ({ staffId: person.staffId!, name: person.name }))}
          linkedCompanies={linkedCompanies}
        >
          <SelectField label="Stav" value={filter.status} onChange={(e) => set({ status: e.target.value as EquipmentFilter['status'] })}>
            <option value="">Všetky stavy</option>
            {EQUIPMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Kategória" value={filter.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
            <option value="">Všetky kategórie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Umiestnenie" value={filter.locationId} onChange={(e) => set({ locationId: e.target.value })}>
            <option value="">Všetky umiestnenia</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Case" value={filter.caseId} onChange={(e) => set({ caseId: e.target.value })}>
            <option value="">Všetky cases</option>
            <option value={NO_CASE}>Mimo cases</option>
            {(cases.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </SelectField>
        </AdvancedFilter>
      </div>

      {list.isPending ? (
        <LoadingBlock />
      ) : list.isError ? (
        <ErrorBlock message="Techniku sa nepodarilo načítať." onRetry={() => void list.refetch()} />
      ) : all.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
          <p className="font-medium">Zatiaľ tu nie je žiadna technika</p>
          {canWrite && <p className="mt-1 text-sm text-muted-foreground">Začnite tlačidlom Pridať.</p>}
        </div>
      ) : ownHidden ? null : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-12 text-center">
          <p className="font-medium">Filtru nič nezodpovedá</p>
          <button type="button" className="mt-2 text-sm text-accent hover:underline" onClick={() => setFilter(NO_FILTER)}>
            Zrušiť filter
          </button>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {groups.map((group, index) => (
            <Fragment key={group.key}>
              {/* Triedenie podľa kategórie / druhu: nadpis pri každej novej skupine. */}
              {byGroup && (index === 0 || equipmentGroupLabel(groups[index - 1].items[0], sortContext) !== equipmentGroupLabel(group.items[0], sortContext)) && (
                <li className="bg-muted/60 px-4 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{equipmentGroupLabel(group.items[0], sortContext)}</li>
              )}
              {renderGroup(group)}
            </Fragment>
          ))}
        </ul>
      )}
      <LinkedEquipmentList items={linkedVisible} />
    </>
  )
}
