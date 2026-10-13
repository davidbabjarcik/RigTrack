import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { LinkButton } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { PhotoThumb } from '@/features/equipment/PhotoThumb'
import { usePhotoThumbs } from '@/features/equipment/usePhotoThumbs'
import { todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { fetchVehicles, vehicleKeys } from './api'
import { DeadlineLine } from './DeadlineBadge'
import { VEHICLE_STATUS_LABELS, vehicleDeadlines } from './model'

export function VehiclesListPage() {
  const company = useCompany().active!
  const canManage = can(company, 'vehicles.edit')
  const vehicles = useQuery({
    queryKey: vehicleKeys.list(company.companyId),
    queryFn: () => fetchVehicles(company.companyId),
  })
  const today = todayIso()
  const thumbs = usePhotoThumbs(
    company.companyId,
    (vehicles.data ?? []).map((vehicle) => vehicle.photoPath),
  )

  return (
    <>
      <PageHeader
        title="Vozidlá"
        description="Firemné autá a ich termíny"
        action={
          canManage && (
            <LinkButton to="/vehicles/new">
              <Plus className="size-4" aria-hidden />
              Pridať
            </LinkButton>
          )
        }
      />

      {vehicles.isPending ? (
        <LoadingBlock />
      ) : vehicles.isError ? (
        <ErrorBlock message="Vozidlá sa nepodarilo načítať." onRetry={() => void vehicles.refetch()} />
      ) : vehicles.data.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
          <p className="font-medium">Zatiaľ tu nie je žiadne vozidlo</p>
          {canManage && <p className="mt-1 text-sm text-muted-foreground">Začnite tlačidlom Pridať.</p>}
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {vehicles.data.map((vehicle) => {
            // V zozname stačí to, čo horí; ak nehorí nič, najbližší termín.
            const deadlines = vehicleDeadlines(vehicle, today)
            const due = deadlines.filter((deadline) => deadline.state !== 'ok')
            const shown = due.length > 0 ? due : deadlines.slice(0, 1)
            return (
              <li key={vehicle.id}>
                <Link to={`/vehicles/${vehicle.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted">
                  <PhotoThumb url={thumbs[vehicle.photoPath]} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {vehicle.plate}
                      {vehicle.model && <span className="font-normal text-muted-foreground"> · {vehicle.model}</span>}
                    </span>
                    {shown.map((deadline) => (
                      <DeadlineLine key={deadline.key} deadline={deadline} className="block truncate text-sm" />
                    ))}
                    {deadlines.length === 0 && <span className="block text-sm text-muted-foreground">Bez zadaných termínov</span>}
                  </span>
                  {vehicle.status !== 'active' && (
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {VEHICLE_STATUS_LABELS[vehicle.status]}
                    </span>
                  )}
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
