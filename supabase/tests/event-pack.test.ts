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

describe('event return (0145)', () => {
  it('lets crew close the return with the missing list, only editors reopen, nobody writes directly', async () => {
    await expect(t.as('viewer', `select public.close_event_return($1, '[]'::jsonb)`, [event])).rejects.toThrow(/Not allowed/)
    await t.as('helper', `select public.close_event_return($1, '["SM58"]'::jsonb)`, [event])
    const [row] = await t.as('viewer', 'select missing, closed_by_name from public.event_returns where event_id = $1', [event])
    expect(row).toEqual({ missing: ['SM58'], closed_by_name: 'helper@example.com' })
    await expect(t.as('helper', 'select public.reopen_event_return($1)', [event])).rejects.toThrow(/Not allowed/)
    await expect(t.as('admin', `insert into public.event_returns (company_id, event_id) values ($1, $2)`, [company, event])).rejects.toThrow(/permission denied/)
    await t.as('admin', 'select public.reopen_event_return($1)', [event])
    expect(await t.as('viewer', 'select event_id from public.event_returns')).toEqual([])
  })

  it('accepts a loss report', async () => {
    const [row] = await t.as('helper', `insert into public.incidents (company_id, kind, title, event_id, equipment_id) values ($1, 'loss', 'Strata: SM58', $2, $3) returning kind`, [company, event, mic])
    expect(row.kind).toBe('loss')
  })
})
