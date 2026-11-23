import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let event: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ukážkový festival', '2026-12-01', '2026-12-01') returning id`, [a]))[0].id
  await t.as('boss', `insert into public.event_schedule_items (company_id, event_id, day, starts_at, ends_at, stage, kind, title) values ($1, $2, '2026-12-01', '20:00', '21:00', 'Hlavné', 'act', 'Ukážková kapela')`, [a, event])
})

describe('verzie a zdieľanie harmonogramu', () => {
  it('verziu uloží len ten, kto upravuje akcie', async () => {
    await expect(t.as('viewer', 'select public.save_schedule_version($1)', [event])).rejects.toThrow(/oprávnenie/)
    await expect(t.as('outsider', 'select public.save_schedule_version($1)', [event])).rejects.toThrow(/oprávnenie/)
    expect((await t.as('boss', 'select public.save_schedule_version($1) as v', [event]))[0].v).toBe(1)
    const [{ data }] = await t.as('viewer', `select data from public.doc_versions where doc_type = 'schedule' and doc_id = $1`, [event])
    expect(data.items[0]).toMatchObject({ day: '2026-12-01', starts_at: '20:00', ends_at: '21:00', stage: 'Hlavné', kind: 'act', title: 'Ukážková kapela' })
  })

  it('odkaz: príjemca vidí poslednú verziu a predošlú na porovnanie', async () => {
    const [{ token }] = await t.as('boss', `select public.create_doc_share('schedule', $1, 'Kapela') as token`, [event])
    const [{ data: first }] = await t.as(null, 'select public.get_shared_doc($1) as data', [token])
    expect([first.docType, first.version, first.data.items.length, first.event]).toEqual(['schedule', 1, 1, 'Ukážkový festival'])
    await t.as('boss', `update public.event_schedule_items set starts_at = '20:30' where event_id = $1`, [event])
    await t.as('boss', 'select public.save_schedule_version($1)', [event])
    const [{ data: second }] = await t.as(null, 'select public.get_shared_doc($1) as data', [token])
    expect([second.version, second.previousVersion, second.previous.items[0].starts_at, second.data.items[0].starts_at]).toEqual([2, 1, '20:00', '20:30'])
  })

  it('harmonogram bez uloženej verzie sa pri zdieľaní uloží ako verzia 1', async () => {
    const other = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Iná', '2026-12-02', '2026-12-02') returning id`, [a]))[0].id
    await t.as('boss', `select public.create_doc_share('schedule', $1, 'Klub')`, [other])
    expect(await t.as('viewer', `select version from public.doc_versions where doc_type = 'schedule' and doc_id = $1`, [other])).toEqual([{ version: 1 }])
  })
})
