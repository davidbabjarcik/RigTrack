export const ROLES = ['admin', 'ceo', 'technik', 'skladnik', 'viewer'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  ceo: 'CEO',
  technik: 'Technik',
  skladnik: 'Skladník',
  viewer: 'Len na čítanie',
}

/** Admin a CEO smú vo firme všetko (CEO má práva admina, len iný názov). */
export function isAdminRole(role: Role | string | null | undefined) {
  return role === 'admin' || role === 'ceo'
}
