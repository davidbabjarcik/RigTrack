// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'jano', 'fero']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik'), ($1, $3, 'technik')`, [a, t.users.jano, t.users.fero])
})

describe('member rates', () => {
  it('admin sets rates, each member sees only own', async () => {
    await t.as('boss', `insert into public.member_rates (company_id, member_id, company_rate, event_rate) values ($1, $2, 8, 10), ($1, $3, 9, 11)`, [a, t.users.jano, t.users.fero])
    expect(await t.as('jano', 'select company_rate::float as r from public.member_rates')).toEqual([{ r: 8 }])
    await expect(t.as('jano', `update public.member_rates set company_rate = 50 where member_id = $1`, [t.users.jano])).resolves.toEqual([])
    expect(await t.as('boss', `select company_rate::float as r from public.member_rates where member_id = $1`, [t.users.jano])).toEqual([{ r: 8 }])
  })
})
