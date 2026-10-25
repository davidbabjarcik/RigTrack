// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let b: string
let event: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'other', 'jano', 'viewer']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  b = (await t.as('other', `select public.create_company('B') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $3, 'technik'), ($2, $3, 'technik'), ($1, $4, 'viewer')`, [a, b, t.users.jano, t.users.viewer])
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Festival', '2026-11-10', '2026-11-10') returning id`, [a]))[0].id
})

describe('saved quotes', () => {
  it('numbers quotes per company and year and lets editors change status', async () => {
    const first = await t.as('boss', `insert into public.event_quotes (company_id, event_id, total, data) values ($1, $2, 1200, '{"lines": []}') returning year, number`, [a, event])
    const second = await t.as('boss', `insert into public.event_quotes (company_id, event_id, total) values ($1, $2, 900) returning number`, [a, event])
    expect(first[0].number).toBe(1)
    expect(second[0].number).toBe(2)
    await t.as('boss', `update public.event_quotes set status = 'accepted' where number = 2`)
    expect(await t.as('viewer', 'select number, status from public.event_quotes order by number')).toEqual([
      { number: 1, status: 'sent' },
      { number: 2, status: 'accepted' },
    ])
    await expect(t.as('viewer', `insert into public.event_quotes (company_id, event_id) values ($1, $2)`, [a, event])).rejects.toThrow()
  })
})

describe('own equipment copies', () => {
  it('copies follow changes of the original automatically', async () => {
    const card = (await t.as('boss', `select id from public.staff where company_id = $1 and member_id = $2`, [a, t.users.jano]))[0].id
    const mine = (await t.as('boss', `insert into public.equipment (company_id, name, quantity, owner_staff_id) values ($1, 'Pult', 1, $2) returning id`, [a, card]))[0].id
    const copy = (await t.as('jano', 'select public.share_own_equipment($1, $2) as id', [mine, b]))[0].id
    await t.as('boss', `update public.equipment set name = 'Pult X32', quantity = 2 where id = $1`, [mine])
    expect(await t.as('other', 'select name, quantity from public.equipment where id = $1', [copy])).toEqual([{ name: 'Pult X32', quantity: 2 }])
  })
})
