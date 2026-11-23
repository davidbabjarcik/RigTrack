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
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ukážkový festival', current_date, current_date) returning id`, [a]))[0].id
})

describe('site plán', () => {
  it('uloží len ten, kto upravuje akcie; súradnice a trasy sa očistia', async () => {
    const view = JSON.stringify({ lat: 48.15, lon: 17.11, zoom: 25, x: 1 })
    const markers = JSON.stringify([{ id: 'm1', kind: 'stage', lat: 48.1501, lon: 17.1102, label: 'Pódium' }, { id: 'm2', kind: 'zlé', lat: 'x', lon: 17 }, { id: 'm3', kind: 'zlé', lat: 48.1, lon: 17.1 }])
    const routes = JSON.stringify([{ id: 'r1', kind: 'power', label: 'FOH', slack_pct: 500, points: [[48.15, 17.11], [48.1502, 17.1105], ['x', 1], [999, 17]] }])
    await expect(t.as('viewer', `select public.save_site_plan($1, 0, $2::jsonb, $3::jsonb, $4::jsonb)`, [event, view, markers, routes])).rejects.toThrow(/oprávnenie/)
    await expect(t.as('outsider', `select public.save_site_plan($1, 0, $2::jsonb, $3::jsonb, $4::jsonb)`, [event, view, markers, routes])).rejects.toThrow(/oprávnenie/)
    expect((await t.as('boss', `select public.save_site_plan($1, 0, $2::jsonb, $3::jsonb, $4::jsonb, 'Vjazd zozadu') as v`, [event, view, markers, routes]))[0].v).toBe(1)
    const [row] = await t.as('viewer', `select view, markers, routes from public.event_site_plans where event_id = $1`, [event])
    expect(row.view).toEqual({ lat: 48.15, lon: 17.11, zoom: 19 })
    expect(row.markers).toEqual([{ id: 'm1', kind: 'stage', lat: 48.1501, lon: 17.1102, label: 'Pódium' }, { id: 'm3', kind: 'label', lat: 48.1, lon: 17.1, label: '' }])
    expect(row.routes[0]).toEqual({ id: 'r1', kind: 'power', label: 'FOH', equipment_id: null, slack_pct: 100, points: [[48.15, 17.11], [48.1502, 17.1105]] })
    expect(await t.as('outsider', `select event_id from public.event_site_plans`)).toEqual([])
    await expect(t.as('boss', `select public.save_site_plan($1, 0, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb)`, [event])).rejects.toThrow(/niekto iný/)
  })

  it('zdieľanie site plánu', async () => {
    const [{ token }] = await t.as('boss', `select public.create_doc_share('siteplan', $1, 'Produkcia') as token`, [event])
    const [{ data }] = await t.as(null, 'select public.get_shared_doc($1) as data', [token])
    expect([data.docType, data.data.markers.length, data.data.routes[0].points.length, data.data.view.zoom, data.data.note]).toEqual(['siteplan', 2, 2, 19, 'Vjazd zozadu'])
  })
})
