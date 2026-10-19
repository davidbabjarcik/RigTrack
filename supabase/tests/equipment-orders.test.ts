// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string
let other: string
let mic: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik', 'technik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  other = (await t.as('outsider', `select public.create_company('B') as id`))[0].id
  for (const [name, role] of [['skladnik', 'skladnik'], ['technik', 'technik'], ['viewer', 'viewer']]) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [company, t.users[name], role])
  }
  mic = (await t.as('admin', `insert into public.equipment (company_id, name, kind, quantity, track_units) values ($1, 'Shure ULX-D', 'audio', 4, true) returning id`, [company]))[0].id
})

describe('equipment details', () => {
  it('stores purchase dates per unit, links and Capture match', async () => {
    await t.as('skladnik', `update public.equipment set purchased_on = '2024-03-01', unit_purchases = '{"3": "2025-06-10"}', links = '[{"title": "Návod", "url": "https://shure.com", "tag": "manual"}]', clone_of = 'Robe Spiider', capture_match = 'partial', capture_note = 'chýba zoom' where id = $1`, [mic])
    expect(await t.as('viewer', `select unit_purchases ->> '3' as d, capture_match from public.equipment where id = $1`, [mic])).toEqual([{ d: '2025-06-10', capture_match: 'partial' }])
    await expect(t.as('skladnik', `update public.equipment set capture_match = 'maybe' where id = $1`, [mic])).rejects.toThrow(/check constraint/)
  })
})

describe('capsules', () => {
  it('are a company list that events pick from', async () => {
    const capsule = (await t.as('skladnik', `insert into public.mic_capsules (company_id, name, quantity, fits) values ($1, 'Beta 58A', 4, 'ULX-D') returning id`, [company]))[0].id
    await expect(t.as('viewer', `insert into public.mic_capsules (company_id, name) values ($1, 'KSM9')`, [company])).rejects.toThrow(/row-level security/)
    const event = (await t.as('technik', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ples', '2026-12-01', '2026-12-01') returning id`, [company]))[0].id
    await t.as('technik', `insert into public.event_capsules (company_id, event_id, capsule_id, quantity) values ($1, $2, $3, 2)`, [company, event, capsule])
    expect(await t.as('viewer', 'select quantity from public.event_capsules')).toEqual([{ quantity: 2 }])
    expect(await t.as('outsider', 'select 1 from public.mic_capsules')).toEqual([])
  })
})

describe('orders', () => {
  it('records who ordered and orders that are not for us', async () => {
    const order = (await t.as('skladnik', `select public.create_order($1, '{"supplier": "Thomann"}', '[{"name": "Kábel", "quantity": 2, "unit_price": 5}]') as id`, [company]))[0].id
    await t.as('skladnik', `update public.orders set for_us = false, for_whom = 'Klient X', add_to_stock = false, has_invoice = false where id = $1`, [order])
    expect(await t.as('admin', 'select ordered_by, for_whom, add_to_stock, total::float as total from public.orders_overview')).toEqual([
      { ordered_by: t.users.skladnik, for_whom: 'Klient X', add_to_stock: false, total: 10 },
    ])
  })
})

describe('case check priority', () => {
  it('defaults to normal and accepts low / high', async () => {
    const box = (await t.as('skladnik', `insert into public.cases (company_id, name) values ($1, 'Mic case') returning id, check_priority`, [company]))[0]
    expect(box.check_priority).toBe('normal')
    await t.as('skladnik', `update public.cases set check_priority = 'high' where id = $1`, [box.id])
    await expect(t.as('skladnik', `update public.cases set check_priority = 'urgent' where id = $1`, [box.id])).rejects.toThrow(/check constraint/)
  })
})

describe('service requests', () => {
  it('lets any member report, shows own requests and lets service resolve them', async () => {
    const request = (await t.as('viewer', `insert into public.service_requests (company_id, equipment_id, unit_id, title, priority) values ($1, $2, 3, 'Praská kapsula', 'high') returning id, requested_by_name, status`, [company, mic]))[0]
    expect(request).toMatchObject({ requested_by_name: 'viewer@example.com', status: 'open' })
    // Viewer má service.view a vidí všetko; outsider nič.
    expect(await t.as('outsider', 'select 1 from public.service_requests')).toEqual([])
    await expect(t.as('viewer', `update public.service_requests set status = 'done' where id = $1 returning id`, [request.id])).resolves.toEqual([])
    const done = await t.as('technik', `update public.service_requests set status = 'done', response = 'vymenená' where id = $1 returning resolved_at`, [request.id])
    expect(done[0].resolved_at).not.toBeNull()
    expect(await t.as('admin', `select title from public.company_news where title like 'Žiadosť o servis%'`)).toEqual([{ title: 'Žiadosť o servis: Praská kapsula' }])
  })

  it('rejects equipment from another company', async () => {
    const foreign = (await t.as('outsider', `insert into public.equipment (company_id, name) values ($1, 'Cudzie') returning id`, [other]))[0].id
    await expect(t.as('technik', `insert into public.service_requests (company_id, equipment_id, title) values ($1, $2, 'x')`, [company, foreign])).rejects.toThrow(/row-level security/)
  })

  it('hides requests of others from members without service.view', async () => {
    await t.rows(`insert into public.role_permissions (company_id, role, permission, allowed) values ($1, 'viewer', 'service.view', false)`, [company])
    expect(await t.as('viewer', 'select title from public.service_requests')).toEqual([{ title: 'Praská kapsula' }])
    await t.as('technik', `insert into public.service_requests (company_id, title) values ($1, 'Technikova')`, [company])
    expect(await t.as('viewer', 'select title from public.service_requests')).toEqual([{ title: 'Praská kapsula' }])
  })
})
