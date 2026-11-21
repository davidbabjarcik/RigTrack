import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let crew: string
let event: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on, venue) values ($1, 'Ukážkový ples', current_date + 5, current_date + 5, 'Ukážková sála') returning id`, [a]))[0].id
  crew = (await t.as('boss', `insert into public.event_crew (company_id, event_id, member_id, name, role) values ($1, $2, null, 'Ukážkový DJ', 'DJ') returning id`, [a, event]))[0].id
})

describe('potvrdenie termínu cez odkaz', () => {
  it('odkaz vytvorí len ten, kto upravuje eventy', async () => {
    await expect(t.as('viewer', 'select public.share_crew_invite($1)', [crew])).rejects.toThrow(/oprávnenie/)
    await expect(t.as('outsider', 'select public.share_crew_invite($1)', [crew])).rejects.toThrow(/oprávnenie/)
    await expect(t.as(null, 'select public.share_crew_invite($1)', [crew])).rejects.toThrow(/permission/)
    const first = (await t.as('boss', 'select public.share_crew_invite($1) as token', [crew]))[0].token
    expect((await t.as('boss', 'select public.share_crew_invite($1) as token', [crew]))[0].token).toBe(first)
  })

  it('externista bez prihlásenia vidí len svoju pozvánku a odpovie', async () => {
    const token = (await t.as('boss', 'select public.share_crew_invite($1) as token', [crew]))[0].token
    const invite = (await t.as(null, 'select public.get_crew_invite($1) as data', [token]))[0].data
    expect(invite).toMatchObject({ name: 'Ukážkový DJ', role: 'DJ', event: 'Ukážkový ples', venue: 'Ukážková sála', companyName: 'A', response: 'pending' })
    expect(Object.keys(invite)).not.toContain('client')
    expect((await t.as(null, 'select public.get_crew_invite(gen_random_uuid()) as data'))[0].data).toBeNull()

    await expect(t.as(null, `select public.respond_crew_invite($1, 'no', ' ')`, [token])).rejects.toThrow(/prečo/)
    await expect(t.as(null, `select public.respond_crew_invite($1, 'maybe', '')`, [token])).rejects.toThrow(/Neplatná/)
    await t.as(null, `select public.respond_crew_invite($1, 'yes', 'ignorované')`, [token])
    expect(await t.rows('select response, response_note from public.event_crew where id = $1', [crew])).toEqual([{ response: 'yes', response_note: '' }])
    expect(await t.rows(`select user_id, url from public.notifications where title like 'Ukážkový DJ potvrdil%'`)).toEqual([{ user_id: t.users.boss, url: `/events/${event}?tab=crew` }])
  })

  it('po skončení eventu sa odpovedať nedá', async () => {
    const token = (await t.as('boss', 'select public.share_crew_invite($1) as token', [crew]))[0].token
    await t.rows('update public.events set starts_on = current_date - 3, ends_on = current_date - 2 where id = $1', [event])
    await expect(t.as(null, `select public.respond_crew_invite($1, 'yes', '')`, [token])).rejects.toThrow(/skončil/)
  })
})
