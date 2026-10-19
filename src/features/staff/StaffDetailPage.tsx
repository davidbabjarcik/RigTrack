import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { ArrowLeft, Mail, Phone, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { AddToContactsButton } from '@/components/share/ShareButtons'
import { Button } from '@/components/ui/button'
import { Field, TextareaField } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { discardPhotoFile } from '@/features/equipment/photo'
import { PhotoBlock } from '@/features/equipment/PhotoBlock'
import { useEvents } from '@/features/events/useEvents'
import { formatDate, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { ROLE_LABELS } from '@/lib/roles'
import { useMembers } from '@/features/companies/useMembers'
import { addUnavailability, clearStaffPhoto, deleteStaff, deleteUnavailability, saveStaff, setStaffPhoto, staffKeys, type StaffFields } from './api'
import { LICENCES, upcomingEvents, upcomingPeriods, type Person } from './model'
import { NameDayField } from './NameDayField'
import { formatNameDay } from './celebrations'
import { cn } from '@/lib/utils'
import { SocialLinks } from './SocialLinks'
import { StaffDevices, StaffOverview, StaffOwnGear, StaffPastEvents } from './StaffExtras'
import { useStaff } from './useStaff'

function Details({ companyId, person, canEdit }: { companyId: string; person: Person; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [fields, setFields] = useState<StaffFields>({
    name: person.isMember ? '' : person.name,
    position: person.position,
    phone: person.phone,
    email: person.email,
    skills: person.skills,
    note: person.note,
    active: person.active,
    birthDate: person.birthDate ?? '',
    nameDay: person.nameDay,
    licences: person.licences,
  })
  const set = (patch: Partial<StaffFields>) => setFields((current) => ({ ...current, ...patch }))
  const refresh = () => queryClient.invalidateQueries({ queryKey: staffKeys.list(companyId) })
  const save = useMutation({
    mutationFn: () => saveStaff(companyId, person.staffId, person.memberId, fields),
    onSuccess: async (id) => {
      await refresh()
      if (!person.staffId) navigate(`/staff/${id}`, { replace: true })
    },
  })
  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate()
  }

  if (!canEdit) {
    const rows: [string, string][] = [
      ['Pozícia', person.position],
      ['Narodeniny', person.birthDate ? formatDate(person.birthDate) : ''],
      ['Meniny', formatNameDay(person.nameDay)],
      ['Vodičák', person.licences.join(', ')],
      ['Zručnosti', person.skills],
      ['Poznámka', person.note],
    ]
    return (
      <dl className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="whitespace-pre-wrap">{value}</dd>
            </div>
          ))}
        {rows.every(([, value]) => !value) && <p className="text-sm text-muted-foreground">Zatiaľ bez ďalších údajov.</p>}
      </dl>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
      {!person.isMember && <Field label="Meno *" maxLength={120} value={fields.name} onChange={(event) => set({ name: event.target.value })} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Pozícia" placeholder="napr. Osvetľovač, Zvukár, Stagehand" maxLength={80} value={fields.position} onChange={(event) => set({ position: event.target.value })} />
        <Field label="Telefón" type="tel" maxLength={40} value={fields.phone} onChange={(event) => set({ phone: event.target.value })} />
        <Field label="E-mail na kontakt" type="email" maxLength={120} value={fields.email} onChange={(event) => set({ email: event.target.value })} />
        <label className="flex items-center gap-2 self-end pb-3 text-sm">
          <input type="checkbox" className="size-4" checked={fields.active} onChange={(event) => set({ active: event.target.checked })} />
          Aktívny v tíme
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Dátum narodenia" type="date" value={fields.birthDate ?? ''} onChange={(event) => set({ birthDate: event.target.value })} />
        <NameDayField value={fields.nameDay ?? ''} onChange={(nameDay) => set({ nameDay })} />
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Vodičský preukaz</legend>
        <div className="flex flex-wrap gap-1.5">
          {LICENCES.map((licence) => {
            const on = (fields.licences ?? []).includes(licence)
            return (
              <button
                key={licence}
                type="button"
                aria-pressed={on}
                onClick={() => set({ licences: on ? (fields.licences ?? []).filter((item) => item !== licence) : [...(fields.licences ?? []), licence] })}
                className={cn('h-9 min-w-11 rounded-lg border px-2 text-sm font-medium', on ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
              >
                {licence}
              </button>
            )
          })}
        </div>
      </fieldset>
      <TextareaField
        label="Zručnosti"
        rows={2}
        placeholder="napr. práca vo výškach, GrandMA, X32"
        maxLength={500}
        value={fields.skills}
        onChange={(event) => set({ skills: event.target.value })}
      />
      <TextareaField label="Poznámka" rows={2} maxLength={1000} value={fields.note} onChange={(event) => set({ note: event.target.value })} />
      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          Uloženie zlyhalo.
        </p>
      )}
      {save.isSuccess && <p role="status" className="text-sm text-muted-foreground">Uložené.</p>}
      <Button type="submit" className="self-start" disabled={save.isPending || (!person.isMember && !fields.name.trim())}>
        {save.isPending ? 'Ukladám…' : 'Uložiť'}
      </Button>
    </form>
  )
}

function Availability({ companyId, person, canEdit }: { companyId: string; person: Person; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const staff = useStaff(companyId)
  const today = todayIso()
  const [period, setPeriod] = useState({ startsOn: today, endsOn: today, note: '' })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['company', companyId, 'staff'] })
  const add = useMutation({
    mutationFn: async () => {
      // Člen bez karty ju pri prvom zápise dostane.
      const staffId = person.staffId ?? (await saveStaff(companyId, null, person.memberId, { name: '', position: '', phone: '', email: '', skills: '', note: '', active: true }))
      await addUnavailability(companyId, staffId, period)
    },
    onSuccess: () => setPeriod({ startsOn: today, endsOn: today, note: '' }),
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: deleteUnavailability, onSettled: refresh })
  const periods = upcomingPeriods(staff.unavailability, person.staffId, today)

  return (
    <CollapsibleSection id="staff.unavailability" title="Kedy nemôže">
      {periods.length > 0 ? (
        <ul className="mb-3 divide-y overflow-hidden rounded-xl border bg-surface">
          {periods.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-2">
              <span className="min-w-0 flex-1">
                <span className="font-medium">{item.startsOn === item.endsOn ? formatDate(item.startsOn) : `${formatDate(item.startsOn)} – ${formatDate(item.endsOn)}`}</span>
                {item.note && <span className="ml-2 text-sm text-muted-foreground">{item.note}</span>}
              </span>
              {canEdit && (
                <Button variant="ghost" size="sm" aria-label="Zmazať obdobie" disabled={remove.isPending} onClick={() => remove.mutate(item.id)}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-muted-foreground">Nič zapísané – môže kedykoľvek.</p>
      )}
      {canEdit && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-surface p-3">
          <Field label="Od" type="date" value={period.startsOn} onChange={(event) => setPeriod({ ...period, startsOn: event.target.value, endsOn: period.endsOn < event.target.value ? event.target.value : period.endsOn })} />
          <Field label="Do" type="date" min={period.startsOn} value={period.endsOn} onChange={(event) => setPeriod({ ...period, endsOn: event.target.value })} />
          <Field label="Dôvod (nepovinné)" className="min-w-40 flex-1" placeholder="dovolenka, škola…" maxLength={200} value={period.note} onChange={(event) => setPeriod({ ...period, note: event.target.value })} />
          <Button disabled={add.isPending || !period.startsOn || period.endsOn < period.startsOn} onClick={() => add.mutate()}>
            Zapísať
          </Button>
          {add.isError && <p className="w-full text-sm text-destructive">Zápis sa nepodaril.</p>}
        </div>
      )}
    </CollapsibleSection>
  )
}

/** Detail človeka z tímu: fotka, kontakt, údaje, kedy nemôže a na ktorých eventoch je. */
export function StaffDetailPage() {
  const { key = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const userId = useAuth().session!.user.id
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const staff = useStaff(companyId)
  const members = useMembers(companyId)
  const events = useEvents(companyId)
  const remove = useMutation({
    mutationFn: (staffId: string) => deleteStaff(companyId, staffId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: staffKeys.list(companyId) })
      navigate('/staff', { replace: true })
    },
  })

  const back = (
    <Link to="/staff" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      Zamestnanci
    </Link>
  )
  if (staff.isPending) return <LoadingBlock />
  const person = staff.people.find((candidate) => candidate.key === key || (candidate.memberId && `m-${candidate.memberId}` === key))
  if (!person) {
    return (
      <>
        {back}
        <ErrorBlock message="Tento človek v tíme nie je alebo k nemu nemáte prístup." />
      </>
    )
  }
  const canManage = can(company, 'staff.manage')
  const canEdit = canManage || person.memberId === userId
  const role = members.data?.find((member) => member.userId === person.memberId)?.role
  const assigned = upcomingEvents(events.data ?? [], person.memberId, todayIso())

  return (
    <>
      {back}
      <header className="mb-6 flex flex-wrap items-start gap-4">
        <div className="w-40 shrink-0">
          {person.staffId ? (
            <PhotoBlock
              queryKey={[...staffKeys.list(companyId), person.staffId]}
              name={person.name}
              photoPath={person.photoPath}
              canEdit={canEdit}
              onUpload={async (file) => {
                await setStaffPhoto(companyId, person.staffId!, file)
                if (person.photoPath) await discardPhotoFile(person.photoPath).catch(() => {})
              }}
              onRemove={async () => {
                await clearStaffPhoto(companyId, person.staffId!)
                if (person.photoPath) await discardPhotoFile(person.photoPath).catch(() => {})
              }}
              onChanged={() => queryClient.invalidateQueries({ queryKey: staffKeys.list(companyId) })}
            />
          ) : (
            canEdit && <p className="text-xs text-muted-foreground">Fotku pridáte po prvom uložení údajov.</p>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{person.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {[person.position, role && ROLE_LABELS[role], !person.isMember && 'brigádnik bez účtu', !person.active && 'neaktívny'].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-2 flex flex-col gap-1 text-sm">
            {person.phone && (
              <a href={`tel:${person.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 text-accent hover:underline">
                <Phone className="size-4" aria-hidden />
                {person.phone}
              </a>
            )}
            {(person.email || person.accountEmail) && (
              <a href={`mailto:${person.email || person.accountEmail}`} className="inline-flex items-center gap-2 text-accent hover:underline">
                <Mail className="size-4" aria-hidden />
                {person.email || person.accountEmail}
              </a>
            )}
            <AddToContactsButton
              className="mt-1 self-start"
              contact={{ name: person.name, title: person.position, phone: person.phone, email: person.email || person.accountEmail, note: person.skills }}
            />
          </div>
        </div>
        {canManage && person.staffId && !person.isMember && (
          <Button
            variant="destructive"
            size="sm"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(`Odstrániť ${person.name} zo zoznamu?`)) remove.mutate(person.staffId!)
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Odstrániť
          </Button>
        )}
      </header>

      <div className="mb-6">
        <Details key={person.staffId ?? person.key} companyId={companyId} person={person} canEdit={canEdit} />
      </div>

      <Availability companyId={companyId} person={person} canEdit={canEdit} />

      {person.memberId && (
        <CollapsibleSection id="staff.events" title="Najbližšie eventy">
          {assigned.length === 0 ? (
            <p className="text-sm text-muted-foreground">Zatiaľ nie je v posádke žiadneho nadchádzajúceho eventu.</p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
              {assigned.map((event) => (
                <li key={event.id}>
                  <Link to={`/events/${event.id}`} className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-muted">
                    <span className="min-w-0 truncate font-medium">{event.name}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {formatDate(event.startsOn)}
                      {event.crew.find((crew) => crew.memberId === person.memberId)?.role && ` · ${event.crew.find((crew) => crew.memberId === person.memberId)!.role}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>
      )}

      {person.staffId && <SocialLinks companyId={companyId} staffId={person.staffId} canEdit={canEdit} />}
      <StaffOverview companyId={companyId} person={person} events={events.data ?? []} userId={userId} />
      <StaffPastEvents person={person} events={events.data ?? []} />
      <StaffDevices companyId={companyId} person={person} userId={userId} />
      <StaffOwnGear companyId={companyId} person={person} />
    </>
  )
}
