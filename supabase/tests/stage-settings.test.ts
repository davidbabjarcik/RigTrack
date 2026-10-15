// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string

const save = (user: string, config: object) =>
  t.as(
    user,
    `insert into public.stage_settings (company_id, config) values ($1, $2::jsonb)
     on conflict (company_id) do update set config = excluded.config returning company_id`,
    [companyA, JSON.stringify(config)],
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

describe('stage settings', () => {
  it('are changed by those who manage lists and read by every member', async () => {
    await save('skladnik', { name: 'Nivtec' })
    await save('admin', { name: 'Nivtec 2' })
    await expect(save('technik', { name: 'x' })).rejects.toThrow(/row-level security/)
    expect(await t.as('technik', 'select config from public.stage_settings')).toEqual([{ config: { name: 'Nivtec 2' } }])
    expect(await t.as('outsider', 'select 1 from public.stage_settings')).toEqual([])
    await expect(t.as(null, 'select 1 from public.stage_settings')).rejects.toThrow(/permission denied/)
  })

  it('must be an object', async () => {
    await expect(t.as('admin', `update public.stage_settings set config = '[]'::jsonb where company_id = $1`, [companyA])).rejects.toThrow(/check constraint/)
  })
})
