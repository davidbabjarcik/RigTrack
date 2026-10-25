// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let event: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Festival', '2026-11-10', '2026-11-10') returning id`, [a]))[0].id
})

describe('event stage plans', () => {
  it('editors save a plan per event, viewers read it', async () => {
    await t.as('boss', `insert into public.event_stage_plans (company_id, event_id, request) values ($1, $2, '{"widthM": 6, "depthM": 4}')`, [a, event])
    await t.as('boss', `insert into public.event_stage_plans (company_id, event_id, request) values ($1, $2, '{"widthM": 8, "depthM": 4}') on conflict (event_id) do update set request = excluded.request`, [a, event])
    expect(await t.as('viewer', `select request->>'widthM' as w from public.event_stage_plans`)).toEqual([{ w: '8' }])
    await expect(t.as('viewer', `delete from public.event_stage_plans where event_id = $1`, [event])).resolves.toEqual([])
    expect((await t.as('boss', 'select count(*)::int as n from public.event_stage_plans'))[0].n).toBe(1)
  })
})
