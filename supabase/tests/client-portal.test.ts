import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let event: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('Ukážková firma') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
  event = (await t.as('boss', `insert into public.events (company_id, name, venue, starts_on, ends_on) values ($1, 'Ukážková svadba', 'Ukážková sála', current_date + 5, current_date + 5) returning id`, [a]))[0].id
  await t.rows(`insert into public.quotes (company_id, event_id, title, share_token) values ($1, $2, 'Zdieľaná', gen_random_uuid()), ($1, $2, 'Nezdieľaná', null)`, [a, event])
})

describe('odkaz pre klienta', () => {
  it('vytvorí ho len ten, kto upravuje eventy', async () => {
    await expect(t.as('viewer', 'select public.share_event_client($1)', [event])).rejects.toThrow(/oprávnenie/)
    const token = (await t.as('boss', 'select public.share_event_client($1) as token', [event]))[0].token
    expect((await t.as('boss', 'select public.share_event_client($1) as token', [event]))[0].token).toBe(token)
  })

  it('klient bez prihlásenia vidí len akciu a zdieľané dokumenty', async () => {
    const [{ token }] = await t.as('boss', 'select client_token as token from public.events where id = $1', [event])
    const [{ data }] = await t.as(null, 'select public.get_event_client($1) as data', [token])
    expect(data.event).toBe('Ukážková svadba')
    expect(data.venue).toBe('Ukážková sála')
    expect(data.offers.map((offer: { title: string }) => offer.title)).toEqual(['Zdieľaná'])
    expect(data.contracts).toEqual([])
    expect(data.rating).toBeNull()
    expect((await t.as(null, 'select public.get_event_client(gen_random_uuid()) as data'))[0].data).toBeNull()
  })

  it('po zrušení odkaz neplatí', async () => {
    const [{ token }] = await t.as('boss', 'select client_token as token from public.events where id = $1', [event])
    await expect(t.as('viewer', 'select public.unshare_event_client($1)', [event])).rejects.toThrow(/oprávnenie/)
    await t.as('boss', 'select public.unshare_event_client($1)', [event])
    expect((await t.as(null, 'select public.get_event_client($1) as data', [token]))[0].data).toBeNull()
  })
})
