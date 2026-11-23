import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let b: string
let first: string
let second: string
let foreign: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  b = (await t.as('outsider', `select public.create_company('B') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
  first = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Turné – Ukážkové mesto 1', '2026-12-01', '2026-12-01') returning id`, [a]))[0].id
  second = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Turné – Ukážkové mesto 2', '2026-12-05', '2026-12-05') returning id`, [a]))[0].id
  foreign = (await t.as('outsider', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Cudzia', '2026-12-05', '2026-12-05') returning id`, [b]))[0].id
})

describe('harmonogram a turné', () => {
  it('harmonogram upravuje len ten, kto upravuje akcie', async () => {
    await t.as('boss', `insert into public.event_schedule_items (company_id, event_id, day, starts_at, ends_at, stage, kind, title) values ($1, $2, '2026-12-01', '14:00', '16:00', 'Hlavné', 'get_in', 'Get-in'), ($1, $2, '2026-12-01', '20:00', '21:00', 'Hlavné', 'act', 'Ukážková kapela')`, [a, first])
    await expect(t.as('viewer', `insert into public.event_schedule_items (company_id, event_id, day, starts_at, title) values ($1, $2, '2026-12-01', '10:00', 'X')`, [a, first])).rejects.toThrow(/row-level/)
    expect(await t.as('viewer', `select title from public.event_schedule_items order by starts_at`)).toEqual([{ title: 'Get-in' }, { title: 'Ukážková kapela' }])
    expect(await t.as('outsider', `select title from public.event_schedule_items`)).toEqual([])
    await expect(t.as('boss', `insert into public.event_schedule_items (company_id, event_id, day, starts_at, kind, title) values ($1, $2, '2026-12-01', '10:00', 'party', 'X')`, [a, first])).rejects.toThrow(/check/)
  })

  it('turné: akcie v sérii, cudzie turné sa nedá priradiť', async () => {
    const [{ id: tour }] = await t.as('boss', `insert into public.tours (company_id, name) values ($1, 'Ukážkové turné') returning id`, [a])
    await t.as('boss', `update public.events set tour_id = $1 where id in ($2, $3)`, [tour, first, second])
    expect(await t.as('viewer', `select count(*)::int as n from public.events where tour_id = $1`, [tour])).toEqual([{ n: 2 }])
    await expect(t.as('outsider', `update public.events set tour_id = $1 where id = $2`, [tour, foreign])).rejects.toThrow(/foreign key|violates/)
    await expect(t.as('viewer', `insert into public.tours (company_id, name) values ($1, 'X')`, [a])).rejects.toThrow(/row-level/)
  })

  it('kopírovanie podkladov: input list, stage plán, HF bez frekvencií, harmonogram posunutý o dni', async () => {
    await t.as('boss', `insert into public.event_patch (company_id, event_id, channel, name) values ($1, $2, 1, 'Spev')`, [a, first])
    await t.as('boss', `insert into public.event_outputs (company_id, event_id, number, name) values ($1, $2, 1, 'Wedge')`, [a, first])
    await t.as('boss', `select public.save_stage_plot($1, 0, 10, 6, '[{"id":"i1","kind":"vocal","x":5,"y":4,"rot":0,"w":0.4,"d":0.4,"label":"","channel":1}]'::jsonb)`, [first])
    await t.as('boss', `select public.save_rf_plan($1, 0, '[{"id":"c1","name":"Spev","kind":"mic","min_mhz":606,"max_mhz":630,"freq_mhz":610.5,"locked":true}]'::jsonb, '{}'::jsonb, '[38]'::jsonb)`, [first])
    await t.as('boss', `insert into public.event_patch (company_id, event_id, channel, name) values ($1, $2, 9, 'Staré')`, [a, second])
    await expect(t.as('viewer', `select public.copy_show_docs($1, $2, array['iolist'])`, [first, second])).rejects.toThrow(/oprávnenie/)
    await expect(t.as('boss', `select public.copy_show_docs($1, $2, array['iolist'])`, [first, foreign])).rejects.toThrow(/oprávnenie/)
    const [{ n }] = await t.as('boss', `select public.copy_show_docs($1, $2, array['iolist', 'stageplot', 'synoptic', 'rfplan', 'schedule']) as n`, [first, second])
    expect(n).toBe(4)
    expect(await t.as('viewer', `select channel, name from public.event_patch where event_id = $1`, [second])).toEqual([{ channel: 1, name: 'Spev' }])
    expect(await t.as('viewer', `select name from public.event_outputs where event_id = $1`, [second])).toEqual([{ name: 'Wedge' }])
    const [plot] = await t.as('viewer', `select version, jsonb_array_length(items) as items from public.stage_plots where event_id = $1`, [second])
    expect(plot).toEqual({ version: 0, items: 1 })
    const [rf] = await t.as('viewer', `select channels -> 0 ->> 'freq_mhz' as freq, excluded_tv from public.event_rf_plans where event_id = $1`, [second])
    expect(rf).toEqual({ freq: null, excluded_tv: [] })
    expect(await t.as('viewer', `select to_char(day, 'YYYY-MM-DD') as day, title from public.event_schedule_items where event_id = $1 order by starts_at`, [second])).toEqual([
      { day: '2026-12-05', title: 'Get-in' },
      { day: '2026-12-05', title: 'Ukážková kapela' },
    ])
    await t.as('boss', `select public.copy_show_docs($1, $2, array['stageplot'])`, [first, second])
    expect((await t.as('viewer', `select version from public.stage_plots where event_id = $1`, [second]))[0].version).toBe(1)
  })
})
