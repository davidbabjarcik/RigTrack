import { getSupabase } from '@/lib/supabase/client'
import type { ConfigurableRole, MemberOverride, PermissionKey, RoleOverride } from './catalog'

export const permissionKeys = {
  mine: (companyId: string) => ['company', companyId, 'my-permissions'] as const,
  overrides: (companyId: string) => ['company', companyId, 'permission-overrides'] as const,
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
