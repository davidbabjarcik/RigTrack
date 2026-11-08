// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let crewEvent: string

// Edge funkcia volá calendar_feed_events ako služobná rola; v teste ako superuser.
const feed = (token: string) => t.rows('select name, crew_role, scope, app_url from public.calendar_feed_events($1)', [token])

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'tech', 'stranger']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.tech])
  crewEvent = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Festival', current_date + 5, current_date + 6) returning id`, [a]))[0].id
  await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ples', current_date + 9, current_date + 9)`, [a])
  await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on, status) values ($1, 'Zrušený', current_date + 3, current_date + 3, 'cancelled')`, [a])
  await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Dávno', current_date - 400, current_date - 400)`, [a])
  await t.rows(`insert into public.event_crew (company_id, event_id, member_id, role) values ($1, $2, $3, 'Svetlá')`, [a, crewEvent, t.users.tech])
})

describe('calendar feeds', () => {
  it('gives a member only their own events and the whole company to those who see events', async () => {
    const mine = (await t.as('tech', `select public.create_calendar_feed($1, 'mine', 'https://app.example.com/') as token`, [a]))[0].token
    expect(mine).toMatch(/^[0-9a-f]{64}$/)
    expect(await feed(mine)).toEqual([{ name: 'Festival', crew_role: 'Svetlá', scope: 'mine', app_url: 'https://app.example.com/' }])
    const all = (await t.as('boss', `select public.create_calendar_feed($1, 'all', 'javascript:alert(1)') as token`, [a]))[0].token
    expect((await feed(all)).map((row) => row.name)).toEqual(['Festival', 'Ples'])
    expect((await feed(all))[0].app_url).toBe('')
  })

  it('stores only a hash, which nobody reads in the app', async () => {
    const token = (await t.as('boss', `select public.create_calendar_feed($1, 'mine', '') as token`, [a]))[0].token
    const stored = await t.rows('select token_hash from public.calendar_feeds where token_hash = encode(sha256(convert_to($1, \'UTF8\')), \'hex\')', [token])
    expect(stored).toHaveLength(1)
    await expect(t.as('boss', 'select token_hash from public.calendar_feeds')).rejects.toThrow()
    expect(await t.as('tech', 'select scope from public.calendar_feeds')).toEqual([{ scope: 'mine' }])
  })

  it('a new link replaces the old one and a deleted link stops working', async () => {
    const first = (await t.as('tech', `select public.create_calendar_feed($1, 'mine', '') as token`, [a]))[0].token
    const second = (await t.as('tech', `select public.create_calendar_feed($1, 'mine', '') as token`, [a]))[0].token
    expect(await feed(first)).toEqual([])
    expect(await feed(second)).toHaveLength(1)
    await t.as('tech', 'delete from public.calendar_feeds')
    expect(await feed(second)).toEqual([])
  })

  it('refuses outsiders and stops after leaving the company', async () => {
    await expect(t.as('stranger', `select public.create_calendar_feed($1, 'mine', '')`, [a])).rejects.toThrow()
    const token = (await t.as('tech', `select public.create_calendar_feed($1, 'mine', '') as token`, [a]))[0].token
    await t.rows('delete from public.company_members where company_id = $1 and user_id = $2', [a, t.users.tech])
    expect(await feed(token)).toEqual([])
    expect(await feed('not-a-token')).toEqual([])
  })

  it('cannot be read by signed-in users or anonymous visitors directly', async () => {
    await expect(t.as('boss', `select * from public.calendar_feed_events('x')`)).rejects.toThrow()
    await expect(t.as(null, `select * from public.calendar_feed_events('x')`)).rejects.toThrow()
  })
})
