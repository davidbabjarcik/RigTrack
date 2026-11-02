// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
})

describe('print queue and company prefs', () => {
  it('collects labels once per item and stays inside the company', async () => {
    const box = (await t.as('boss', `insert into public.cases (company_id, name) values ($1, 'Case 1') returning id`, [a]))[0].id
    await t.as('boss', `insert into public.print_queue (company_id, kind, target_id) values ($1, 'case', $2)`, [a, box])
    await expect(t.as('boss', `insert into public.print_queue (company_id, kind, target_id) values ($1, 'case', $2)`, [a, box])).rejects.toThrow(/duplicate|unique/)
    expect(await t.as('viewer', 'select kind from public.print_queue')).toEqual([{ kind: 'case' }])
    expect(await t.as('outsider', 'select * from public.print_queue')).toEqual([])
    await t.as('boss', 'delete from public.print_queue where company_id = $1', [a])
    expect(await t.as('boss', 'select count(*)::int as n from public.print_queue')).toEqual([{ n: 0 }])
  })

  it('lets only a lookups manager change the company prefs', async () => {
    await t.as('boss', `insert into public.company_prefs (company_id, prefs) values ($1, '{"qrTarget":"a4"}')`, [a])
    expect(await t.as('viewer', 'select prefs from public.company_prefs')).toEqual([{ prefs: { qrTarget: 'a4' } }])
    await expect(t.as('viewer', `update public.company_prefs set prefs = '{}' where company_id = $1 returning 1`, [a])).resolves.toEqual([])
    expect(await t.as('outsider', 'select * from public.company_prefs')).toEqual([])
  })
})
