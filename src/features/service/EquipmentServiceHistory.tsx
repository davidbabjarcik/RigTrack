import { Plus } from 'lucide-react'
import { LinkButton } from '@/components/ui/button'
import { sortServiceRecords } from './model'
import { ServiceRecordRow } from './ServiceRecordRow'
import { useServiceRecords } from './useServiceRecords'

type Props = { companyId: string; equipmentId: string; canEdit: boolean }

/** Servisné záznamy jedného kusu techniky v jeho detaile. */
export function EquipmentServiceHistory({ companyId, equipmentId, canEdit }: Props) {
  const records = useServiceRecords(companyId)
  const mine = sortServiceRecords((records.data ?? []).filter((record) => record.equipmentId === equipmentId))
  if (mine.length === 0 && !canEdit) return null

  return (
    <section className="mt-6" aria-labelledby="service-history-heading">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="service-history-heading" className="text-sm font-medium text-muted-foreground">
          Servis ({mine.length})
        </h2>
        {canEdit && (
          <LinkButton to={`/service/new?equipment=${equipmentId}`} variant="outline" size="sm">
            <Plus className="size-4" aria-hidden />
            Nový záznam
          </LinkButton>
        )}
      </div>
      {mine.length > 0 && (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {mine.map((record) => (
            <li key={record.id}>
              <ServiceRecordRow record={record} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
