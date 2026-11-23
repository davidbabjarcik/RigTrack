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
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ukážkový koncert', current_date, current_date) returning id`, [a]))[0].id
  await t.as('boss', `insert into public.event_patch (company_id, event_id, channel, name) values ($1, $2, 5, 'Spev')`, [a, event])
})

const items = JSON.stringify([
  { id: 'i1', kind: 'vocal', x: 5, y: 4.5, rot: 0, w: 0.4, d: 0.4, label: 'Spev', channel: 5, secret: 'nie' },
  { id: 'i2', kind: 'hack', x: 999, y: -99, rot: -90, w: 0, d: 50, label: 'x'.repeat(80), channel: 9999 },
])

describe('stage plán', () => {
  it('uloží len ten, kto upravuje akcie; položky sa očistia; verzia so snímkou input listu', async () => {
    await expect(t.as('viewer', `select public.save_stage_plot($1, 0, 10, 6, $2::jsonb)`, [event, items])).rejects.toThrow(/oprávnenie/)
    await expect(t.as('outsider', `select public.save_stage_plot($1, 0, 10, 6, $2::jsonb)`, [event, items])).rejects.toThrow(/oprávnenie/)
    expect((await t.as('boss', `select public.save_stage_plot($1, 0, 10, 6, $2::jsonb, 'Publikum dole') as v`, [event, items]))[0].v).toBe(1)
    const [{ items: saved }] = await t.as('viewer', `select items from public.stage_plots where event_id = $1`, [event])
    expect(saved[0]).toEqual({ id: 'i1', kind: 'vocal', x: 5, y: 4.5, rot: 0, w: 0.4, d: 0.4, label: 'Spev', channel: 5 })
    expect(saved[1]).toMatchObject({ kind: 'label', x: 45, y: -5, rot: 270, w: 0.1, d: 20, channel: null })
    expect(saved[1].label).toHaveLength(40)
    const [{ data }] = await t.as('viewer', `select data from public.doc_versions where doc_type = 'stageplot' and doc_id = $1`, [event])
    expect(data.inputs).toEqual([{ channel: 5, name: 'Spev' }])
    expect(await t.as('outsider', `select event_id from public.stage_plots`)).toEqual([])
    await expect(t.as('boss', `insert into public.stage_plots (event_id, company_id) values ($1, $2)`, [event, a])).rejects.toThrow(/permission/)
  })

  it('súbežné uloženie: stará verzia sa odmietne', async () => {
    await expect(t.as('boss', `select public.save_stage_plot($1, 0, 10, 6, '[]'::jsonb)`, [event])).rejects.toThrow(/niekto iný/)
    expect((await t.as('boss', `select public.save_stage_plot($1, 1, 12, 8, '[]'::jsonb) as v`, [event]))[0].v).toBe(2)
  })

  it('zdieľanie stage plánu: príjemca vidí plán a kanály', async () => {
    const [{ token }] = await t.as('boss', `select public.create_doc_share('stageplot', $1, 'Klub') as token`, [event])
    const [{ data }] = await t.as(null, 'select public.get_shared_doc($1) as data', [token])
    expect([data.docType, data.version, data.data.plot.width_m, data.data.items, data.data.inputs]).toEqual(['stageplot', 2, 12, [], [{ channel: 5, name: 'Spev' }]])
    expect(data.event).toBe('Ukážkový koncert')
  })
})
