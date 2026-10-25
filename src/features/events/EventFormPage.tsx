import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { fetchEventPartners, partnerKeys, setEventOrganizer, usePartners } from '@/features/partners/api'
import { NEW_ORGANIZER, OrganizerField } from '@/features/partners/OrganizerField'
import { useCompany } from '@/features/companies/company-context'
import { formatDate, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { eventKeys, notifyNewEvent, saveEvent } from './api'
import {
  EVENT_SETTINGS,
  EVENT_STATUS_LABELS,
  EVENT_STATUSES,
  eventSchema,
  pastEventNames,
  POWER_LABELS,
  POWER_TYPES,
  previousEdition,
  SETTING_LABELS,
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
      setting: current?.setting ?? '',
      power: current?.power ?? '',
      powerCount: current?.powerCount ?? null,
      powerNote: current?.powerNote ?? '',
      weatherPlace: current?.weatherPlace ?? '',
    },
  })

  // Organizátor z Firmy a kontakty: pri úprave sa predvyberie ten, ktorý je pri evente; inak nový podľa textu.
  const partners = usePartners(companyId)
  const linked = useQuery({
    queryKey: partnerKeys.ofEvent(companyId, current?.id ?? 'new'),
    queryFn: () => fetchEventPartners(companyId, current!.id),
    enabled: Boolean(current) && partners.isSuccess,
    retry: false,
  })
  const [pickedOrganizer, setOrganizerChoice] = useState<string | null>(null)
  const linkedOrganizer = linked.data?.find((item) => item.kind === 'organizer')?.partnerId
  const organizerChoice = pickedOrganizer ?? linkedOrganizer ?? (current?.organizer ? NEW_ORGANIZER : '')

  // Opakovaná akcia: podľa názvu nájdeme minulý ročník a ponúkneme jeho údaje.
  const name = useWatch({ control, name: 'name' })
  const startsOn = useWatch({ control, name: 'startsOn' })
  const setting = useWatch({ control, name: 'setting' })
  const venue = useWatch({ control, name: 'venue' })
  const previous = previousEdition(events, { id: current?.id, name, startsOn })
  const copyPrevious = () => {
    if (!previous) return
    for (const key of ['client', 'venue', 'note', 'organizer', 'organizerPerson', 'organizerPhone', 'organizerEmail', 'description'] as const) {
      if (!getValues(key).trim() && previous[key]) setValue(key, previous[key], { shouldDirty: true })
    }
  }

  const save = useMutation({
    mutationFn: async (values: EventFormValues) => {
      // Klient a organizátor sú to isté – klient sa ukladá podľa organizátora (staré eventy si klienta nechajú).
      const id = await saveEvent(companyId, current?.id ?? null, { ...values, client: values.organizer.trim() || values.client })
      // Organizátor do Firmy a kontakty a k eventu (bez migrácie 0059 sa preskočí).
      if (partners.isSuccess) await setEventOrganizer(companyId, id, organizerChoice, values).catch(() => {})
      return id
    },
    onSuccess: async (id) => {
      // Nový event: adminom, čo si to zapli, odíde e-mail (ak e-maily nie sú nastavené, nič sa nestane).
      if (!current) void notifyNewEvent(id)
      // Celá firma: zmenia sa aj novinky.
      await queryClient.invalidateQueries({ queryKey: eventKeys.list(companyId) })
      void queryClient.invalidateQueries({ queryKey: ['company', companyId, 'news'] })
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
        <Field label="Miesto" placeholder="napr. Dom kultúry" error={errors.venue?.message} {...register('venue')} />
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
        <legend className="px-1 text-sm font-medium">Miesto a elektrina</legend>
        <SelectField label="Interiér / exteriér" error={errors.setting?.message} {...register('setting')}>
          <option value="">— nezadané —</option>
          {EVENT_SETTINGS.map((setting) => (
            <option key={setting} value={setting}>
              {SETTING_LABELS[setting]}
            </option>
          ))}
        </SelectField>
        {(setting === 'outdoor' || setting === 'mixed') && (
          <Field
            label="Miesto pre počasie"
            placeholder={venue ? `ak nie ${venue}` : 'napr. Mesto'}
            maxLength={120}
            error={errors.weatherPlace?.message}
            {...register('weatherPlace')}
          />
        )}
        <SelectField label="Elektrická prípojka" error={errors.power?.message} {...register('power')}>
          <option value="">— ešte nevieme —</option>
          {POWER_TYPES.map((power) => (
            <option key={power} value={power}>
              {POWER_LABELS[power]}
            </option>
          ))}
        </SelectField>
        <Field
          label="Počet prípojok"
          type="number"
          min={1}
          max={50}
          error={errors.powerCount?.message}
          {...register('powerCount', { setValueAs: (value) => (value === '' || value == null ? null : Number(value)) })}
        />
        <Field
          label="Poznámka k elektrine"
          className="sm:col-span-2"
          placeholder="napr. 30 m od pódia, istič v kotolni, kontakt na elektrikára"
          maxLength={200}
          error={errors.powerNote?.message}
          {...register('powerNote')}
        />
      </fieldset>

      <OrganizerField
        partners={partners.isSuccess ? partners.data : undefined}
        value={organizerChoice}
        onChange={setOrganizerChoice}
        register={register}
        setValue={setValue}
        errors={errors}
      />

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
