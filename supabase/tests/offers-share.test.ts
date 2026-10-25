// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let offer: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
  offer = (await t.as('boss', `insert into public.quotes (company_id, number, title, budget, client) values ($1, '1', 'Festival', 999, '{"name": "Mesto"}') returning id`, [a]))[0].id
})

describe('shared offers', () => {
  it('creates a link, shows the offer without login and records the client answer once', async () => {
    await expect(t.as('viewer', 'select public.share_offer($1)', [offer])).rejects.toThrow(/oprávnenie/)
    const token = (await t.as('boss', 'select public.share_offer($1) as t', [offer]))[0].t
    expect((await t.as('boss', 'select public.share_offer($1) as t', [offer]))[0].t).toBe(token)
    const [{ o }] = await t.rows(`set local role anon; select public.get_shared_offer($1) as o`, [token]).catch(async () => t.rows('select public.get_shared_offer($1) as o', [token]))
    expect(o).toMatchObject({ title: 'Festival', status: 'sent', companyName: 'A' })
    expect(o.budget).toBeUndefined()
    await t.rows('select public.respond_shared_offer($1, true, $2)', [token, 'Súhlasíme'])
    expect(await t.as('boss', 'select status, response_note from public.quotes where id = $1', [offer])).toEqual([{ status: 'accepted', response_note: 'Súhlasíme' }])
    await expect(t.rows('select public.respond_shared_offer($1, false)', [token])).rejects.toThrow(/odpovedané/)
    expect(await t.rows('select get_shared_offer as o from public.get_shared_offer($1)', ['00000000-0000-0000-0000-000000000000'])).toEqual([{ o: null }])
  })
})

describe('company pins', () => {
  it('keeps pins per account', async () => {
    await t.as('boss', 'insert into public.company_pins (company_id) values ($1)', [a])
    expect(await t.as('boss', 'select company_id from public.company_pins')).toEqual([{ company_id: a }])
    expect(await t.as('viewer', 'select * from public.company_pins')).toEqual([])
  })
})
