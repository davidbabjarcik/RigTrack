import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Route } from 'lucide-react'
import { Link } from 'react-router-dom'
import { tx } from '@/lib/i18n'
import { setEventTour, tourKeys, useTourAssignments, useTours } from './api'

/** Pri akcii: do ktorého turné patrí (odkaz) a zmena turné. Bez migrácie 0203 sa neukáže. */
export function EventTourField({ companyId, eventId, canEdit }: { companyId: string; eventId: string; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const tours = useTours(companyId)
  const assignments = useTourAssignments(companyId)
  const assign = useMutation({ mutationFn: (tourId: string | null) => setEventTour(eventId, tourId), onSettled: () => queryClient.invalidateQueries({ queryKey: tourKeys.events(companyId) }) })
  if (!tours.data || tours.data.length === 0) return null
  const current = assignments.data?.get(eventId) ?? ''
  const tour = tours.data.find((item) => item.id === current)
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
      <Route className="size-4 text-accent" aria-hidden />
      <span className="font-medium">{tx('Turné')}:</span>
      {tour && <Link to={`/tours/${tour.id}`} className="underline">{tour.name}</Link>}
      {canEdit && (
        <select aria-label={tx('Turné akcie')} className="h-8 rounded-lg border bg-background px-2" value={current} disabled={assign.isPending} onChange={(e) => assign.mutate(e.target.value || null)}>
          <option value="">{tour ? tx('— odpojiť —') : tx('— bez turné —')}</option>
          {tours.data.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      )}
      {!tour && !canEdit && <span className="text-muted-foreground">—</span>}
    </div>
  )
}
