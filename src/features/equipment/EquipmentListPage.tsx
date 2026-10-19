import { useQuery } from '@tanstack/react-query'
import { Cable, ChevronRight, FileSpreadsheet, Network, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { LinkButton } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { formatUnits, piecesInService, unitsInService } from '@/features/service/model'
import { useServiceRecords } from '@/features/service/useServiceRecords'
import { todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { equipmentKeys, fetchEquipmentList } from './api'
import {
  describeAttributes,
  EQUIPMENT_STATUSES,
  filterEquipment,
  hoursState,
  needsRestock,
  NO_CASE,
  serviceState,
  STATUS_LABELS,
  type EquipmentFilter,
} from './model'
import { colorOf, COLOR_CLASSES } from './categoryColors'
import { PhotoThumb } from './PhotoThumb'
import { StatusBadge } from './StatusBadge'
import { useStaff } from '@/features/staff/useStaff'
import { useEquipmentLookups } from './useEquipmentLookups'
import { usePhotoThumbs } from './usePhotoThumbs'

const NO_FILTER: EquipmentFilter = { search: '', status: '', categoryId: '', locationId: '', caseId: '' }

export function EquipmentListPage() {
  const company = useCompany().active!
  const canWrite = can(company, 'equipment.edit')
  // ?case=none otvorí zoznam rovno s technikou mimo cases (odkaz z prehľadu cases).
  const [params] = useSearchParams()
  const [filter, setFilter] = useState({ ...NO_FILTER, caseId: params.get('case') ?? '' })
  const cases = useCases(company.companyId)
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
  const serviceRecords = useServiceRecords(company.companyId).data ?? []
  const inService = piecesInService(serviceRecords)
  const unitsOut = unitsInService(serviceRecords)
  const all = list.data ?? []
  const visible = filterEquipment(all, filter)
  const thumbs = usePhotoThumbs(
    company.companyId,
    all.map((item) => item.photoPath),
  )

  return (
    <>
      <PageHeader
        title="Technika"
        description={list.data ? `${visible.length} z ${all.length} položiek` : undefined}
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <LinkButton to="/equipment/excel" variant="outline">
              <FileSpreadsheet className="size-4" aria-hidden />
              Excel
            </LinkButton>
            <LinkButton to="/networks" variant="outline">
              <Network className="size-4" aria-hidden />
              Siete / IP
            </LinkButton>
            {canWrite && (
              <>
                <LinkButton to="/equipment/new-cables" variant="outline">
                  <Cable className="size-4" aria-hidden />
                  Sada káblov
                </LinkButton>
                <LinkButton to="/equipment/new">
                  <Plus className="size-4" aria-hidden />
                  Pridať
                </LinkButton>
              </>
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
        <SelectField
          label="Stav"
          hideLabel
          value={filter.status}
          onChange={(e) => set({ status: e.target.value as EquipmentFilter['status'] })}
        >
          <option value="">Všetky stavy</option>
          {EQUIPMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </SelectField>
        <SelectField label="Kategória" hideLabel value={filter.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
          <option value="">Všetky kategórie</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Umiestnenie" hideLabel value={filter.locationId} onChange={(e) => set({ locationId: e.target.value })}>
          <option value="">Všetky umiestnenia</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Case" hideLabel value={filter.caseId} onChange={(e) => set({ caseId: e.target.value })}>
          <option value="">Všetky cases</option>
          <option value={NO_CASE}>Mimo cases</option>
          {(cases.data ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </SelectField>
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
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-12 text-center">
          <p className="font-medium">Filtru nič nezodpovedá</p>
          <button type="button" className="mt-2 text-sm text-accent hover:underline" onClick={() => setFilter(NO_FILTER)}>
            Zrušiť filter
          </button>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {visible.map((item) => {
            const color = colorOf(item, categories)
            const details = [
              [item.manufacturer, item.model].filter(Boolean).join(' '),
              ...describeAttributes(item),
              categoryName(item.categoryId),
              ownerName(item.ownerStaffId) && `patrí: ${ownerName(item.ownerStaffId)}`,
              item.inventoryNumber && `inv. č. ${item.inventoryNumber}`,
              item.quantity !== 1 && `${item.quantity} ks`,
            ].filter(Boolean)
            const service = serviceState(item, today).state
            const servicing = inService.get(item.id) ?? 0
            return (
              <li key={item.id}>
                <Link to={`/equipment/${item.id}`} className="relative flex min-h-16 items-center gap-3 py-3 pr-4 pl-5 hover:bg-muted">
                  {/* Farba kategórie: prúžok úplne vľavo pred fotkou. */}
                  {color && <span className={`absolute inset-y-0 left-0 w-1.5 ${COLOR_CLASSES[color]}`} aria-hidden />}
                  <PhotoThumb url={thumbs[item.photoPath]} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.name}</span>
                    {details.length > 0 && (
                      <span className="block truncate text-sm text-muted-foreground">{details.join(' · ')}</span>
                    )}
                    {servicing > 0 && item.status !== 'in_service' && (
                      <span className="block text-sm text-sky-700 dark:text-sky-400">
                        V servise {unitsOut.has(item.id) ? `kus ${formatUnits(unitsOut.get(item.id)!)}` : `${servicing} z ${item.quantity} ks`}
                      </span>
                    )}
                    {needsRestock(item) && <span className="block text-sm text-destructive">Treba dokúpiť</span>}
                    {['overdue', 'unknown'].includes(hoursState(item, today).state) && (
                      <span className="block text-sm text-accent">Odčítať prevádzkové hodiny</span>
                    )}
                    {service === 'overdue' && <span className="block text-sm text-destructive">Servis po termíne</span>}
                    {service === 'soon' && <span className="block text-sm text-accent">Servis do 30 dní</span>}
                  </span>
                  <StatusBadge status={item.status} />
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
