import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { SelectField } from '@/components/ui/field'
import type { Member } from '@/features/companies/api'
import { isAdminRole, ROLE_LABELS } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { fetchPermissionOverrides, permissionKeys, setMemberPermission, setRolePermission } from './api'
import {
  CONFIGURABLE_ROLES,
  defaultAllowed,
  PERMISSION_GROUPS,
  roleAllowed,
  type ConfigurableRole,
  type PermissionKey,
} from './catalog'

type Props = { companyId: string; members: Member[] }

/** Nastavenie oprávnení: tabuľka pre roly a výnimky pre jednotlivých členov. Len pre admina. */
export function PermissionsSettings({ companyId, members }: Props) {
  const queryClient = useQueryClient()
  const [memberId, setMemberId] = useState('')
  const overrides = useQuery({ queryKey: permissionKeys.overrides(companyId), queryFn: () => fetchPermissionOverrides(companyId) })
  // Zmena sa týka aj toho, čo vidí sám admin v iných kartách; stačí však jeho vlastné oprávnenia a tento zoznam.
  const refresh = () => queryClient.invalidateQueries({ queryKey: permissionKeys.overrides(companyId) })
  const setRole = useMutation({
    mutationFn: (change: { role: ConfigurableRole; permission: PermissionKey; allowed: boolean | null }) =>
      setRolePermission(companyId, change.role, change.permission, change.allowed),
    onSettled: refresh,
  })
  const setMember = useMutation({
    mutationFn: (change: { userId: string; permission: PermissionKey; allowed: boolean | null }) =>
      setMemberPermission(companyId, change.userId, change.permission, change.allowed),
    onSettled: refresh,
  })
  const busy = setRole.isPending || setMember.isPending

  const roles = overrides.data?.roles ?? []
  const memberOverrides = overrides.data?.members ?? []
  const adjustable = members.filter((member) => !isAdminRole(member.role))
  const selected = adjustable.find((member) => member.userId === memberId)
  const changedRoles = roles.length
  const exceptionsOf = (userId: string) => memberOverrides.filter((item) => item.userId === userId).length

  if (overrides.isPending) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Načítavam oprávnenia…</p>
  if (overrides.isError) {
    return (
      <p role="alert" className="rounded-xl border bg-surface p-4 text-sm text-destructive">
        Oprávnenia sa nepodarilo načítať. Ak ste ešte nespustili migráciu 0030, urobte to.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-sm text-muted-foreground">
          Zaškrtnuté = rola to smie. Bodka označuje zmenu oproti predvolenému stavu ({changedRoles}). Admin smie vždy všetko a členov, pozvánky
          a nastavenia firmy spravuje iba on.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-surface">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-4 py-2 font-medium">Oprávnenie</th>
                {CONFIGURABLE_ROLES.map((role) => (
                  <th key={role} className="w-24 px-2 py-2 text-center font-medium">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((group) => (
                <PermissionGroupRows key={group.id} label={group.label} columns={CONFIGURABLE_ROLES.length + 1}>
                  {group.permissions.map((permission) => (
                    <tr key={permission.key} className="border-b last:border-b-0">
                      <td className="px-4 py-2">{permission.label}</td>
                      {CONFIGURABLE_ROLES.map((role) => {
                        const allowed = roleAllowed(role, permission.key, roles)
                        const changed = allowed !== defaultAllowed(role, permission.key)
                        return (
                          <td key={role} className="px-2 py-2 text-center">
                            <label className="relative inline-flex size-8 cursor-pointer items-center justify-center">
                              <input
                                type="checkbox"
                                className="size-5"
                                aria-label={`${group.label}: ${permission.label} — ${ROLE_LABELS[role]}`}
                                checked={allowed}
                                disabled={busy}
                                onChange={(event) => {
                                  const next = event.target.checked
                                  // Návrat k predvolenému stavu zmenu zmaže, nech tabuľka výnimiek ostáva krátka.
                                  setRole.mutate({ role, permission: permission.key, allowed: next === defaultAllowed(role, permission.key) ? null : next })
                                }}
                              />
                              {changed && <span className="absolute top-0 right-0 size-2 rounded-full bg-accent" title="Zmenené oproti predvolenému" />}
                            </label>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </PermissionGroupRows>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="mb-1 font-medium">Výnimky pre jedného člena</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Výnimka platí len pre vybraného človeka a má prednosť pred nastavením jeho roly.
        </p>
        {adjustable.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">Vo firme nie je nikto okrem adminov.</p>
        ) : (
          <SelectField label="Člen" hideLabel className="mb-3 sm:w-80" value={memberId} onChange={(event) => setMemberId(event.target.value)}>
            <option value="">— vyberte člena —</option>
            {adjustable.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.fullName || member.email} ({ROLE_LABELS[member.role]}
                {exceptionsOf(member.userId) > 0 && `, výnimiek: ${exceptionsOf(member.userId)}`})
              </option>
            ))}
          </SelectField>
        )}
        {selected && (
          <div className="overflow-x-auto rounded-xl border bg-surface">
            <table className="w-full min-w-[30rem] border-collapse text-sm">
              <tbody>
                {PERMISSION_GROUPS.map((group) => (
                  <PermissionGroupRows key={group.id} label={group.label} columns={2}>
                    {group.permissions.map((permission) => {
                      const byRole = roleAllowed(selected.role, permission.key, roles)
                      const own = memberOverrides.find((item) => item.userId === selected.userId && item.permission === permission.key)
                      return (
                        <tr key={permission.key} className="border-b last:border-b-0">
                          <td className="px-4 py-2">{permission.label}</td>
                          <td className="w-56 px-2 py-1.5">
                            <select
                              aria-label={`${group.label}: ${permission.label}`}
                              className={cn(
                                'h-9 w-full rounded-lg border bg-surface px-2 text-sm',
                                own && (own.allowed ? 'border-emerald-500 font-medium' : 'border-destructive font-medium'),
                              )}
                              disabled={busy}
                              value={own ? (own.allowed ? 'allow' : 'deny') : 'role'}
                              onChange={(event) =>
                                setMember.mutate({
                                  userId: selected.userId,
                                  permission: permission.key,
                                  allowed: event.target.value === 'role' ? null : event.target.value === 'allow',
                                })
                              }
                            >
                              <option value="role">Podľa roly ({byRole ? 'smie' : 'nesmie'})</option>
                              <option value="allow">Povoliť</option>
                              <option value="deny">Zakázať</option>
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </PermissionGroupRows>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(setRole.isError || setMember.isError) && (
        <p role="alert" className="text-sm text-destructive">
          Zmenu sa nepodarilo uložiť.
        </p>
      )}
    </div>
  )
}

function PermissionGroupRows({ label, columns, children }: { label: string; columns: number; children: React.ReactNode }) {
  return (
    <>
      <tr className="border-b bg-muted/60">
        <th colSpan={columns} scope="colgroup" className="px-4 py-1.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </th>
      </tr>
      {children}
    </>
  )
}
