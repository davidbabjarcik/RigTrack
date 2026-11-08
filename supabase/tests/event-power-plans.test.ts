// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let b: string
let event: string
let other: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer', 'stranger']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  b = (await t.as('stranger', `select public.create_company('B') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Festival', '2026-11-10', '2026-11-10') returning id`, [a]))[0].id
  other = (await t.as('stranger', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Iný', '2026-11-10', '2026-11-10') returning id`, [b]))[0].id
})

describe('event power plans', () => {
  it('editors save one plan per event, viewers only read it', async () => {
    await t.as('boss', `insert into public.event_power_plans (company_id, event_id, plan) values ($1, $2, '{"zones": [], "generators": []}')`, [a, event])
    await t.as('boss', `update public.event_power_plans set plan = '{"zones": [{"name": "Strecha"}]}' where event_id = $1`, [event])
    const rows = await t.as('viewer', `select plan->'zones'->0->>'name' as name, updated_by from public.event_power_plans`)
    expect(rows).toEqual([{ name: 'Strecha', updated_by: t.users.boss }])
    await expect(t.as('viewer', `update public.event_power_plans set plan = '{}' where event_id = $1 returning event_id`, [event])).resolves.toEqual([])
    await expect(t.as('viewer', `delete from public.event_power_plans where event_id = $1 returning event_id`, [event])).resolves.toEqual([])
  })

  it('keeps plans inside the company', async () => {
    expect(await t.as('stranger', 'select event_id from public.event_power_plans')).toEqual([])
    // Plán k cudziemu eventu ani pod cudzou firmou sa vložiť nedá.
    await expect(t.as('boss', `insert into public.event_power_plans (company_id, event_id, plan) values ($1, $2, '{}')`, [a, other])).rejects.toThrow()
    await expect(t.as('boss', `insert into public.event_power_plans (company_id, event_id, plan) values ($1, $2, '{}')`, [b, other])).rejects.toThrow()
    // Event ani firma sa úpravou nepresunie.
    await expect(t.as('boss', `update public.event_power_plans set company_id = $1 where event_id = $2`, [b, event])).rejects.toThrow()
  })

  it('rejects a plan that is not an object', async () => {
    await expect(t.as('boss', `update public.event_power_plans set plan = '[]' where event_id = $1`, [event])).rejects.toThrow()
  })
})
