import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { todayIso } from '@/lib/format'
import { canEditInventory } from '@/lib/permissions'
import { eventKeys, saveEvent } from './api'
import { EVENT_STATUS_LABELS, EVENT_STATUSES, eventSchema, type CompanyEvent, type EventFormValues } from './model'
import { useEvents } from './useEvents'

function EventForm({ companyId, current }: { companyId: string; current: CompanyEvent | null }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const today = todayIso()
  const {
    register,
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
    },
  })

  const save = useMutation({
    mutationFn: (values: EventFormValues) => saveEvent(companyId, current?.id ?? null, values),
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: eventKeys.list(companyId) })
      navigate(`/events/${id}`, { replace: true })
    },
  })

  return (
    <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-4">
      <Field label="Názov eventu *" autoFocus={!current} error={errors.name?.message} {...register('name')} />
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
      <TextareaField label="Poznámka" error={errors.note?.message} {...register('note')} />

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
        <p className="text-sm text-muted-foreground">Techniku, posádku a dokumenty pridáte po uložení v detaile eventu.</p>
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
  if (!canEditInventory(company.role)) {
    body = <ErrorBlock message="Na úpravu eventov nemáte oprávnenie." />
  } else if (events.isPending) {
    body = <LoadingBlock />
  } else if (events.isError) {
    body = <ErrorBlock message="Údaje sa nepodarilo načítať." onRetry={() => void events.refetch()} />
  } else if (id && !current) {
    body = <ErrorBlock message="Tento event neexistuje alebo k nemu nemáte prístup." />
  } else {
    body = <EventForm key={id ?? 'new'} companyId={company.companyId} current={current ?? null} />
  }

  return (
    <>
      <PageHeader title={id ? 'Úprava eventu' : 'Nový event'} />
      {body}
    </>
  )
}
