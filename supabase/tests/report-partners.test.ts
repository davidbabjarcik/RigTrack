// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'jesko', 'viewer']) await t.signUp(name, `${name}@example.com`)
  company = (await t.as('admin', `select public.create_company('JEF') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [company, t.users.viewer])
})

describe('partner companies', () => {
  it('founds a company for a partner with its data', async () => {
    const partner = (await t.as('admin', `insert into public.partners (company_id, name, ico, address) values ($1, 'JESKO s.r.o.', '12345678', 'Medzilaborce') returning id`, [company]))[0].id
    await t.as('admin', `insert into public.partner_contacts (company_id, partner_id, name, email) values ($1, $2, 'Ješko', 'jesko@example.com')`, [company, partner])
    await expect(t.as('viewer', 'select public.create_partner_company($1)', [partner])).rejects.toThrow(/oprávnenie/)
    const created = (await t.as('admin', 'select public.create_partner_company($1) as id', [partner]))[0].id
    expect(await t.as('admin', 'select name, founded_by from public.companies where id = $1', [created])).toEqual([{ name: 'JESKO s.r.o.', founded_by: company }])
    expect(await t.as('admin', 'select ico from public.company_profile where company_id = $1', [created])).toEqual([{ ico: '12345678' }])
    expect(await t.as('admin', 'select linked_company_id, uses_app from public.partners where id = $1', [partner])).toEqual([{ linked_company_id: created, uses_app: true }])
    expect((await t.as('admin', 'select public.create_partner_company($1) as id', [partner]))[0].id).toBe(created)
  })

  it('suggests data to a contact founding their own company', async () => {
    expect(await t.as('jesko', 'select name, ico from public.suggest_company_profiles()')).toEqual([{ name: 'JESKO s.r.o.', ico: '12345678' }])
    expect(await t.as('viewer', 'select * from public.suggest_company_profiles()')).toEqual([])
  })
})

describe('report permissions', () => {
  it('exist with defaults', async () => {
    expect(await t.rows(`select roles::text[] as roles from public.permission_defaults() where permission = 'report.money'`)).toEqual([{ roles: [] }])
  })
})
