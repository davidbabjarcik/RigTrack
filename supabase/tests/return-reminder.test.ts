import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'tech', 'viewer']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik'), ($1, $3, 'viewer')`, [a, t.users.tech, t.users.viewer])
})

const yesterday = `(now() at time zone 'Europe/Bratislava')::date - 1`
const event = async (name: string, endsOn: string, status = 'confirmed', gear = true) => {
  const id = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on, status) values ($1, $2, ${endsOn}, ${endsOn}, $3) returning id`, [a, name, status]))[0].id
  if (gear) {
    const piece = (await t.as('boss', `insert into public.equipment (company_id, name) values ($1, $2) returning id`, [a, `Ukážka ${name}`]))[0].id
    await t.as('boss', `insert into public.event_equipment (company_id, event_id, equipment_id, quantity) values ($1, $2, $3, 1)`, [a, id, piece])
  }
  return id
}
const remind = async () => Number((await t.rows('select public.remind_event_returns() as n'))[0].n)
const sent = (title: string) => t.rows(`select user_id from public.notifications where title = $1 order by user_id`, [title])

describe('pripomienka vrátenia techniky', () => {
  it('deň po evente s technikou bez uzavretého vrátenia, raz', async () => {
    const id = await event('Ples', yesterday)
    await t.as('boss', `insert into public.event_crew (company_id, event_id, member_id, name, role) values ($1, $2, $3, '', 'Technik')`, [a, id, t.users.tech])
    await event('Zrušený', yesterday, 'cancelled')
    await event('Bez techniky', yesterday, 'confirmed', false)
    await event('Dnešný', `(now() at time zone 'Europe/Bratislava')::date`)
    const closed = await event('Vrátený', yesterday)
    await t.as('boss', `select public.close_event_return($1, '[]'::jsonb)`, [closed])

    expect(await remind()).toBe(1)
    const who = (await sent('Vrátiť techniku: Ples')).map((row) => row.user_id)
    expect(who.sort()).toEqual([t.users.boss, t.users.tech].sort())
    expect(await remind()).toBe(0)
  })

  it('bežný používateľ funkciu nespustí ani nevidí záznamy', async () => {
    await expect(t.as('boss', 'select public.remind_event_returns()')).rejects.toThrow(/permission/)
    await expect(t.as('boss', 'select * from public.event_return_reminded')).rejects.toThrow(/permission/)
  })
})
