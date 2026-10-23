// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string
let event: string
let meeting: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'tech', 'other']) await t.signUp(name, `${name}@example.com`)
  company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer'), ($1, $3, 'viewer')`, [company, t.users.tech, t.users.other])
  event = (await t.as('admin', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ples', '2026-11-01', '2026-11-01') returning id`, [company]))[0].id
  await t.as('admin', `insert into public.event_crew (company_id, event_id, member_id) values ($1, $2, $3)`, [company, event, t.users.tech])
  meeting = (
    await t.as('admin', `insert into public.event_meetings (company_id, event_id, meet_at, place_kind, address, lat, lon) values ($1, $2, '2026-11-01 13:00+01', 'company', 'Sklad', 49.2, 21.65) returning id`, [company, event])
  )[0].id
})

describe('attendance', () => {
  it('lets crew see the meeting and check in once; others cannot', async () => {
    expect(await t.as('tech', 'select address from public.event_meetings')).toEqual([{ address: 'Sklad' }])
    const row = (
      await t.as('tech', `insert into public.event_attendance (company_id, event_id, meeting_id, verified, distance_m) values ($1, $2, $3, true, 80) returning user_id, ended_at`, [company, event, meeting])
    )[0]
    expect(row).toEqual({ user_id: t.users.tech, ended_at: null })
    await expect(t.as('tech', `insert into public.event_attendance (company_id, event_id) values ($1, $2)`, [company, event])).rejects.toThrow(/duplicate key/)
    await expect(t.as('other', `insert into public.event_attendance (company_id, event_id) values ($1, $2)`, [company, event])).rejects.toThrow(/row-level security/)
  })

  it('pauses with server time, finishes, writes the work log and lets the leader correct it', async () => {
    // Príchod posunieme do minulosti (ako vedúci), aby mal odchod neskorší čas.
    await t.as('admin', `update public.event_attendance set started_at = '2026-10-01 13:05+02'`)
    // Čakanie: začiatok dá server, člen si nevie pripísať minúty.
    await t.as('tech', `update public.event_attendance set paused_at = '2000-01-01', pause_kind = 'wait', wait_minutes = 500`)
    const [pausing] = await t.as('tech', 'select paused_at, pause_kind, wait_minutes from public.event_attendance')
    expect(pausing.pause_kind).toBe('wait')
    expect(new Date(pausing.paused_at).getFullYear()).toBeGreaterThan(2020)
    expect(pausing.wait_minutes).toBe(0)
    await t.as('tech', `update public.event_attendance set paused_at = null`)
    expect(await t.as('tech', 'select paused_at, wait_minutes, ended_at from public.event_attendance')).toEqual([{ paused_at: null, wait_minutes: 1, ended_at: null }])

    // Člen si nemôže zmeniť príchod – len skončiť (čas odchodu dá server).
    await t.as('tech', `update public.event_attendance set started_at = '2026-11-01 08:00+01', ended_at = '2020-01-01'`)
    const [done] = await t.as('tech', 'select started_at, ended_at, work_log_id from public.event_attendance')
    expect(new Date(done.started_at).toISOString()).toBe('2026-10-01T11:05:00.000Z')
    expect(done.ended_at).not.toBeNull()
    expect(done.work_log_id).not.toBeNull()
    expect(await t.as('tech', 'select starts_at, break_minutes, note from public.event_work_logs')).toEqual([
      { starts_at: '13:05:00', break_minutes: 1, note: 'Dochádzka (čakanie 1 min)' },
    ])

    await t.as('admin', `update public.event_attendance set started_at = '2026-11-01 13:00+01', ended_at = '2026-11-01 23:30+01', break_minutes = 30, wait_minutes = 0`)
    expect(await t.as('tech', 'select starts_at, ends_at, work_date::text as work_date, break_minutes, note from public.event_work_logs')).toEqual([
      { starts_at: '13:00:00', ends_at: '23:30:00', work_date: '2026-11-01', break_minutes: 30, note: 'Dochádzka' },
    ])
    expect(await t.as('admin', 'select edited_by_name from public.event_attendance')).toEqual([{ edited_by_name: 'admin@example.com' }])
  })
})
