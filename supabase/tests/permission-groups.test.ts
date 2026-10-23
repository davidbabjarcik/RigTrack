// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string
let drivers: string

const can = (user: string, permission: string) => t.as(user, 'select public.can($1, $2) as ok', [company, permission]).then((rows) => rows[0].ok)

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'jano', 'fero']) await t.signUp(name, `${name}@example.com`)
  company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer'), ($1, $3, 'viewer')`, [company, t.users.jano, t.users.fero])
})

describe('permission groups', () => {
  it('only admins manage groups', async () => {
    drivers = (await t.as('admin', `insert into public.permission_groups (company_id, name) values ($1, 'Šoféri') returning id`, [company]))[0].id
    await expect(t.as('jano', `insert into public.permission_groups (company_id, name) values ($1, 'Moja')`, [company])).rejects.toThrow(/row-level security/)
    await expect(t.as('admin', `insert into public.permission_groups (company_id, name) values ($1, ' šoféri ')`, [company])).rejects.toThrow(/duplicate key/)
  })

  it('adds what the group allows on top of the role; member exceptions still win', async () => {
    expect(await can('jano', 'vehicles.log')).toBe(false)
    await t.as('admin', `insert into public.permission_group_members (company_id, group_id, user_id) values ($1, $2, $3)`, [company, drivers, t.users.jano])
    await t.as('admin', `insert into public.permission_group_rules (company_id, group_id, permission) values ($1, $2, 'vehicles.log')`, [company, drivers])
    expect(await can('jano', 'vehicles.log')).toBe(true)
    expect(await can('fero', 'vehicles.log')).toBe(false)
    expect(await t.as('jano', 'select public.my_permissions($1) @> array[$2] as ok', [company, 'vehicles.log'])).toEqual([{ ok: true }])
    await t.as('admin', `insert into public.member_permissions (company_id, user_id, permission, allowed) values ($1, $2, 'vehicles.log', false)`, [company, t.users.jano])
    expect(await can('jano', 'vehicles.log')).toBe(false)
    await expect(t.as('admin', `insert into public.permission_group_rules (company_id, group_id, permission) values ($1, $2, 'nonsense')`, [company, drivers])).rejects.toThrow(/check constraint/)
  })

  it('lets members see only their own group memberships', async () => {
    expect(await t.as('jano', 'select count(*)::int as n from public.permission_group_members')).toEqual([{ n: 1 }])
    expect(await t.as('fero', 'select count(*)::int as n from public.permission_group_members')).toEqual([{ n: 0 }])
  })
})
