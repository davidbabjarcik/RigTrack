export const ROLES = ['admin', 'technik', 'skladnik', 'viewer'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  technik: 'Technik',
  skladnik: 'Skladník',
  viewer: 'Len na čítanie',
}
