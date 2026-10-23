import { describe, expect, it } from 'vitest'
import { visibleNavItems } from '@/lib/navigation'
import { can } from '@/lib/permissions'
import { defaultAllowed, defaultPermissions, memberAllowed, PERMISSIONS, roleAllowed, type MemberOverride, type RoleOverride } from './catalog'

describe('default permissions', () => {
  it('mirror the roles the application started with', () => {
    expect(defaultAllowed('viewer', 'equipment.view')).toBe(true)
    expect(defaultAllowed('viewer', 'equipment.edit')).toBe(false)
    expect(defaultAllowed('technik', 'loans.edit')).toBe(true)
    expect(defaultAllowed('technik', 'orders.view')).toBe(false)
    expect(defaultAllowed('skladnik', 'orders.view')).toBe(true)
    expect(defaultAllowed('skladnik', 'payouts.view_all')).toBe(false)
    expect(defaultPermissions('admin').size).toBe(PERMISSIONS.length)
  })

  it('have unique keys', () => {
    expect(new Set(PERMISSIONS.map((item) => item.key)).size).toBe(PERMISSIONS.length)
  })
})

describe('overrides', () => {
  const roles: RoleOverride[] = [
    { role: 'viewer', permission: 'loans.edit', allowed: true },
    { role: 'technik', permission: 'equipment.delete', allowed: true },
  ]
  const members: MemberOverride[] = [
    { userId: 'jano', permission: 'orders.view', allowed: true },
    { userId: 'jano', permission: 'equipment.delete', allowed: false },
  ]

  it('apply a role setting over the default', () => {
    expect(roleAllowed('viewer', 'loans.edit', roles)).toBe(true)
    expect(roleAllowed('viewer', 'loans.delete', roles)).toBe(false)
    expect(roleAllowed('admin', 'orders.delete', [])).toBe(true)
  })

  it('let an exception for one member win over the role', () => {
    const jano = { userId: 'jano', role: 'technik' as const }
    const fero = { userId: 'fero', role: 'technik' as const }
    expect(memberAllowed(jano, 'orders.view', roles, members)).toBe(true)
    expect(memberAllowed(fero, 'orders.view', roles, members)).toBe(false)
    expect(memberAllowed(jano, 'equipment.delete', roles, members)).toBe(false)
    expect(memberAllowed(fero, 'equipment.delete', roles, members)).toBe(true)
    const groups = [
      { id: 'g', name: 'Šoféri', members: [fero.userId], permissions: ['vehicles.edit' as const, 'orders.view' as const] },
      { id: 'h', name: 'Sklad', members: [jano.userId], permissions: ['equipment.delete' as const] },
    ]
    expect(memberAllowed(fero, 'vehicles.edit', roles, members, groups)).toBe(true)
    expect(memberAllowed(fero, 'orders.view', roles, members, groups)).toBe(true)
    expect(memberAllowed(jano, 'vehicles.edit', roles, members, groups)).toBe(roleAllowed(jano.role, 'vehicles.edit', roles))
    // Výnimka člena má prednosť aj pred skupinou.
    expect(memberAllowed(jano, 'equipment.delete', roles, members, groups)).toBe(false)
  })
})

describe('can', () => {
  it('follows the granted permissions, the admin always passes', () => {
    const member = { role: 'viewer' as const, permissions: new Set(['equipment.view', 'orders.view']) }
    expect(can(member, 'orders.view')).toBe(true)
    expect(can(member, 'loans.view')).toBe(false)
    expect(can({ role: 'admin', permissions: new Set() }, 'orders.delete')).toBe(true)
    // @ts-expect-error neznáme oprávnenie sa nesmie dať napísať
    expect(can(member, 'orders.everything')).toBe(false)
  })

  it('hides menu items of modules the member may not see', () => {
    const ids = visibleNavItems({ role: 'viewer', permissions: new Set(['equipment.view']) }).map((item) => item.id)
    expect(ids).toContain('equipment')
    expect(ids).toContain('calendar')
    expect(ids).not.toContain('orders')
    expect(ids).not.toContain('loans')
    expect(visibleNavItems(null).map((item) => item.id)).toContain('orders')
  })
})
