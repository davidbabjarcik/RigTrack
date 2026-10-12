import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { LinkButton } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { formatNumber } from '@/features/equipment/model'
import { formatMoney } from '@/lib/format'
import { canEditInventory } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { serviceTotals, sortServiceRecords } from './model'
import { ServiceRecordRow } from './ServiceRecordRow'
import { useServiceRecords } from './useServiceRecords'

export function ServiceListPage() {
  const company = useCompany().active!
  const canEdit = canEditInventory(company.role)
  const [showDone, setShowDone] = useState(false)
  const records = useServiceRecords(company.companyId)
  const equipment = useQuery({
    queryKey: equipmentKeys.list(company.companyId),
    queryFn: () => fetchEquipmentList(company.companyId),
  })

  const all = sortServiceRecords(records.data ?? [])
  const open = all.filter((record) => record.status !== 'done')
  const visible = showDone ? all : open
  const totals = serviceTotals(all)
  const nameOf = (equipmentId: string) => equipment.data?.find((item) => item.id === equipmentId)?.name ?? 'Technika'

  return (
    <>
      <PageHeader
        title="Servis"
        description={
          all.length > 0
            ? `Spolu ${formatNumber(totals.hours)} h práce · ${formatMoney(totals.cost, 'EUR')} nákladov`
            : 'Opravy, kontroly a údržba techniky'
        }
        action={
          canEdit && (
            <LinkButton to="/service/new">
              <Plus className="size-4" aria-hidden />
              Nový
            </LinkButton>
          )
        }
      />

      <div className="mb-4 flex gap-2" role="group" aria-label="Filter záznamov">
        {[
          { done: false, label: `Rozpracované (${open.length})` },
          { done: true, label: `Všetky (${all.length})` },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={showDone === option.done}
            onClick={() => setShowDone(option.done)}
            className={cn(
              'h-9 rounded-lg border px-3 text-sm font-medium',
              showDone === option.done ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {records.isPending ? (
        <LoadingBlock />
      ) : records.isError ? (
        <ErrorBlock message="Servisné záznamy sa nepodarilo načítať." onRetry={() => void records.refetch()} />
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
          <p className="font-medium">{all.length === 0 ? 'Zatiaľ tu nie je žiadny servisný záznam' : 'Nič rozpracované'}</p>
          {canEdit && all.length === 0 && <p className="mt-1 text-sm text-muted-foreground">Začnite tlačidlom Nový.</p>}
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {visible.map((record) => (
            <li key={record.id}>
              <ServiceRecordRow record={record} equipmentName={nameOf(record.equipmentId)} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
