// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik', 'technik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const [name, role] of [['skladnik', 'skladnik'], ['technik', 'technik'], ['viewer', 'viewer']]) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [company, t.users[name], role])
  }
})

describe('staff card details', () => {
  it('stores birth date, name day and driving licences with validation', async () => {
    await t.as('technik', `update public.staff set birth_date = '1995-04-12', name_day = '06-24', licences = '{B,C}', onboarded = true where member_id = $1`, [t.users.technik])
    expect(await t.as('admin', 'select name_day, licences from public.staff where member_id = $1', [t.users.technik])).toEqual([{ name_day: '06-24', licences: ['B', 'C'] }])
    await expect(t.as('technik', `update public.staff set name_day = '13-01' where member_id = $1`, [t.users.technik])).rejects.toThrow(/check constraint/)
    await expect(t.as('technik', `update public.staff set licences = '{X}' where member_id = $1`, [t.users.technik])).rejects.toThrow(/check constraint/)
  })
})

describe('device exemptions', () => {
  it('can be granted only by an admin', async () => {
    await expect(t.as('skladnik', `insert into public.device_exemptions (company_id, user_id, kind) values ($1, $2, 'tablet')`, [company, t.users.technik])).rejects.toThrow(/row-level security/)
    await t.as('admin', `insert into public.device_exemptions (company_id, user_id, kind) values ($1, $2, 'tablet')`, [company, t.users.technik])
    expect(await t.as('technik', 'select kind from public.device_exemptions')).toEqual([{ kind: 'tablet' }])
    expect(await t.as('technik', 'delete from public.device_exemptions returning kind')).toEqual([])
  })
})

describe('events: news and crew responses', () => {
  let event: string

  it('writes news for a new event and a crew assignment, readable by members only', async () => {
    event = (await t.as('admin', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Festival', '2026-11-06', '2026-11-08') returning id`, [company]))[0].id
    await t.as('admin', `insert into public.event_crew (company_id, event_id, member_id, role) values ($1, $2, $3, 'Osvetľovač')`, [company, event, t.users.technik])
    const news = await t.as('technik', 'select kind, title, link from public.company_news order by created_at, kind desc')
    expect(news.map((row) => row.kind).sort()).toEqual(['crew', 'event'])
    expect(news.find((row) => row.kind === 'event')?.title).toBe('Nový event: Festival (06. 11. 2026)')
    expect(news.every((row) => row.link === `/events/${event}`)).toBe(true)
    expect(await t.as('outsider', 'select 1 from public.company_news where company_id = $1', [company])).toEqual([])
    await expect(t.as('technik', `insert into public.company_news (company_id, kind, title) values ($1, 'other', 'x')`, [company])).rejects.toThrow(/permission denied/)
  })

  it('lets crew members confirm their own attendance only', async () => {
    await t.as('technik', `update public.event_crew set response = 'no', response_note = 'Som na svadbe' where member_id = $1`, [t.users.technik])
    expect(await t.as('admin', 'select response, response_note from public.event_crew')).toEqual([{ response: 'no', response_note: 'Som na svadbe' }])
    await t.as('admin', `insert into public.event_crew (company_id, event_id, member_id) values ($1, $2, $3)`, [company, event, t.users.viewer])
    await t.as('viewer', `update public.event_crew set response = 'yes' where member_id = $1`, [t.users.viewer])
    // člen len na čítanie nezmení odpoveď niekoho iného
    expect(await t.as('viewer', `update public.event_crew set response = 'yes' where member_id = $1 returning id`, [t.users.technik])).toEqual([])
    expect(await t.as('admin', 'select response from public.event_crew where member_id = $1', [t.users.viewer])).toEqual([{ response: 'yes' }])
  })

  it('remembers what each user has read', async () => {
    await t.as('technik', `insert into public.news_reads (company_id) values ($1)`, [company])
    expect((await t.as('technik', 'select count(*)::int as n from public.news_reads'))[0].n).toBe(1)
    expect(await t.as('admin', 'select 1 from public.news_reads')).toEqual([])
  })
})
