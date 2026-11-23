import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let event: string
let mixer: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ukážkový festival', current_date, current_date) returning id`, [a]))[0].id
  mixer = (await t.as('boss', `insert into public.equipment (company_id, name, kind) values ($1, 'Ukážkový pult', 'audio') returning id`, [a]))[0].id
})

describe('synoptika', () => {
  it('uloží len ten, kto upravuje akcie; uzly a prepojenia sa očistia', async () => {
    const nodes = JSON.stringify([
      { id: 'n1', kind: 'console', label: 'FOH', x: 100, y: 80, equipment_id: mixer, extra: 1 },
      { id: 'n2', kind: 'nope', label: 'SB', x: -5, y: 99999, equipment_id: 'zlé' },
    ])
    const links = JSON.stringify([{ id: 'l1', from: 'n1', to: 'n2', signal: 'aes50', cable: 'CAT6', length_m: 50, count: 2 }, { id: 'l2', from: 'n2', to: 'n1', signal: 'x', length_m: 'veľa', count: 500 }])
    await expect(t.as('viewer', `select public.save_synoptic($1, 0, $2::jsonb, $3::jsonb)`, [event, nodes, links])).rejects.toThrow(/oprávnenie/)
    await expect(t.as('outsider', `select public.save_synoptic($1, 0, $2::jsonb, $3::jsonb)`, [event, nodes, links])).rejects.toThrow(/oprávnenie/)
    expect((await t.as('boss', `select public.save_synoptic($1, 0, $2::jsonb, $3::jsonb, 'FOH 50 m') as v`, [event, nodes, links]))[0].v).toBe(1)
    const [row] = await t.as('viewer', `select nodes, links from public.event_synoptics where event_id = $1`, [event])
    expect(row.nodes[0]).toEqual({ id: 'n1', kind: 'console', label: 'FOH', detail: '', x: 100, y: 80, equipment_id: mixer, rack_id: null })
    expect(row.nodes[1]).toMatchObject({ kind: 'other', x: 0, y: 3000, equipment_id: null })
    expect(row.links[0]).toMatchObject({ signal: 'aes50', cable: 'CAT6', length_m: 50, count: 2 })
    expect(row.links[1]).toMatchObject({ signal: 'other', length_m: null, count: 1 })
    expect(await t.as('outsider', `select event_id from public.event_synoptics`)).toEqual([])
    await expect(t.as('boss', `select public.save_synoptic($1, 0, '[]'::jsonb, '[]'::jsonb)`, [event])).rejects.toThrow(/niekto iný/)
  })

  it('zdieľanie synoptiky s názvom techniky', async () => {
    const [{ token }] = await t.as('boss', `select public.create_doc_share('synoptic', $1, 'Klub') as token`, [event])
    const [{ data }] = await t.as(null, 'select public.get_shared_doc($1) as data', [token])
    expect([data.docType, data.version, data.data.nodes.length, data.data.links.length, data.data.note, data.names[mixer]]).toEqual(['synoptic', 1, 2, 2, 'FOH 50 m', 'Ukážkový pult'])
  })
})
