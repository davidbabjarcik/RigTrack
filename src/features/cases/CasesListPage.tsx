import { useQuery } from '@tanstack/react-query'
import { ChevronRight, PackageOpen, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { LinkButton } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { NO_CASE, unpackedEquipment } from '@/features/equipment/model'
import { useEquipmentLookups } from '@/features/equipment/useEquipmentLookups'
import { formatDateTime } from '@/lib/format'
import { canEditInventory } from '@/lib/permissions'
import { useCases } from './useCases'

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
  const canEdit = canEditInventory(company.role)
  const [search, setSearch] = useState('')
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
  const all = cases.data ?? []
  const needle = search.trim().toLowerCase()
  const visible = all.filter((c) => `${c.name} ${c.inventoryNumber}`.toLowerCase().includes(needle))

  return (
    <>
      <PageHeader
        title="Cases"
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

      <Field
        label="Hľadať"
        hideLabel
        type="search"
        placeholder="Názov alebo označenie"
        className="mb-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

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
            return (
              <li key={item.id}>
                <Link to={`/cases/${item.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">{details.join(' · ')}</span>
                    <span className="block truncate text-sm text-muted-foreground">{check}</span>
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
