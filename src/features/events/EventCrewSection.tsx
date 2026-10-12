import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { addEventCrew, eventKeys, removeEventCrew } from './api'
import type { CompanyEvent } from './model'

const EXTERNAL = 'external'

type Props = { companyId: string; event: CompanyEvent; canEdit: boolean }

/** Posádka eventu: členovia firmy alebo externisti zapísaní menom, každý s úlohou na akcii. */
export function EventCrewSection({ companyId, event, canEdit }: Props) {
  const queryClient = useQueryClient()
  const members = useMembers(companyId)
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

  const valid = who === EXTERNAL ? name.trim() !== '' : who !== ''
  function handleSubmit(submit: FormEvent) {
    submit.preventDefault()
    if (valid) add.mutate()
  }

  return (
    <section aria-labelledby="event-crew-heading" className="mb-6">
      <h2 id="event-crew-heading" className="mb-2 text-sm font-medium text-muted-foreground">
        Posádka ({event.crew.length})
      </h2>

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

      {(add.isError || remove.isError) && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Zmena sa nepodarila.
        </p>
      )}
    </section>
  )
}
