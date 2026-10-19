import type { Role } from '@/lib/roles'
import { isAdminRole } from '@/lib/roles'

// Zoznam oprávnení a ich predvolených rolí. Musí sedieť s public.permission_defaults()
// v 0030_permissions.sql; zhodu stráži supabase/tests/permissions.test.ts.

/** Roly, ktorým sa dajú oprávnenia meniť. Admin má vždy všetko. */
export const CONFIGURABLE_ROLES = ['skladnik', 'technik', 'viewer'] as const satisfies readonly Role[]
export type ConfigurableRole = (typeof CONFIGURABLE_ROLES)[number]

const ALL: ConfigurableRole[] = ['skladnik', 'technik', 'viewer']
const STAFF: ConfigurableRole[] = ['skladnik', 'technik']
const KEEPER: ConfigurableRole[] = ['skladnik']
const NOBODY: ConfigurableRole[] = []

const group = <const K extends string>(id: string, label: string, permissions: { key: K; label: string; roles: ConfigurableRole[] }[]) => ({
  id,
  label,
  permissions,
})

const crud = <const M extends string>(module: M) =>
  [
    { key: `${module}.view`, label: 'Vidieť', roles: ALL },
    { key: `${module}.edit`, label: 'Pridávať a upravovať', roles: STAFF },
    { key: `${module}.delete`, label: 'Mazať', roles: KEEPER },
  ] as const

export const PERMISSION_GROUPS = [
  group('equipment', 'Technika', [
    ...crud('equipment'),
    { key: 'lookups.manage', label: 'Spravovať kategórie, umiestnenia a farby káblov', roles: KEEPER },
  ]),
  group('cases', 'Cases', [...crud('cases')]),
  group('orders', 'Objednávky a nákupné ceny', [
    { key: 'orders.view', label: 'Vidieť', roles: KEEPER },
    { key: 'orders.edit', label: 'Pridávať a upravovať', roles: KEEPER },
    { key: 'orders.delete', label: 'Mazať', roles: NOBODY },
  ]),
  group('vehicles', 'Vozidlá', [
    { key: 'vehicles.view', label: 'Vidieť', roles: ALL },
    { key: 'vehicles.log', label: 'Zapisovať prevádzku (tankovanie, servis) a prílohy', roles: STAFF },
    { key: 'vehicles.edit', label: 'Pridávať a upravovať vozidlá', roles: KEEPER },
    { key: 'vehicles.delete', label: 'Mazať', roles: NOBODY },
  ]),
  group('loans', 'Výpožičky', [...crud('loans')]),
  group('events', 'Eventy', [...crud('events')]),
  group('service', 'Servis', [...crud('service')]),
  group('tasks', 'Úlohy', [...crud('tasks')]),
  group('shopping', 'Wantlist', [...crud('shopping')]),
  group('suggestions', 'Návrhy', [
    { key: 'suggestions.view', label: 'Vidieť', roles: ALL },
    { key: 'suggestions.add', label: 'Pridávať návrhy a komentáre', roles: ALL },
    { key: 'suggestions.manage', label: 'Meniť stav cudzích návrhov', roles: KEEPER },
    { key: 'suggestions.delete', label: 'Mazať cudzie návrhy a komentáre', roles: NOBODY },
  ]),
  group('payouts', 'Odmeny', [
    { key: 'payouts.view_all', label: 'Vidieť odmeny všetkých členov', roles: NOBODY },
    { key: 'payouts.manage', label: 'Zapisovať a vyplácať odmeny', roles: NOBODY },
  ]),
  group('audit', 'História zmien', [{ key: 'audit.view', label: 'Vidieť', roles: NOBODY }]),
  group('staff', 'Zamestnanci', [
    { key: 'staff.view', label: 'Vidieť tím a kontakty', roles: ALL },
    { key: 'staff.manage', label: 'Spravovať karty a dostupnosť všetkých', roles: KEEPER },
  ]),
]

export type PermissionKey = (typeof PERMISSION_GROUPS)[number]['permissions'][number]['key']

export const PERMISSIONS = PERMISSION_GROUPS.flatMap((item) => item.permissions.map((permission) => ({ ...permission, group: item.label })))

/** Má rola oprávnenie, kým ho admin nezmení? */
export function defaultAllowed(role: Role, permission: PermissionKey) {
  if (isAdminRole(role)) return true
  return PERMISSIONS.some((item) => item.key === permission && (item.roles as Role[]).includes(role))
}

/** Všetky oprávnenia, ktoré rola má od začiatku. */
export function defaultPermissions(role: Role): Set<PermissionKey> {
  return new Set(PERMISSIONS.filter((item) => defaultAllowed(role, item.key)).map((item) => item.key))
}

export type RoleOverride = { role: ConfigurableRole; permission: PermissionKey; allowed: boolean }
export type MemberOverride = { userId: string; permission: PermissionKey; allowed: boolean }

/** Oprávnenie roly po zmenách admina. */
export function roleAllowed(role: Role, permission: PermissionKey, overrides: RoleOverride[]) {
  if (isAdminRole(role)) return true
  return overrides.find((item) => item.role === role && item.permission === permission)?.allowed ?? defaultAllowed(role, permission)
}

/** Výsledné oprávnenie člena: výnimka člena má prednosť pred nastavením roly. */
export function memberAllowed(
  member: { userId: string; role: Role },
  permission: PermissionKey,
  roleOverrides: RoleOverride[],
  memberOverrides: MemberOverride[],
) {
  if (isAdminRole(member.role)) return true
  return (
    memberOverrides.find((item) => item.userId === member.userId && item.permission === permission)?.allowed ??
    roleAllowed(member.role, permission, roleOverrides)
  )
}
