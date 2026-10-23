// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'jano', 'fero']) await t.signUp(name, `${name}@example.com`)
  company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer'), ($1, $3, 'viewer')`, [company, t.users.jano, t.users.fero])
})

describe('home address', () => {
  it('is visible to the member and team managers only', async () => {
    await t.as('jano', `insert into public.member_homes (company_id, user_id, address, lat, lon) values ($1, $2, 'Hlavná 1, Stropkov', 49.2, 21.65)`, [company, t.users.jano])
    await expect(t.as('jano', `insert into public.member_homes (company_id, user_id, address) values ($1, $2, 'cudzia')`, [company, t.users.fero])).rejects.toThrow(/row-level security/)
    expect(await t.as('fero', 'select address from public.member_homes')).toEqual([])
    expect(await t.as('admin', 'select address from public.member_homes')).toEqual([{ address: 'Hlavná 1, Stropkov' }])
  })
})

describe('work sessions', () => {
  it('starts once with server time, pauses and finishes; others do not see it', async () => {
    await t.as('jano', `insert into public.work_sessions (company_id, place, verified, distance_m) values ($1, 'home', true, 30)`, [company])
    await expect(t.as('jano', `insert into public.work_sessions (company_id, place) values ($1, 'company')`, [company])).rejects.toThrow(/duplicate key/)
    expect(await t.as('fero', 'select 1 from public.work_sessions')).toEqual([])
    // Príchod posunieme (ako vedúci) do minulosti, aby mal odchod neskorší čas.
    await t.as('admin', `update public.work_sessions set started_at = now() - interval '3 hours'`)
    await t.as('jano', `update public.work_sessions set paused_at = now(), pause_kind = 'break', break_minutes = 999`)
    await t.as('jano', `update public.work_sessions set paused_at = null`)
    await t.as('jano', `update public.work_sessions set started_at = now() - interval '9 hours', ended_at = '2020-01-01'`)
    const [row] = await t.as('jano', `select ended_at is not null as done, break_minutes, extract(epoch from (ended_at - started_at))::int / 3600 as hours, edited_by_name from public.work_sessions`)
    expect(row).toEqual({ done: true, break_minutes: 1, hours: 3, edited_by_name: 'admin@example.com' })
  })
})
