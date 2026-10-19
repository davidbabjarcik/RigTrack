import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { CalendarX, Check, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { addEventCrew, eventKeys, removeEventCrew, setCrewResponse } from './api'
import { previousEdition, type CompanyEvent, type CrewResponse, type EventCrew } from './model'
import { clashes } from '@/features/staff/model'
import { useStaff } from '@/features/staff/useStaff'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/auth-context'

const EXTERNAL = 'external'

type Props = { companyId: string; event: CompanyEvent; events: CompanyEvent[]; canEdit: boolean }

/** Posádka eventu: členovia firmy alebo externisti zapísaní menom, každý s úlohou na akcii. */
const RESPONSE_TONES: Record<CrewResponse, string> = {
  pending: 'text-muted-foreground',
  yes: 'text-emerald-700 dark:text-emerald-400',
  no: 'text-destructive',
}

/** Stav potvrdenia účasti; pri mne tlačidlá Môžem / Nemôžem (a prečo). */
function CrewResponseLine({ companyId, person, mine }: { companyId: string; person: EventCrew; mine: boolean }) {
  const queryClient = useQueryClient()
  const [declining, setDeclining] = useState(false)
  const [note, setNote] = useState(person.responseNote)
  const respond = useMutation({
    mutationFn: ({ response, text }: { response: CrewResponse; text: string }) => setCrewResponse(person.id, response, text),
    onSuccess: () => setDeclining(false),
    onSettled: () => queryClient.invalidateQueries({ queryKey: eventKeys.list(companyId) }),
  })
  if (!person.memberId) return null
  const text = person.response === 'yes' ? 'Potvrdil(a): môže' : person.response === 'no' ? `Nemôže${person.responseNote ? `: ${person.responseNote}` : ''}` : 'Zatiaľ nepotvrdil(a)'
  return (
    <span className="mt-1 flex flex-col gap-1">
      <span className={cn('text-sm', RESPONSE_TONES[person.response])}>{mine && person.response === 'pending' ? 'Potvrďte, či môžete prísť:' : text}</span>
      {mine && !declining && (
        <span className="flex flex-wrap gap-2">
          <Button size="sm" variant={person.response === 'yes' ? 'default' : 'outline'} disabled={respond.isPending} onClick={() => respond.mutate({ response: 'yes', text: '' })}>
            <Check className="size-4" aria-hidden />
            Môžem
          </Button>
          <Button size="sm" variant={person.response === 'no' ? 'destructive' : 'outline'} disabled={respond.isPending} onClick={() => setDeclining(true)}>
            <X className="size-4" aria-hidden />
            Nemôžem
          </Button>
        </span>
      )}
      {mine && declining && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            respond.mutate({ response: 'no', text: note })
          }}
        >
          <Field label="Prečo nemôžete?" className="min-w-48 flex-1" maxLength={300} autoFocus value={note} onChange={(event) => setNote(event.target.value)} />
          <Button type="submit" size="sm" disabled={respond.isPending || !note.trim()}>
            Odoslať
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDeclining(false)}>
            Zrušiť
          </Button>
        </form>
      )}
      {respond.isError && <span className="text-sm text-destructive">Nepodarilo sa uložiť. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.</span>}
    </span>
  )
}

export function EventCrewSection({ companyId, event, events, canEdit }: Props) {
  const userId = useAuth().session?.user.id
  const queryClient = useQueryClient()
  const members = useMembers(companyId)
  const staff = useStaff(companyId)
  // Kedy človek z posádky v termíne eventu nemôže (podľa karty v Zamestnancoch).
  const awayDuring = (person: EventCrew) => {
    const card = staff.people.find((candidate) =>
      person.memberId ? candidate.memberId === person.memberId : !candidate.isMember && candidate.name.trim().toLowerCase() === person.name.trim().toLowerCase(),
    )
    return card ? clashes(staff.unavailability, card.staffId, event.startsOn, event.endsOn) : []
  }
  const [who, setWho] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const refresh = () => queryClient.invalidateQueries({ queryKey: eventKeys.list(companyId) })

  const add = useMutation({
    mutationFn: () =>
      addEventCrew(companyId, event.id, who === EXTERNAL ? { memberId: null, name, role } : { memberId: who, name: '', role }),
    onSuccess: () => {
      setWho('')
      setName('')
      setRole('')
    },
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: removeEventCrew, onSettled: refresh })
  const again = useMutation({
    mutationFn: (person: EventCrew) => addEventCrew(companyId, event.id, { memberId: person.memberId, name: person.name, role: person.role }),
    onSettled: refresh,
  })

  // Kto bol na minulom ročníku tej istej akcie a tu ešte nie je.
  const previous = previousEdition(events, event)
  const here = new Set(event.crew.map((person) => person.memberId ?? `ext:${person.name.trim().toLowerCase()}`))
  const returning = (previous?.crew ?? []).filter((person) => !here.has(person.memberId ?? `ext:${person.name.trim().toLowerCase()}`))
  const labelOf = (person: EventCrew) => (person.memberId ? memberName(members.data, person.memberId) || 'Bývalý člen' : person.name)

  const valid = who === EXTERNAL ? name.trim() !== '' : who !== ''
  function handleSubmit(submit: FormEvent) {
    submit.preventDefault()
    if (valid) add.mutate()
  }

  return (
    <CollapsibleSection id="event.crew" title={<>Posádka ({event.crew.length})</>}>

      {event.crew.length > 0 && (
        <ul className="mb-3 divide-y overflow-hidden rounded-xl border bg-surface">
          {event.crew.map((person) => {
            const label = person.memberId ? memberName(members.data, person.memberId) || 'Bývalý člen' : person.name
            return (
              <li key={person.id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{label}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[person.role, !person.memberId && 'externista'].filter(Boolean).join(' · ')}
                  </span>
                  <CrewResponseLine companyId={companyId} person={person} mine={person.memberId === userId} />
                  {awayDuring(person).map((period) => (
                    <span key={period.id} className="mt-0.5 flex items-center gap-1 text-sm text-destructive">
                      <CalendarX className="size-4 shrink-0" aria-hidden />
                      V termíne nemôže: {period.startsOn === period.endsOn ? formatDate(period.startsOn) : `${formatDate(period.startsOn)} – ${formatDate(period.endsOn)}`}
                      {period.note && ` (${period.note})`}
                    </span>
                  ))}
                </span>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Odobrať z posádky: ${label}`}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(person.id)}
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {canEdit && previous && returning.length > 0 && (
        <div className="mb-3 rounded-xl border border-accent/40 bg-accent/10 p-3">
          <p className="mb-2 text-sm">
            Minulý ročník ({previous.name}) robili aj títo ľudia. Kliknutím ich pridáte s rovnakou úlohou.
          </p>
          <div className="flex flex-wrap gap-2">
            {returning.map((person) => (
              <Button key={person.id} variant="outline" size="sm" disabled={again.isPending} onClick={() => again.mutate(person)}>
                <Plus className="size-4" aria-hidden />
                {labelOf(person)}
                {person.role && <span className="font-normal text-muted-foreground">· {person.role}</span>}
              </Button>
            ))}
          </div>
        </div>
      )}

      {canEdit ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border bg-surface p-4 sm:flex-row sm:items-end">
          <SelectField label="Kto" className="sm:w-56" value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">— vyberte —</option>
            {(members.data ?? []).map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.fullName || member.email}
              </option>
            ))}
            <option value={EXTERNAL}>Externista (napísať meno)</option>
          </SelectField>
          {who === EXTERNAL && (
            <Field label="Meno" maxLength={80} className="flex-1" value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <Field
            label="Úloha na akcii"
            placeholder="napr. zvukár, osvetľovač"
            maxLength={80}
            className="flex-1"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <Button type="submit" disabled={add.isPending || !valid}>
            Pridať
          </Button>
        </form>
      ) : (
        event.crew.length === 0 && (
          <p className="rounded-xl border border-dashed bg-surface px-6 py-8 text-center text-sm text-muted-foreground">
            Posádka zatiaľ nie je určená.
          </p>
        )
      )}

      {(add.isError || remove.isError || again.isError) && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Zmena sa nepodarila.
        </p>
      )}
    </CollapsibleSection>
  )
}
