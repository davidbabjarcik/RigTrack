// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string
let event: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'technik', 'technik2', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const [name, role] of [['technik', 'technik'], ['technik2', 'technik'], ['viewer', 'viewer']]) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [company, t.users[name], role])
  }
  event = (await t.as('admin', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Festival', '2026-11-06', '2026-11-10') returning id`, [company]))[0].id
})

describe('company profile', () => {
  it('is readable by members and editable by an admin only', async () => {
    await t.as('admin', `insert into public.company_profile (company_id, legal_name, ico, warehouse_address) values ($1, 'JEF Production s.r.o.', '12345678', 'Šarišská, Stropkov')`, [company])
    expect(await t.as('viewer', 'select warehouse_address from public.company_profile')).toEqual([{ warehouse_address: 'Šarišská, Stropkov' }])
    expect(await t.as('technik', `update public.company_profile set ico = 'x' where company_id = $1 returning ico`, [company])).toEqual([])
  })
})

describe('event days, links, partners and travel', () => {
  it('stores a day plan and per-day crew', async () => {
    await t.as('technik', `insert into public.event_days (company_id, event_id, day, kind, starts_at) values ($1, $2, '2026-11-06', 'build', '08:00'), ($1, $2, '2026-11-09', 'show', '18:00')`, [company, event])
    await expect(t.as('viewer', `insert into public.event_days (company_id, event_id, day) values ($1, $2, '2026-11-07')`, [company, event])).rejects.toThrow(/row-level security/)
    await t.as('admin', `insert into public.event_crew (company_id, event_id, member_id, days) values ($1, $2, $3, '{2026-11-06,2026-11-10}')`, [company, event, t.users.technik])
    expect(await t.as('viewer', 'select kind from public.event_days order by day')).toEqual([{ kind: 'build' }, { kind: 'show' }])
  })

  it('keeps links with a tag and only http(s) addresses', async () => {
    await t.as('technik', `insert into public.event_links (company_id, event_id, url, tag) values ($1, $2, 'https://drive.google.com/x', 'rider')`, [company, event])
    await expect(t.as('technik', `insert into public.event_links (company_id, event_id, url) values ($1, $2, 'javascript:alert(1)')`, [company, event])).rejects.toThrow(/check constraint/)
  })

  it('links organizer groups with contacts to events', async () => {
    const jesko = (await t.as('technik', `insert into public.partners (company_id, name, ico, address) values ($1, 'JESKO', '87654321', 'Medzilaborce') returning id`, [company]))[0].id
    await t.as('technik', `insert into public.partner_contacts (company_id, partner_id, name, phone) values ($1, $2, 'Samo', '+421 900 1'), ($1, $2, 'Jozef', '+421 900 2')`, [company, jesko])
    await t.as('technik', `insert into public.event_partners (company_id, event_id, partner_id, kind) values ($1, $2, $3, 'organizer')`, [company, event, jesko])
    expect(await t.as('viewer', 'select count(*)::int as n from public.partner_contacts')).toEqual([{ n: 2 }])
    expect(await t.as('outsider', 'select 1 from public.partners')).toEqual([])
  })

  it('stores travel per day', async () => {
    await t.as('technik', `update public.events set address = 'Námestie, Košice', distance_km = 92 where id = $1`, [event])
    await t.as('technik', `insert into public.event_travel (company_id, event_id, travel_date, vehicles, round_trips, stay) values ($1, $2, '2026-11-06', 2, 1, 'venue')`, [company, event])
    expect(await t.as('viewer', 'select vehicles, stay from public.event_travel')).toEqual([{ vehicles: 2, stay: 'venue' }])
  })
})

describe('personal work logs and expenses', () => {
  it('are visible only to the author and admins', async () => {
    await t.as('technik', `insert into public.event_work_logs (company_id, event_id, work_date, starts_at, ends_at, break_minutes) values ($1, $2, '2026-11-06', '08:00', '18:30', 45)`, [company, event])
    await t.as('technik', `insert into public.event_expenses (company_id, event_id, amount, category, place) values ($1, $2, 12.5, 'food', 'Bageta')`, [company, event])
    expect(await t.as('technik2', 'select 1 from public.event_work_logs')).toEqual([])
    expect(await t.as('technik2', 'select 1 from public.event_expenses')).toEqual([])
    expect((await t.as('admin', 'select count(*)::int as n from public.event_expenses'))[0].n).toBe(1)
    await expect(
      t.as('technik2', `insert into public.event_expenses (company_id, event_id, user_id, amount) values ($1, $2, $3, 5)`, [company, event, t.users.technik]),
    ).rejects.toThrow(/row-level security/)
  })
})

describe('device ethernet MAC', () => {
  it('stores a second MAC for the LAN card', async () => {
    await t.as('technik', `insert into public.member_devices (company_id, kind, name, mac, ethernet_mac) values ($1, 'laptop', 'MacBook', 'A4:83:E7:00:00:09', '00:1A:2B:3C:4D:5E')`, [company])
    await expect(t.as('technik', `insert into public.member_devices (company_id, kind, name, mac, ethernet_mac) values ($1, 'laptop', 'X', 'A4:83:E7:00:00:10', 'zle')`, [company])).rejects.toThrow(/check constraint/)
  })
})
