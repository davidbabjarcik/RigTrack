import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button, LinkButton } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { formatDate } from '@/lib/format'
import { canDeleteInventory, canEditInventory } from '@/lib/permissions'
import { deleteEvent, eventKeys } from './api'
import { EventCrewSection } from './EventCrewSection'
import { EventDocumentsSection } from './EventDocumentsSection'
import { EventEquipmentSection } from './EventEquipmentSection'
import { EventStatusBadge } from './EventStatusBadge'
import { useEvents } from './useEvents'

export function EventDetailPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const canEdit = canEditInventory(company.role)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const events = useEvents(companyId)

  const remove = useMutation({
    mutationFn: () => deleteEvent(companyId, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: eventKeys.list(companyId) })
      navigate('/events', { replace: true })
    },
  })

  const back = (
    <Link to="/events" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      Eventy
    </Link>
  )

  if (events.isPending) return <LoadingBlock />
  if (events.isError) return <ErrorBlock message="Event sa nepodarilo načítať." onRetry={() => void events.refetch()} />
  const event = events.data.find((candidate) => candidate.id === id)
  if (!event) {
    return (
      <>
        {back}
        <ErrorBlock message="Tento event neexistuje alebo k nemu nemáte prístup." />
      </>
    )
  }

  const when = event.startsOn === event.endsOn ? formatDate(event.startsOn) : `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`

  return (
    <>
      {back}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{event.name}</h1>
          <p className="mt-1 text-muted-foreground">{[when, event.venue, event.client].filter(Boolean).join(' · ')}</p>
          <div className="mt-2">
            <EventStatusBadge status={event.status} />
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <LinkButton to={`/events/${id}/edit`} variant="outline" size="sm">
              <Pencil className="size-4" aria-hidden />
              Upraviť
            </LinkButton>
          )}
          {canDeleteInventory(company.role) && (
            <Button
              variant="destructive"
              size="sm"
              disabled={remove.isPending}
              onClick={() => {
                if (window.confirm(`Naozaj odstrániť event „${event.name}“ aj s posádkou a dokumentmi?`)) remove.mutate()
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              Odstrániť
            </Button>
          )}
        </div>
      </header>

      {remove.isError && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          Event sa nepodarilo odstrániť.
        </p>
      )}

      {event.note && <p className="mb-6 rounded-xl border bg-surface p-4 whitespace-pre-wrap">{event.note}</p>}

      <EventEquipmentSection companyId={companyId} event={event} events={events.data} canEdit={canEdit} />
      <EventCrewSection companyId={companyId} event={event} canEdit={canEdit} />
      <EventDocumentsSection companyId={companyId} eventId={event.id} canEdit={canEdit} />
    </>
  )
}
