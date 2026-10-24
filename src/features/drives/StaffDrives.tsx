import { Link } from 'react-router-dom'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { formatNumber } from '@/features/equipment/model'
import type { CompanyEvent } from '@/features/events/model'
import { useVehicles } from '@/features/vehicles/useVehicles'
import { formatDate } from '@/lib/format'
import { useAllDrives } from './api'
import { DIRECTION_LABELS } from './model'

/** Na karte zamestnanca: kde a kedy šoféroval (člen podľa účtu, brigádnik podľa mena). */
export function StaffDrives({ companyId, person, events }: { companyId: string; person: { memberId: string | null; name: string }; events: CompanyEvent[] }) {
  const drives = useAllDrives(companyId)
  const vehicles = useVehicles(companyId)
  if (drives.isError || !drives.data) return null
  const name = person.name.trim().toLowerCase()
  const mine = drives.data.filter((drive) => (person.memberId ? drive.memberId === person.memberId : !drive.memberId && drive.driverName.trim().toLowerCase() === name))
  if (mine.length === 0) return null
  const km = mine.reduce((sum, drive) => sum + (drive.km ?? 0), 0)
  const eventOf = (id: string) => events.find((event) => event.id === id)
  const plateOf = (id: string | null) => (id ? vehicles.data?.find((vehicle) => vehicle.id === id)?.plate : undefined)

  return (
    <CollapsibleSection id="staff.drives" title={`Šoféroval (${mine.length}× · ${formatNumber(Math.round(km * 10) / 10)} km)`}>
      <ul className="divide-y overflow-hidden rounded-xl border bg-surface text-sm">
        {mine.slice(0, 30).map((drive) => {
          const event = eventOf(drive.eventId)
          return (
            <li key={drive.id}>
              <Link to={`/events/${drive.eventId}`} className="flex items-center gap-3 px-4 py-2 hover:bg-muted">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{event?.name ?? 'Event'}</span>
                  <span className="block truncate text-muted-foreground">{[formatDate(drive.date), plateOf(drive.vehicleId), DIRECTION_LABELS[drive.direction], drive.route].filter(Boolean).join(' · ')}</span>
                </span>
                {drive.km !== null && <span className="shrink-0 tabular-nums">{formatNumber(drive.km)} km</span>}
              </Link>
            </li>
          )
        })}
      </ul>
    </CollapsibleSection>
  )
}
