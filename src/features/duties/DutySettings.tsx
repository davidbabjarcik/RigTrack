import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { ROLE_LABELS, type Role } from '@/lib/roles'
import { cn } from '@/lib/utils'

/** Roly, ktorým sa dá činnosť priradiť. */
const OWNER_ROLES: Role[] = ['technik', 'skladnik', 'helper', 'ceo', 'admin']
import { addDutyTypes, deleteDutyType, dutyKeys, updateDutyType, useDutyTypes } from './api'
import { DEFAULT_DUTIES, DUTY_PHASE_LABELS, DUTY_PHASES, type DutyPhase, type DutyType } from './model'

/** Nastavenia: aké činnosti sa pri eventoch zapisujú (nakladanie, kontrola hliníka…). */
export function DutySettings({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient()
  const types = useDutyTypes(companyId)
  const [name, setName] = useState('')
  const [ownersOf, setOwnersOf] = useState<string | null>(null)
  const members = useMembers(companyId)
  const ownerLabel = (type: DutyType) =>
    [
      ...type.ownerRoles.map((role) => ROLE_LABELS[role as Role] ?? role),
      ...type.ownerIds.map((id) => memberName(members.data, id)).filter(Boolean),
    ].join(', ')
  const refresh = () => queryClient.invalidateQueries({ queryKey: dutyKeys.types(companyId) })
  const list = types.data ?? []
  const nextSort = list.reduce((max, type) => Math.max(max, type.sort), 0) + 1
  const add = useMutation({ mutationFn: (names: string[]) => addDutyTypes(companyId, names, nextSort), onSuccess: () => setName(''), onSettled: refresh })
  const update = useMutation({ mutationFn: ({ id, fields }: { id: string; fields: Partial<DutyType> }) => updateDutyType(id, fields), onSettled: refresh })
  const remove = useMutation({ mutationFn: deleteDutyType, onSettled: refresh })
  // Posun v poradí v rámci fázy: vymenia sa poradové čísla so susedom.
  const swap = (group: DutyType[], index: number, by: -1 | 1) => {
    const a = group[index]
    const b = group[index + by]
    if (!a || !b) return
    update.mutate({ id: a.id, fields: { sort: b.sort === a.sort ? a.sort + by : b.sort } })
    update.mutate({ id: b.id, fields: { sort: a.sort } })
  }

  if (types.isError) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.</p>
  const exists = list.some((type) => type.name.trim().toLowerCase() === name.trim().toLowerCase())

  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="mb-3 text-sm text-muted-foreground">
        Činnosti, ku ktorým sa pri evente zapisujú ľudia – pred eventom (nakladanie), na evente a po evente (vykladanie, kontrola a naskladnenie
        hliníka, kontrola kabeláže). V Štatistikách potom uvidíte, kto čo robil najčastejšie. Vypnutá činnosť sa pri nových eventoch neponúka, ale
        ostane v štatistikách.
      </p>
      {list.length > 0 ? (
        <div className="mb-3 flex flex-col gap-3">
          {DUTY_PHASES.map((phase) => {
            const group = list.filter((type) => type.phase === phase)
            if (group.length === 0) return null
            return (
              <div key={phase}>
                <h4 className="mb-1 text-sm font-medium text-muted-foreground">{DUTY_PHASE_LABELS[phase]}</h4>
                <ul className="divide-y overflow-hidden rounded-lg border">
                  {group.map((type, index) => (
                    <li key={type.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className={type.active ? 'block font-medium' : 'block text-muted-foreground line-through'}>{type.name}</span>
                        <button type="button" className="text-xs text-accent hover:underline" onClick={() => setOwnersOf(ownersOf === type.id ? null : type.id)}>
                          {ownerLabel(type) || 'Komu patrí – nastaviť'}
                        </button>
                      </span>
                      <select
                        aria-label={`Kedy: ${type.name}`}
                        className="h-8 rounded-lg border bg-background px-2 text-sm"
                        value={type.phase}
                        onChange={(event) => update.mutate({ id: type.id, fields: { phase: event.target.value as DutyPhase } })}
                      >
                        {DUTY_PHASES.map((value) => (
                          <option key={value} value={value}>
                            {DUTY_PHASE_LABELS[value]}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1 text-sm">
                        <input type="checkbox" className="size-4" checked={type.active} onChange={(event) => update.mutate({ id: type.id, fields: { active: event.target.checked } })} />
                        Zapnutá
                      </label>
                      <Button variant="ghost" size="sm" aria-label="Posunúť vyššie" disabled={index === 0 || update.isPending} onClick={() => swap(group, index, -1)}>
                        <ArrowUp className="size-4" aria-hidden />
                      </Button>
                      <Button variant="ghost" size="sm" aria-label="Posunúť nižšie" disabled={index === group.length - 1 || update.isPending} onClick={() => swap(group, index, 1)}>
                        <ArrowDown className="size-4" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Zmazať ${type.name}`}
                        disabled={remove.isPending}
                        onClick={() => window.confirm(`Zmazať „${type.name}“? Zmažú sa aj zápisy pri eventoch a zmizne zo štatistík. Ak ju len nechcete ponúkať, vypnite ju.`) && remove.mutate(type.id)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                      {ownersOf === type.id && (
                        <div className="flex w-full flex-col gap-2 rounded-lg bg-muted/40 p-2 text-sm">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="mr-1 text-muted-foreground">Roly:</span>
                            {OWNER_ROLES.map((role) => {
                              const on = type.ownerRoles.includes(role)
                              return (
                                <button
                                  key={role}
                                  type="button"
                                  aria-pressed={on}
                                  className={cn('rounded-full border px-2.5 py-0.5', on ? 'border-accent bg-accent text-accent-foreground' : 'hover:bg-muted')}
                                  onClick={() => update.mutate({ id: type.id, fields: { ownerRoles: on ? type.ownerRoles.filter((value) => value !== role) : [...type.ownerRoles, role] } })}
                                >
                                  {ROLE_LABELS[role]}
                                </button>
                              )
                            })}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="mr-1 text-muted-foreground">Ľudia:</span>
                            {(members.data ?? []).map((member) => {
                              const on = type.ownerIds.includes(member.userId)
                              return (
                                <button
                                  key={member.userId}
                                  type="button"
                                  aria-pressed={on}
                                  className={cn('rounded-full border px-2.5 py-0.5', on ? 'border-accent bg-accent text-accent-foreground' : 'hover:bg-muted')}
                                  onClick={() => update.mutate({ id: type.id, fields: { ownerIds: on ? type.ownerIds.filter((value) => value !== member.userId) : [...type.ownerIds, member.userId] } })}
                                >
                                  {member.fullName || member.email}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="mb-3 rounded-lg border border-dashed p-3 text-sm">
          <p className="mb-2">Zatiaľ žiadne činnosti.</p>
          <Button size="sm" variant="outline" disabled={add.isPending || types.isPending} onClick={() => add.mutate(DEFAULT_DUTIES)}>
            Pridať predvolené: {DEFAULT_DUTIES.join(', ')}
          </Button>
        </div>
      )}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (name.trim() && !exists) add.mutate([name])
        }}
      >
        <Field label="Nová činnosť" className="min-w-48 flex-1" maxLength={60} placeholder="napr. Stavba pódia" value={name} onChange={(event) => setName(event.target.value)} />
        <Button type="submit" disabled={add.isPending || !name.trim() || exists}>
          <Plus className="size-4" aria-hidden />
          Pridať
        </Button>
      </form>
      {exists && <p className="mt-2 text-sm text-muted-foreground">Taká činnosť už je.</p>}
      {(add.isError || update.isError || remove.isError) && <p className="mt-2 text-sm text-destructive">Zmena sa nepodarila.</p>}
    </div>
  )
}
