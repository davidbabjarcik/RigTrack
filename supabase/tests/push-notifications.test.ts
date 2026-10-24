// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'jano', 'fero']) await t.signUp(name, `${name}@example.com`)
  company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik'), ($1, $3, 'technik')`, [company, t.users.jano, t.users.fero])
})

describe('push notifications', () => {
  it('keeps subscriptions private', async () => {
    await t.as('jano', `insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://push.example/abc', 'key', 'secret')`)
    expect(await t.as('fero', 'select 1 from public.push_subscriptions')).toEqual([])
    expect(await t.as('jano', 'select endpoint from public.push_subscriptions')).toEqual([{ endpoint: 'https://push.example/abc' }])
  })

  it('notifies a member added to the crew, but not the one who added himself', async () => {
    const event = (await t.as('admin', `insert into public.events (company_id, name, starts_on, ends_on, venue) values ($1, 'Ples', '2026-11-14', '2026-11-15', 'Dom kultúry') returning id`, [company]))[0].id
    await t.as('admin', `insert into public.event_crew (company_id, event_id, member_id, role) values ($1, $2, $3, 'zvukár'), ($1, $2, $4, '')`, [company, event, t.users.jano, t.users.admin])
    expect(await t.as('jano', 'select title, body, url from public.notifications')).toEqual([
      { title: 'Si v posádke: Ples', body: '14. 11. 2026 – 15. 11. 2026 · Dom kultúry · zvukár', url: `/events/${event}` },
    ])
    expect(await t.as('admin', 'select count(*)::int as n from public.notifications')).toEqual([{ n: 0 }])
  })

  it('notifies only newly assigned people of a task', async () => {
    const task = (await t.as('admin', `insert into public.tasks (company_id, title, assignee_ids) values ($1, 'Opraviť kábel', $2) returning id`, [company, [t.users.fero]]))[0].id
    await t.as('admin', `update public.tasks set assignee_ids = $2 where id = $1`, [task, [t.users.fero, t.users.jano]])
    expect(await t.as('fero', `select title from public.notifications`)).toEqual([{ title: 'Nová úloha: Opraviť kábel' }])
    expect(await t.as('jano', `select title from public.notifications order by created_at`)).toHaveLength(2)
  })

  it('lets a member send a test notification only to himself', async () => {
    await t.as('fero', `insert into public.notifications (user_id, title) values ($1, 'Skúška')`, [t.users.fero])
    await expect(t.as('fero', `insert into public.notifications (user_id, title) values ($1, 'Spam')`, [t.users.jano])).rejects.toThrow(/row-level security/)
  })

  it('copies socials from the personal profile into staff cards', async () => {
    await t.as('jano', `insert into public.personal_profiles (phone, socials) values ('0900', '{"instagram":"jano.sound"}')`)
    expect(await t.as('admin', `select socials->>'instagram' as ig from public.staff where member_id = $1`, [t.users.jano])).toEqual([{ ig: 'jano.sound' }])
  })
})
