import { useQuery } from '@tanstack/react-query'
import { CalendarClock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDate, todayIso } from '@/lib/format'
import { fetchVehicles, vehicleKeys } from './api'
import { describeDays, upcomingDeadlines } from './model'

/** Pripomienky na prehľade: termíny vozidiel po platnosti alebo do 30 dní. Bez takých sa nezobrazí. */
export function VehicleDeadlineAlerts({ companyId }: { companyId: string }) {
  const vehicles = useQuery({ queryKey: vehicleKeys.list(companyId), queryFn: () => fetchVehicles(companyId) })
  const due = upcomingDeadlines(vehicles.data ?? [], todayIso())
  if (due.length === 0) return null

  return (
    <section aria-labelledby="vehicle-deadlines-heading" className="mb-6 rounded-xl border border-accent/40 bg-accent/10 p-4">
      <h2 id="vehicle-deadlines-heading" className="mb-2 flex items-center gap-2 font-medium">
        <CalendarClock className="size-5 text-accent" aria-hidden />
        Termíny vozidiel ({due.length})
      </h2>
      <ul className="divide-y divide-accent/20">
        {due.map(({ vehicle, deadline }) => (
          <li key={`${vehicle.id}-${deadline.key}`}>
            <Link to={`/vehicles/${vehicle.id}`} className="flex items-center justify-between gap-4 py-2 hover:underline">
              <span className="min-w-0 truncate">
                <span className="font-medium">{vehicle.plate}</span> · {deadline.label}
              </span>
              <span className={deadline.state === 'expired' ? 'shrink-0 text-sm text-destructive' : 'shrink-0 text-sm'}>
                {formatDate(deadline.date)} · {describeDays(deadline.days)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
