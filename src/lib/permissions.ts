import type { PermissionKey } from '@/features/permissions/catalog'
import { isAdminRole } from '@/lib/roles'
import type { Role } from './roles'

// Zrkadlí public.can() z databázy — tu iba kvôli skrytiu ovládacích prvkov.
// Dáta chráni RLS; zoznam oprávnení člena prichádza z my_permissions().

export type Permitted = { role: Role; permissions: ReadonlySet<string> }

/** Smie člen túto činnosť? Admin smie vždy všetko. */
export function can(member: Permitted, permission: PermissionKey) {
  return isAdminRole(member.role) || member.permissions.has(permission)
}
