// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string
let event: string
let mic: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'helper', 'viewer']) await t.signUp(name, `${name}@example.com`)
  company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer'), ($1, $3, 'viewer')`, [company, t.users.helper, t.users.viewer])
  event = (await t.as('admin', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ples', '2026-11-01', '2026-11-01') returning id`, [company]))[0].id
  mic = (await t.as('admin', `insert into public.equipment (company_id, name) values ($1, 'SM58') returning id`, [company]))[0].id
  await t.as('admin', `insert into public.event_crew (company_id, event_id, member_id) values ($1, $2, $3)`, [company, event, t.users.helper])
})

describe('pack list', () => {
  it('lets crew members tick items once per phase', async () => {
    const row = (await t.as('helper', `insert into public.event_pack_checks (company_id, event_id, equipment_id, phase) values ($1, $2, $3, 'out') returning checked_by_name`, [company, event, mic]))[0]
    expect(row.checked_by_name).toBe('helper@example.com')
    await expect(t.as('helper', `insert into public.event_pack_checks (company_id, event_id, equipment_id, phase) values ($1, $2, $3, 'out')`, [company, event, mic])).rejects.toThrow(/duplicate key/)
    await expect(t.as('viewer', `insert into public.event_pack_checks (company_id, event_id, equipment_id, phase) values ($1, $2, $3, 'back')`, [company, event, mic])).rejects.toThrow(/row-level security/)
    expect(await t.as('viewer', 'select phase from public.event_pack_checks')).toEqual([{ phase: 'out' }])
  })
})
