import { getSupabase } from '@/lib/supabase/client'
import type { ConfigurableRole, MemberOverride, PermissionGroup, PermissionKey, RoleOverride } from './catalog'

export const permissionKeys = {
  mine: (companyId: string) => ['company', companyId, 'my-permissions'] as const,
  overrides: (companyId: string) => ['company', companyId, 'permission-overrides'] as const,
  groups: (companyId: string) => ['company', companyId, 'permission-groups'] as const,
}

/** Oprávnenia prihláseného člena vo firme, už po zmenách admina. */
export async function fetchMyPermissions(companyId: string): Promise<string[]> {
  const { data, error } = await getSupabase().rpc('my_permissions', { _company_id: companyId })
  if (error) throw error
  return data as string[]
}

/** Zmeny oproti predvolenému stavu: pre roly a pre jednotlivých členov. Číta iba admin. */
export async function fetchPermissionOverrides(companyId: string): Promise<{ roles: RoleOverride[]; members: MemberOverride[] }> {
  const db = getSupabase()
  const [roles, members] = await Promise.all([
    db.from('role_permissions').select('role, permission, allowed').eq('company_id', companyId),
    db.from('member_permissions').select('user_id, permission, allowed').eq('company_id', companyId),
  ])
  const error = roles.error ?? members.error
  if (error) throw error
  return {
    roles: roles.data as RoleOverride[],
    members: (members.data as { user_id: string; permission: PermissionKey; allowed: boolean }[]).map((row) => ({
      userId: row.user_id,
      permission: row.permission,
      allowed: row.allowed,
    })),
  }
}

// Zmena = zmazať doterajší riadok a prípadne vložiť nový. Upsert by menil stĺpce kľúča,
// na ktoré aplikácia nemá UPDATE.

/** `allowed = null` vráti rolu k predvolenému stavu. */
export async function setRolePermission(companyId: string, role: ConfigurableRole, permission: PermissionKey, allowed: boolean | null) {
  const table = getSupabase().from('role_permissions')
  const cleared = await table.delete().eq('company_id', companyId).eq('role', role).eq('permission', permission)
  if (cleared.error) throw cleared.error
  if (allowed === null) return
  const { error } = await table.insert({ company_id: companyId, role, permission, allowed })
  if (error) throw error
}

/** `allowed = null` zruší výnimku člena; platí preň znova nastavenie roly. */
export async function setMemberPermission(companyId: string, userId: string, permission: PermissionKey, allowed: boolean | null) {
  const table = getSupabase().from('member_permissions')
  const cleared = await table.delete().eq('company_id', companyId).eq('user_id', userId).eq('permission', permission)
  if (cleared.error) throw cleared.error
  if (allowed === null) return
  const { error } = await table.insert({ company_id: companyId, user_id: userId, permission, allowed })
  if (error) throw error
}

/** Skupiny ľudí s ich členmi a oprávneniami (0079). Číta iba admin. */
export async function fetchPermissionGroups(companyId: string): Promise<PermissionGroup[]> {
  const db = getSupabase()
  const [groups, members, rules] = await Promise.all([
    db.from('permission_groups').select('id, name').eq('company_id', companyId).order('name'),
    db.from('permission_group_members').select('group_id, user_id').eq('company_id', companyId),
    db.from('permission_group_rules').select('group_id, permission').eq('company_id', companyId),
  ])
  const error = groups.error ?? members.error ?? rules.error
  if (error) throw error
  const memberRows = members.data as { group_id: string; user_id: string }[]
  const ruleRows = rules.data as { group_id: string; permission: PermissionKey }[]
  return (groups.data as { id: string; name: string }[]).map((group) => ({
    id: group.id,
    name: group.name,
    members: memberRows.filter((row) => row.group_id === group.id).map((row) => row.user_id),
    permissions: ruleRows.filter((row) => row.group_id === group.id).map((row) => row.permission),
  }))
}

export async function addPermissionGroup(companyId: string, name: string) {
  const { error } = await getSupabase().from('permission_groups').insert({ company_id: companyId, name: name.trim() })
  if (error) throw error
}

export async function renamePermissionGroup(id: string, name: string) {
  const { error } = await getSupabase().from('permission_groups').update({ name: name.trim() }).eq('id', id)
  if (error) throw error
}

export async function deletePermissionGroup(id: string) {
  const { error } = await getSupabase().from('permission_groups').delete().eq('id', id)
  if (error) throw error
}

export async function setGroupMember(companyId: string, groupId: string, userId: string, member: boolean) {
  const table = getSupabase().from('permission_group_members')
  const { error } = member
    ? await table.insert({ company_id: companyId, group_id: groupId, user_id: userId })
    : await table.delete().eq('group_id', groupId).eq('user_id', userId)
  if (error && error.code !== '23505') throw error
}

export async function setGroupPermission(companyId: string, groupId: string, permission: PermissionKey, allowed: boolean) {
  const table = getSupabase().from('permission_group_rules')
  const { error } = allowed
    ? await table.insert({ company_id: companyId, group_id: groupId, permission })
    : await table.delete().eq('group_id', groupId).eq('permission', permission)
  if (error && error.code !== '23505') throw error
}
