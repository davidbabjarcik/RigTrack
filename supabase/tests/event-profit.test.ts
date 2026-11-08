// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let b: string
let event: string
let partner: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'tech', 'stranger']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  b = (await t.as('stranger', `select public.create_company('B') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik')`, [a, t.users.tech])
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Festival', '2026-11-10', '2026-11-11') returning id`, [a]))[0].id
  partner = (await t.as('boss', `insert into public.partners (company_id, name) values ($1, 'Požičovňa') returning id`, [a]))[0].id
})

describe('event profit', () => {
  it('lets only money managers record and read event costs', async () => {
    await t.as('boss', `insert into public.event_costs (company_id, event_id, kind, partner_id, amount, note) values ($1, $2, 'rental', $3, 300, 'subwoofery')`, [a, event, partner])
    expect(await t.as('boss', 'select kind, amount::text from public.event_costs')).toEqual([{ kind: 'rental', amount: '300.00' }])
    expect(await t.as('tech', 'select 1 from public.event_costs')).toEqual([])
    await expect(t.as('tech', `insert into public.event_costs (company_id, event_id, amount) values ($1, $2, 10)`, [a, event])).rejects.toThrow()
    expect(await t.as('stranger', 'select 1 from public.event_costs')).toEqual([])
    await expect(t.as('stranger', `insert into public.event_costs (company_id, event_id, amount) values ($1, $2, 10)`, [b, event])).rejects.toThrow()
  })

  it('keeps the cost when the partner is removed', async () => {
    await t.as('boss', 'delete from public.partners where id = $1', [partner])
    expect(await t.as('boss', 'select partner_id, company_id = $1 as same from public.event_costs', [a])).toEqual([{ partner_id: null, same: true }])
  })

  it('stores profit settings per company for money managers only', async () => {
    await t.as('boss', `insert into public.profit_settings (company_id, km_rate, gear_use_days) values ($1, 0.25, 80)`, [a])
    await t.as('boss', `update public.profit_settings set km_rate = 0.3 where company_id = $1`, [a])
    expect(await t.as('boss', 'select km_rate::text, gear_use_days from public.profit_settings')).toEqual([{ km_rate: '0.300', gear_use_days: 80 }])
    expect(await t.as('tech', 'select 1 from public.profit_settings')).toEqual([])
    await expect(t.as('tech', `update public.profit_settings set km_rate = 9 where company_id = $1 returning 1`, [a])).resolves.toEqual([])
    await expect(t.as('boss', `insert into public.profit_settings (company_id) values ($1)`, [b])).rejects.toThrow()
  })
})
