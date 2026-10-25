// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let event: string

const titles = async (user: string) => (await t.rows('select title from public.notifications where user_id = $1 order by created_at, title', [t.users[user]])).map((row) => row.title)

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'jano']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik')`, [a, t.users.jano])
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Festival', current_date + 10, current_date + 11) returning id`, [a]))[0].id
  await t.as('boss', `insert into public.event_crew (company_id, event_id, member_id) values ($1, $2, $3)`, [a, event, t.users.jano])
})

describe('notification center', () => {
  it('tells the crew about a date change and a cancellation', async () => {
    await t.as('boss', `update public.events set starts_on = current_date + 12, ends_on = current_date + 12 where id = $1`, [event])
    await t.as('boss', `update public.events set note = 'x' where id = $1`, [event])
    await t.as('boss', `update public.events set status = 'cancelled' where id = $1`, [event])
    expect(await titles('jano')).toEqual(['Si v posádke: Festival', 'Zmena: Festival', 'Zrušené: Festival'])
  })

  it('tells the event creator when someone declines', async () => {
    await t.as('jano', `update public.event_crew set response = 'no', response_note = 'som chorý' where event_id = $1`, [event])
    expect(await titles('boss')).toEqual(['Niekto nemôže: Festival'])
  })

  it('lets the owner mark as read and delete', async () => {
    await t.as('jano', 'update public.notifications set read_at = now() where user_id = $1', [t.users.jano])
    expect((await t.as('jano', 'select count(*)::int as n from public.notifications where read_at is null'))[0].n).toBe(0)
    await t.as('jano', `delete from public.notifications where title like 'Zmena%'`)
    expect(await titles('jano')).toEqual(['Si v posádke: Festival', 'Zrušené: Festival'])
    await t.as('boss', `delete from public.notifications where user_id = $1`, [t.users.jano])
    expect(await titles('jano')).toHaveLength(2)
  })

  it('reminds an upcoming meeting and an overdue loan once', async () => {
    const live = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ples', current_date, current_date) returning id`, [a]))[0].id
    await t.as('boss', `insert into public.event_crew (company_id, event_id, member_id) values ($1, $2, $3)`, [a, live, t.users.jano])
    await t.as('boss', `insert into public.event_meetings (company_id, event_id, meet_at) values ($1, $2, now() + interval '1 hour')`, [a, live])
    await t.as('boss', `insert into public.loans (company_id, borrower, starts_on, ends_on, status) values ($1, 'Kultúrny dom', current_date - 5, current_date - 1, 'issued')`, [a])
    expect((await t.rows('select public.remind_meetings_and_loans() as n'))[0].n).toBe(2)
    expect((await t.rows('select public.remind_meetings_and_loans() as n'))[0].n).toBe(0)
    expect((await titles('jano')).some((title) => title.startsWith('Stretávka o '))).toBe(true)
    expect(await titles('boss')).toContain('Výpožička po termíne: Kultúrny dom')
  })
})
