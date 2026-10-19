import type { Role } from '@/lib/roles'
import { isAdminRole } from '@/lib/roles'

// Zoznam oprávnení a ich predvolených rolí. Musí sedieť s public.permission_defaults()
// v 0030_permissions.sql; zhodu stráži supabase/tests/permissions.test.ts.

/** Roly, ktorým sa dajú oprávnenia meniť. Admin má vždy všetko. */
export const CONFIGURABLE_ROLES = ['skladnik', 'technik', 'viewer', 'helper'] as const satisfies readonly Role[]
export type ConfigurableRole = (typeof CONFIGURABLE_ROLES)[number]

const ALL: ConfigurableRole[] = ['skladnik', 'technik', 'viewer']
/** Helper (brigádnik) vidí len to najnutnejšie: techniku, cases, svoje eventy, úlohy, tím a návrhy. */
const ALL_AND_HELPER: ConfigurableRole[] = ['skladnik', 'technik', 'viewer', 'helper']
const STAFF: ConfigurableRole[] = ['skladnik', 'technik']
const KEEPER: ConfigurableRole[] = ['skladnik']
const NOBODY: ConfigurableRole[] = []

const group = <const K extends string>(id: string, label: string, permissions: { key: K; label: string; roles: ConfigurableRole[] }[]) => ({
  id,
  label,
  permissions,
})

const crud = <const M extends string>(module: M, viewRoles: ConfigurableRole[] = ALL) =>
  [
    { key: `${module}.view`, label: 'Vidieť', roles: viewRoles },
    { key: `${module}.edit`, label: 'Pridávať a upravovať', roles: STAFF },
    { key: `${module}.delete`, label: 'Mazať', roles: KEEPER },
  ] as const

export const PERMISSION_GROUPS = [
  group('equipment', 'Technika', [
    ...crud('equipment', ALL_AND_HELPER),
    { key: 'lookups.manage', label: 'Spravovať kategórie, umiestnenia a farby káblov', roles: KEEPER },
  ]),
  group('cases', 'Cases', [...crud('cases', ALL_AND_HELPER), { key: 'cases.check', label: 'Kontrolovať obsah cases', roles: STAFF }]),
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
  group('events', 'Eventy (helper vidí len tie, kde je v posádke)', [...crud('events', ALL_AND_HELPER)]),
  group('service', 'Servis', [...crud('service')]),
  group('tasks', 'Úlohy', [...crud('tasks', ALL_AND_HELPER)]),
  group('shopping', 'Wantlist', [...crud('shopping')]),
  group('suggestions', 'Návrhy', [
    { key: 'suggestions.view', label: 'Vidieť', roles: ALL_AND_HELPER },
    { key: 'suggestions.add', label: 'Pridávať návrhy a komentáre', roles: ALL_AND_HELPER },
    { key: 'suggestions.manage', label: 'Meniť stav cudzích návrhov', roles: KEEPER },
    { key: 'suggestions.delete', label: 'Mazať cudzie návrhy a komentáre', roles: NOBODY },
  ]),
  group('payouts', 'Odmeny', [
    { key: 'payouts.view_all', label: 'Vidieť odmeny všetkých členov', roles: NOBODY },
    { key: 'payouts.manage', label: 'Zapisovať a vyplácať odmeny', roles: NOBODY },
  ]),
  group('audit', 'História zmien', [{ key: 'audit.view', label: 'Vidieť', roles: NOBODY }]),
  group('staff', 'Zamestnanci', [
    { key: 'staff.view', label: 'Vidieť tím a kontakty', roles: ALL_AND_HELPER },
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
