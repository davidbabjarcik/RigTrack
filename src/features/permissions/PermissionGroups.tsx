import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import type { Member } from '@/features/companies/api'
import { isAdminRole, ROLE_LABELS } from '@/lib/roles'
import { addPermissionGroup, deletePermissionGroup, permissionKeys, renamePermissionGroup, setGroupMember } from './api'
import type { PermissionGroup } from './catalog'

type Props = { companyId: string; groups: PermissionGroup[]; members: Member[] }

/** Skupiny ľudí: vytvorenie, premenovanie, členovia. Čo skupina smie, sa zaškrtáva v tabuľke nižšie. */
export function PermissionGroups({ companyId, groups, members }: Props) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [adding, setAdding] = useState<Record<string, string>>({})
  const refresh = () => queryClient.invalidateQueries({ queryKey: permissionKeys.groups(companyId) })
  const create = useMutation({ mutationFn: () => addPermissionGroup(companyId, name), onSuccess: () => setName(''), onSettled: refresh })
  const rename = useMutation({ mutationFn: ({ id, value }: { id: string; value: string }) => renamePermissionGroup(id, value), onSettled: refresh })
  const remove = useMutation({ mutationFn: deletePermissionGroup, onSettled: refresh })
  const member = useMutation({
    mutationFn: ({ groupId, userId, add }: { groupId: string; userId: string; add: boolean }) => setGroupMember(companyId, groupId, userId, add),
    onSettled: refresh,
  })
  const busy = create.isPending || rename.isPending || remove.isPending || member.isPending
  const exists = groups.some((group) => group.name.trim().toLowerCase() === name.trim().toLowerCase())
  // Admin a CEO smú vždy všetko, do skupín ich netreba dávať.
  const adjustable = members.filter((item) => !isAdminRole(item.role))
  const nameOf = (userId: string) => {
    const found = members.find((item) => item.userId === userId)
    return found ? found.fullName || found.email : 'Bývalý člen'
  }

  return (
    <div>
      <h3 className="mb-1 font-medium">Skupiny ľudí</h3>
      <p className="mb-3 text-sm text-muted-foreground">
        Napr. Zvukári, Šoféri alebo Vedúci akcií. Člen skupiny smie to, čo jeho rola, a navyše všetko, čo má skupina zaškrtnuté v tabuľke. Jeden
        človek môže byť vo viacerých skupinách.
      </p>
      {groups.length > 0 && (
        <ul className="mb-3 flex flex-col gap-3">
          {groups.map((group) => {
            const candidates = adjustable.filter((item) => !group.members.includes(item.userId))
            return (
              <li key={group.id} className="rounded-xl border bg-surface p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <Field
                    key={group.name}
                    label="Názov skupiny"
                    hideLabel
                    className="min-w-40 flex-1"
                    maxLength={40}
                    defaultValue={group.name}
                    onBlur={(event) => {
                      const value = event.target.value.trim()
                      if (value && value !== group.name) rename.mutate({ id: group.id, value })
                      else event.target.value = group.name
                    }}
                  />
                  <span className="text-sm text-muted-foreground">oprávnení: {group.permissions.length}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Zmazať skupinu ${group.name}`}
                    disabled={busy}
                    onClick={() => window.confirm(`Zmazať skupinu „${group.name}“? Jej členovia prídu o oprávnenia, ktoré im dávala.`) && remove.mutate(group.id)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {group.members.length === 0 && <span className="text-sm text-muted-foreground">Zatiaľ nikto.</span>}
                  {group.members.map((userId) => (
                    <span key={userId} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-sm">
                      {nameOf(userId)}
                      <button
                        type="button"
                        aria-label={`Odobrať zo skupiny: ${nameOf(userId)}`}
                        className="text-muted-foreground hover:text-foreground"
                        disabled={busy}
                        onClick={() => member.mutate({ groupId: group.id, userId, add: false })}
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </span>
                  ))}
                  {candidates.length > 0 && (
                    <select
                      aria-label={`Pridať do skupiny ${group.name}`}
                      className="h-8 rounded-lg border bg-background px-2 text-sm"
                      value={adding[group.id] ?? ''}
                      disabled={busy}
                      onChange={(event) => {
                        const userId = event.target.value
                        setAdding({ ...adding, [group.id]: '' })
                        if (userId) member.mutate({ groupId: group.id, userId, add: true })
                      }}
                    >
                      <option value="">+ pridať člena</option>
                      {candidates.map((item) => (
                        <option key={item.userId} value={item.userId}>
                          {item.fullName || item.email} ({ROLE_LABELS[item.role]})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (name.trim() && !exists) create.mutate()
        }}
      >
        <Field label="Nová skupina" className="min-w-48 flex-1" maxLength={40} placeholder="napr. Šoféri" value={name} onChange={(event) => setName(event.target.value)} />
        <Button type="submit" disabled={busy || !name.trim() || exists}>
          <Plus className="size-4" aria-hidden />
          Vytvoriť
        </Button>
      </form>
      {exists && <p className="mt-2 text-sm text-muted-foreground">Taká skupina už je.</p>}
      {(create.isError || rename.isError || remove.isError || member.isError) && <p className="mt-2 text-sm text-destructive">Zmenu sa nepodarilo uložiť.</p>}
    </div>
  )
}
