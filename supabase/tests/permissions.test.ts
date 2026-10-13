// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { PERMISSIONS } from '../../src/features/permissions/catalog'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let companyB: string

const addEquipment = (user: string, name: string) =>
  t.as(user, 'insert into public.equipment (company_id, name) values ($1, $2) returning id', [companyA, name])
const count = async (user: string, table: string) => Number((await t.as(user, `select count(*)::int as n from public.${table}`))[0].n)
const setRole = (role: string, permission: string, allowed: boolean, user = 'admin', company = companyA) =>
  t.as(user, 'insert into public.role_permissions (company_id, role, permission, allowed) values ($1, $2, $3, $4)', [company, role, permission, allowed])
const setMember = (member: string, permission: string, allowed: boolean, user = 'admin') =>
  t.as(user, 'insert into public.member_permissions (company_id, user_id, permission, allowed) values ($1, $2, $3, $4)', [
    companyA,
    t.users[member],
    permission,
    allowed,
  ])
const mine = async (user: string) => (await t.as(user, 'select public.my_permissions($1) as list', [companyA]))[0].list as unknown as string[]

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik', 'technik', 'technik2', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  companyB = (await t.as('outsider', `select public.create_company('B') as id`))[0].id
  for (const [name, role] of [['skladnik', 'skladnik'], ['technik', 'technik'], ['technik2', 'technik'], ['viewer', 'viewer']]) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [companyA, t.users[name], role])
  }
  await addEquipment('admin', 'Mixpult')
  await t.as('admin', `insert into public.orders (company_id, supplier, ordered_at) values ($1, 'Thomann', '2026-10-01')`, [companyA])
})

describe('defaults', () => {
  it('match the catalogue the application shows', async () => {
    const rows = await t.rows('select permission, roles::text[] as roles from public.permission_defaults() order by permission')
    const fromDb = rows.map((row) => [row.permission, [...(row.roles as unknown as string[])].sort()])
    const fromApp = PERMISSIONS.map((item) => [item.key, [...item.roles].sort()]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    expect(fromDb).toEqual(fromApp)
  })

  it('give each role what it had before permissions became configurable', async () => {
    expect(await mine('viewer')).toEqual(PERMISSIONS.filter((item) => (item.roles as string[]).includes('viewer')).map((item) => item.key).sort())
    expect(await mine('technik')).toContain('loans.edit')
    expect(await mine('technik')).not.toContain('orders.view')
    expect(await mine('admin')).toHaveLength(PERMISSIONS.length)
    expect(await mine('outsider')).toEqual([])
  })
})

describe('role settings', () => {
  it('can grant a role something it does not have by default', async () => {
    await expect(addEquipment('viewer', 'Kábel')).rejects.toThrow(/row-level security/)
    await setRole('viewer', 'equipment.edit', true)
    expect(await addEquipment('viewer', 'Kábel')).toHaveLength(1)
    expect(await mine('viewer')).toContain('equipment.edit')
  })

  it('can take away something a role has by default, including seeing a module', async () => {
    expect(await count('technik', 'equipment')).toBe(2)
    await setRole('technik', 'equipment.view', false)
    expect(await count('technik', 'equipment')).toBe(0)
    expect(await count('skladnik', 'equipment')).toBe(2)
    await t.as('admin', `delete from public.role_permissions where company_id = $1 and role = 'technik'`, [companyA])
    expect(await count('technik', 'equipment')).toBe(2)
  })

  it('never restricts the admin and applies to one company only', async () => {
    await expect(setRole('admin', 'equipment.view', false)).rejects.toThrow(/check constraint/)
    await setRole('viewer', 'equipment.view', false, 'outsider', companyB)
    // zákaz vo firme B sa viewera firmy A netýka: stále vidí obe položky
    expect(await count('viewer', 'equipment')).toBe(2)
  })
})

describe('exceptions for one member', () => {
  it('let a single person see what the role does not', async () => {
    expect(await count('technik', 'orders')).toBe(0)
    await setMember('technik', 'orders.view', true)
    expect(await count('technik', 'orders')).toBe(1)
    expect(await count('technik2', 'orders')).toBe(0)
  })

  it('win over the role setting in both directions', async () => {
    await setRole('technik', 'orders.view', false)
    expect(await count('technik', 'orders')).toBe(1)
    await setMember('skladnik', 'orders.view', false)
    expect(await count('skladnik', 'orders')).toBe(0)
  })

  it('disappear when the member leaves the company', async () => {
    await t.as('admin', 'delete from public.company_members where company_id = $1 and user_id = $2', [companyA, t.users.technik])
    expect(await t.rows('select 1 from public.member_permissions where user_id = $1', [t.users.technik])).toEqual([])
  })
})

describe('who may change permissions', () => {
  it('only the admin of the company', async () => {
    await expect(setRole('viewer', 'orders.view', true, 'skladnik')).rejects.toThrow(/row-level security/)
    await expect(setMember('viewer', 'orders.view', true, 'viewer')).rejects.toThrow(/row-level security/)
    await expect(setRole('viewer', 'orders.view', true, 'outsider')).rejects.toThrow(/row-level security/)
    expect(await count('skladnik', 'role_permissions')).toBe(0)
    expect(await count('viewer', 'member_permissions')).toBe(0)
    await expect(t.as(null, 'select 1 from public.role_permissions')).rejects.toThrow(/permission denied/)
  })

  it('rejects unknown permissions and members of other companies', async () => {
    await expect(setRole('viewer', 'everything', true)).rejects.toThrow(/check constraint/)
    await expect(setMember('outsider', 'orders.view', true)).rejects.toThrow(/foreign key/)
  })
})
