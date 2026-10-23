import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { memberName, useMembers } from '@/features/companies/useMembers'
import type { CompanyEvent } from '@/features/events/model'
import { addDuty, dutyKeys, removeDuty, useDutyTypes, useEventDuties } from './api'
import type { DutyType, EventDuty } from './model'

const EXTERNAL = 'external'

type Props = { companyId: string; event: CompanyEvent; canEdit: boolean }

/** Kto pri evente čo robil: nakladanie, vykladanie, kontrola hliníka… (činnosti sa nastavujú v Nastaveniach). */
export function EventDutiesSection({ companyId, event, canEdit }: Props) {
  const userId = useAuth().session?.user.id
  const queryClient = useQueryClient()
  const types = useDutyTypes(companyId)
  const duties = useEventDuties(companyId, event.id)
  const members = useMembers(companyId)
  const [adding, setAdding] = useState<{ typeId: string; who: string; name: string } | null>(null)
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: dutyKeys.ofEvent(companyId, event.id) })
    void queryClient.invalidateQueries({ queryKey: dutyKeys.all(companyId) })
  }
  const add = useMutation({
    mutationFn: ({ typeId, person }: { typeId: string; person: { memberId: string } | { name: string } }) => addDuty(companyId, event.id, typeId, person),
    onSuccess: () => setAdding(null),
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: removeDuty, onSettled: refresh })

  if (types.isError || duties.isError || !types.data) return null
  const all = duties.data ?? []
  // Ponúkajú sa zapnuté činnosti a tie vypnuté, ktoré už pri evente niekto má.
  const shown = types.data.filter((type) => type.active || all.some((duty) => duty.dutyTypeId === type.id))
  if (shown.length === 0) return null
  const crew = event.crew.some((person) => person.memberId === userId && person.response !== 'no')
  const label = (duty: EventDuty) => (duty.memberId ? memberName(members.data, duty.memberId) || 'Bývalý člen' : duty.personName)
  // Najprv ľudia z posádky eventu, potom ostatní členovia.
  const crewIds = new Set(event.crew.map((person) => person.memberId).filter(Boolean))
  const people = [...(members.data ?? [])].sort((a, b) => Number(crewIds.has(b.userId)) - Number(crewIds.has(a.userId)))
  const externals = event.crew.filter((person) => !person.memberId && person.name.trim())
  const count = all.length

  const addRow = (type: DutyType) => {
    if (!adding || adding.typeId !== type.id) return null
    const submit = () => {
      if (adding.who === EXTERNAL) {
        if (adding.name.trim()) add.mutate({ typeId: type.id, person: { name: adding.name } })
      } else if (adding.who.startsWith('ext:')) {
        add.mutate({ typeId: type.id, person: { name: adding.who.slice(4) } })
      } else if (adding.who) {
        add.mutate({ typeId: type.id, person: { memberId: adding.who } })
      }
    }
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          aria-label="Kto"
          className="h-9 rounded-lg border bg-background px-2 text-sm"
          value={adding.who}
          onChange={(e) => setAdding({ ...adding, who: e.target.value })}
        >
          <option value="">— vyberte —</option>
          {people.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.fullName || member.email}
              {crewIds.has(member.userId) ? ' (posádka)' : ''}
            </option>
          ))}
          {externals.map((person) => (
            <option key={person.id} value={`ext:${person.name}`}>
              {person.name} (externista)
            </option>
          ))}
          <option value={EXTERNAL}>Iný externista (napísať meno)</option>
        </select>
        {adding.who === EXTERNAL && (
          <input
            aria-label="Meno"
            className="h-9 min-w-40 flex-1 rounded-lg border bg-background px-2 text-sm"
            maxLength={80}
            placeholder="Meno"
            value={adding.name}
            onChange={(e) => setAdding({ ...adding, name: e.target.value })}
          />
        )}
        <Button size="sm" disabled={add.isPending || !adding.who || (adding.who === EXTERNAL && !adding.name.trim())} onClick={submit}>
          Pridať
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAdding(null)}>
          Zrušiť
        </Button>
      </div>
    )
  }

  return (
    <CollapsibleSection id="event.duties" title={<>Kto čo robil ({count})</>}>
      <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
        {shown.map((type) => {
          const here = all.filter((duty) => duty.dutyTypeId === type.id)
          const mine = here.some((duty) => duty.memberId === userId)
          return (
            <li key={type.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 font-medium">{type.name}</span>
                {here.map((duty) => (
                  <span key={duty.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-sm">
                    {label(duty)}
                    {(canEdit || duty.memberId === userId) && (
                      <button type="button" aria-label={`Odobrať: ${label(duty)}`} className="text-muted-foreground hover:text-foreground" disabled={remove.isPending} onClick={() => remove.mutate(duty.id)}>
                        <X className="size-3.5" aria-hidden />
                      </button>
                    )}
                  </span>
                ))}
                {here.length === 0 && <span className="text-sm text-muted-foreground">nikto</span>}
                {canEdit && type.active && adding?.typeId !== type.id && (
                  <Button size="sm" variant="ghost" aria-label={`Pridať človeka: ${type.name}`} onClick={() => setAdding({ typeId: type.id, who: '', name: '' })}>
                    <Plus className="size-4" aria-hidden />
                  </Button>
                )}
                {!canEdit && crew && !mine && type.active && userId && (
                  <Button size="sm" variant="outline" disabled={add.isPending} onClick={() => add.mutate({ typeId: type.id, person: { memberId: userId } })}>
                    <Plus className="size-4" aria-hidden />
                    Robil(a) som
                  </Button>
                )}
              </div>
              {addRow(type)}
            </li>
          )
        })}
      </ul>
      {(add.isError || remove.isError) && <p className="mt-2 text-sm text-destructive">Zmena sa nepodarila.</p>}
    </CollapsibleSection>
  )
}
