import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { formatDate, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { eventKeys, saveEvent } from './api'
import {
  EVENT_STATUS_LABELS,
  EVENT_STATUSES,
  eventSchema,
  pastEventNames,
  previousEdition,
  type CompanyEvent,
  type EventFormValues,
} from './model'
import { useEvents } from './useEvents'

type FormProps = { companyId: string; current: CompanyEvent | null; events: CompanyEvent[] }

function EventForm({ companyId, current, events }: FormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const today = todayIso()
  const {
    register,
    control,
    getValues,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: current?.name ?? '',
      client: current?.client ?? '',
      venue: current?.venue ?? '',
      startsOn: current?.startsOn ?? today,
      endsOn: current?.endsOn ?? today,
      status: current?.status ?? 'planned',
      note: current?.note ?? '',
      organizer: current?.organizer ?? '',
      organizerPerson: current?.organizerPerson ?? '',
      organizerPhone: current?.organizerPhone ?? '',
      organizerEmail: current?.organizerEmail ?? '',
      description: current?.description ?? '',
      getInTime: current?.getInTime ?? '',
      showTime: current?.showTime ?? '',
      showEndTime: current?.showEndTime ?? '',
    },
  })

  // Opakovaná akcia: podľa názvu nájdeme minulý ročník a ponúkneme jeho údaje.
  const name = useWatch({ control, name: 'name' })
  const startsOn = useWatch({ control, name: 'startsOn' })
  const previous = previousEdition(events, { id: current?.id, name, startsOn })
  const copyPrevious = () => {
    if (!previous) return
    for (const key of ['client', 'venue', 'note', 'organizer', 'organizerPerson', 'organizerPhone', 'organizerEmail', 'description'] as const) {
      if (!getValues(key).trim() && previous[key]) setValue(key, previous[key], { shouldDirty: true })
    }
  }

  const save = useMutation({
    mutationFn: (values: EventFormValues) => saveEvent(companyId, current?.id ?? null, values),
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: eventKeys.list(companyId) })
      navigate(`/events/${id}`, { replace: true })
    },
  })

  return (
    <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-4">
      <Field label="Názov eventu *" autoFocus={!current} list="past-event-names" error={errors.name?.message} {...register('name')} />
      <datalist id="past-event-names">
        {pastEventNames(events).map((past) => (
          <option key={past} value={past} />
        ))}
      </datalist>
      {previous && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
          <span className="min-w-0">
            Vyzerá to ako ďalší ročník akcie <strong>{previous.name}</strong> ({formatDate(previous.startsOn)}
            {previous.venue && `, ${previous.venue}`}). Posádka vtedy: {previous.crew.length}, položiek techniky: {previous.equipment.length}.
          </span>
          {(previous.client || previous.venue || previous.note || previous.organizer || previous.description) && (
            <Button variant="outline" size="sm" onClick={copyPrevious}>
              Doplniť údaje z minula
            </Button>
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Klient" error={errors.client?.message} {...register('client')} />
        <Field label="Miesto" placeholder="napr. Dom kultúry Stropkov" error={errors.venue?.message} {...register('venue')} />
        <Field label="Od *" type="date" error={errors.startsOn?.message} {...register('startsOn')} />
        <Field label="Do *" type="date" error={errors.endsOn?.message} {...register('endsOn')} />
        <SelectField label="Stav" error={errors.status?.message} {...register('status')}>
          {EVENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {EVENT_STATUS_LABELS[status]}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Príchod / stavba" type="time" error={errors.getInTime?.message} {...register('getInTime')} />
        <Field label="Začiatok programu" type="time" error={errors.showTime?.message} {...register('showTime')} />
        <Field label="Koniec programu" type="time" error={errors.showEndTime?.message} {...register('showEndTime')} />
      </div>

      <fieldset className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-medium">Organizátor</legend>
        <Field label="Organizátor" placeholder="napr. Mesto Stropkov" error={errors.organizer?.message} {...register('organizer')} />
        <Field label="Kontaktná osoba" error={errors.organizerPerson?.message} {...register('organizerPerson')} />
        <Field label="Telefón" type="tel" autoComplete="off" error={errors.organizerPhone?.message} {...register('organizerPhone')} />
        <Field label="E-mail" type="email" autoComplete="off" error={errors.organizerEmail?.message} {...register('organizerEmail')} />
      </fieldset>

      <TextareaField
        label="Popis eventu"
        placeholder="Program, pódium, prípojka elektriny, príjazd, parkovanie…"
        rows={6}
        error={errors.description?.message}
        {...register('description')}
      />
      <TextareaField label="Interná poznámka" error={errors.note?.message} {...register('note')} />

      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          Uloženie zlyhalo. Skúste to znova.
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Ukladám…' : 'Uložiť'}
        </Button>
        <LinkButton to={current ? `/events/${current.id}` : '/events'} variant="outline">
          Zrušiť
        </LinkButton>
      </div>
      {!current && (
        <p className="text-sm text-muted-foreground">Techniku, posádku, fotky a dokumenty (napr. rider) pridáte po uložení v detaile eventu.</p>
      )}
    </form>
  )
}

export function EventFormPage() {
  const { id } = useParams()
  const company = useCompany().active!
  const events = useEvents(company.companyId)
  const current = id ? events.data?.find((event) => event.id === id) : null

  let body
  if (!can(company, 'events.edit')) {
    body = <ErrorBlock message="Na úpravu eventov nemáte oprávnenie." />
  } else if (events.isPending) {
    body = <LoadingBlock />
  } else if (events.isError) {
    body = <ErrorBlock message="Údaje sa nepodarilo načítať." onRetry={() => void events.refetch()} />
  } else if (id && !current) {
    body = <ErrorBlock message="Tento event neexistuje alebo k nemu nemáte prístup." />
  } else {
    body = <EventForm key={id ?? 'new'} companyId={company.companyId} current={current ?? null} events={events.data} />
  }

  return (
    <>
      <PageHeader title={id ? 'Úprava eventu' : 'Nový event'} />
      {body}
    </>
  )
}
