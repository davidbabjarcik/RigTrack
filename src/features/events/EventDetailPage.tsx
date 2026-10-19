import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarClock, ListChecks, Pencil, Printer, Receipt, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { AddToCalendarButtons, AddToContactsButton } from '@/components/share/ShareButtons'
import { Button, LinkButton } from '@/components/ui/button'
import { eventCalendarItem } from '@/features/calendar/export'
import { useCompany } from '@/features/companies/company-context'
import { formatDate } from '@/lib/format'
import { EventLoadingSection } from '@/features/loading/EventLoadingSection'
import { can } from '@/lib/permissions'
import { deleteEvent, eventKeys } from './api'
import { EventCrewSection } from './EventCrewSection'
import { EventLinksSection } from './EventLinksSection'
import { EventLogSection } from './EventLogSection'
import { EventPlanSection } from './EventPlanSection'
import { EventPowerSection } from './EventPowerSection'
import { EventTravelSection } from './EventTravelSection'
import { EventPartnersSection } from '@/features/partners/EventPartnersSection'
import { EventCapsulesSection } from '@/features/capsules/EventCapsulesSection'
import { EventSharesSection } from '@/features/links/EventSharesSection'
import { PatchSection } from '@/features/patch/PatchSection'
import { usePartners } from '@/features/partners/api'
import { EventDocumentsSection } from './EventDocumentsSection'
import { EventIncomeSection } from './EventIncomeSection'
import { EventPhotosSection } from './EventPhotosSection'
import { EventEquipmentSection } from './EventEquipmentSection'
import { EventStatusBadge } from './EventStatusBadge'
import { describeTimes, POWER_LABELS, SETTING_LABELS } from './model'
import { EventWeather } from './EventWeather'
import { useEvents } from './useEvents'

export function EventDetailPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const canEdit = can(company, 'events.edit')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const events = useEvents(companyId)
  const directory = usePartners(companyId)

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

  const times = describeTimes(event)
  // Organizátor je v sekcii „Organizátor a firmy“; tu len pri starej databáze bez adresára firiem (pred 0059).
  const organizer = directory.isError ? [event.organizer, event.organizerPerson, event.organizerPhone, event.organizerEmail].filter(Boolean) : []
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
          <AddToCalendarButtons item={eventCalendarItem(event)} className="mt-3" />
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton to={`/events/${id}/crew`} variant="outline" size="sm">
            <CalendarClock className="size-4" aria-hidden />
            Pre posádku
          </LinkButton>
          <LinkButton to={`/events/${id}/pack`} variant="outline" size="sm">
            <ListChecks className="size-4" aria-hidden />
            Pack list
          </LinkButton>
          {canEdit && (
            <LinkButton to={`/events/${id}/quote`} variant="outline" size="sm">
              <Receipt className="size-4" aria-hidden />
              Ponuka
            </LinkButton>
          )}
          <LinkButton to={`/events/${id}/print`} variant="outline" size="sm">
            <Printer className="size-4" aria-hidden />
            Tlač / PDF
          </LinkButton>
          {canEdit && (
            <LinkButton to={`/events/${id}/edit`} variant="outline" size="sm">
              <Pencil className="size-4" aria-hidden />
              Upraviť
            </LinkButton>
          )}
          {can(company, 'events.delete') && (
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

      {(times || organizer.length > 0 || event.setting || event.power) && (
        <CollapsibleSection id="event.details" title={organizer.length > 0 ? 'Miesto, elektrina a organizátor' : 'Miesto a elektrina'}>
          <dl className="grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2">
            {event.setting && (
              <div>
                <dt className="text-sm text-muted-foreground">Miesto</dt>
                <dd className="font-medium">{SETTING_LABELS[event.setting]}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-muted-foreground">Elektrina</dt>
              <dd className={event.power ? 'font-medium' : 'font-medium text-amber-700 dark:text-amber-300'}>
                {event.power ? `${event.powerCount && event.powerCount > 1 ? `${event.powerCount} × ` : ''}${POWER_LABELS[event.power]}` : 'Prípojka ešte nie je zistená'}
              </dd>
              {event.powerNote && <dd className="text-sm text-muted-foreground">{event.powerNote}</dd>}
            </div>
            {times && (
              <div>
                <dt className="text-sm text-muted-foreground">Časy (prvý deň)</dt>
                <dd className="font-medium">{times}</dd>
              </div>
            )}
            {organizer.length > 0 && (
              <div className="min-w-0">
                <dt className="text-sm text-muted-foreground">Organizátor</dt>
                <dd className="font-medium break-words">{event.organizer || event.organizerPerson}</dd>
                <dd className="flex flex-wrap gap-x-3 text-sm break-all">
                  {event.organizer && event.organizerPerson && <span>{event.organizerPerson}</span>}
                  {event.organizerPhone && (
                    <a href={`tel:${event.organizerPhone.replace(/\s/g, '')}`} className="text-accent hover:underline">
                      {event.organizerPhone}
                    </a>
                  )}
                  {event.organizerEmail && (
                    <a href={`mailto:${event.organizerEmail}`} className="text-accent hover:underline">
                      {event.organizerEmail}
                    </a>
                  )}
                </dd>
                <dd className="mt-2">
                  <AddToContactsButton
                    contact={{
                      name: event.organizerPerson || event.organizer,
                      org: event.organizerPerson ? event.organizer : '',
                      title: 'Organizátor',
                      phone: event.organizerPhone,
                      email: event.organizerEmail,
                      note: `Event: ${event.name}`,
                    }}
                  />
                </dd>
              </div>
            )}
          </dl>
        </CollapsibleSection>
      )}

      {(event.setting === 'outdoor' || event.setting === 'mixed') && <EventWeather event={event} />}

      {event.description && (
        <CollapsibleSection id="event.description" title="Popis">
          <p className="rounded-xl border bg-surface p-4 whitespace-pre-wrap">{event.description}</p>
        </CollapsibleSection>
      )}
      {event.note && (
        <CollapsibleSection id="event.note" title="Interná poznámka">
          <p className="rounded-xl border border-dashed bg-surface p-4 whitespace-pre-wrap">{event.note}</p>
        </CollapsibleSection>
      )}

      <EventPlanSection companyId={companyId} event={event} canEdit={canEdit} />
      <EventPartnersSection companyId={companyId} event={event} canEdit={canEdit} />
      <EventSharesSection companyId={companyId} eventId={event.id} canEdit={canEdit} />
      <EventLinksSection companyId={companyId} eventId={event.id} canEdit={canEdit} />
      <EventEquipmentSection companyId={companyId} event={event} events={events.data} canEdit={canEdit} />
      <PatchSection companyId={companyId} event={event} events={events.data} canEdit={canEdit} />
      {can(company, 'equipment.view') && <EventPowerSection companyId={companyId} event={event} />}
      {can(company, 'equipment.view') && <EventCapsulesSection companyId={companyId} eventId={event.id} canEdit={canEdit} />}
      {can(company, 'vehicles.view') && <EventLoadingSection companyId={companyId} event={event} />}
      <EventCrewSection companyId={companyId} event={event} events={events.data} canEdit={canEdit} />
      <EventTravelSection companyId={companyId} event={event} canEdit={canEdit} />
      <EventLogSection companyId={companyId} event={event} />
      {can(company, 'payouts.manage') && <EventIncomeSection companyId={companyId} eventId={event.id} />}
      <EventPhotosSection companyId={companyId} eventId={event.id} canEdit={canEdit} />
      <EventDocumentsSection companyId={companyId} eventId={event.id} canEdit={false} />
    </>
  )
}
