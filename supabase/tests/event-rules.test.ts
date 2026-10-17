// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string

const save = (user: string, rules: object) =>
  t.as(
    user,
    `insert into public.event_rules (company_id, rules) values ($1, $2::jsonb)
     on conflict (company_id) do update set rules = excluded.rules returning company_id`,
    [companyA, JSON.stringify(rules)],
  )

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik', 'technik', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const role of ['skladnik', 'technik']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [companyA, t.users[role], role])
  }
})

describe('event rules', () => {
  it('are changed by those who manage lists and read by every member', async () => {
    await save('skladnik', [{ id: 'a' }])
    await save('admin', [{ id: 'b' }])
    await expect(save('technik', [])).rejects.toThrow(/row-level security/)
    expect(await t.as('technik', 'select rules from public.event_rules')).toEqual([{ rules: [{ id: "b" }] }])
    expect(await t.as('outsider', 'select 1 from public.event_rules')).toEqual([])
    await expect(t.as(null, 'select 1 from public.event_rules')).rejects.toThrow(/permission denied/)
  })

  it('must be a list', async () => {
    await expect(t.as('admin', `update public.event_rules set rules = '{}'::jsonb where company_id = $1`, [companyA])).rejects.toThrow(/check constraint/)
  })
})
