import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let event: string
let request: string
let tokens: string[]

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on, venue) values ($1, 'Tajný klient – svadba', '2026-12-01', '2026-12-02', 'Ukážkové mesto') returning id`, [a]))[0].id
})

const items = JSON.stringify([{ name: 'Ukážkový LED panel', quantity: 12 }, { name: 'Ukážkový subwoofer', quantity: 4, note: 'aktívny' }])
const suppliers = JSON.stringify([{ name: 'Ukážková požičovňa 1', email: 'a@example.com' }, { name: 'Ukážková požičovňa 2' }])

describe('dopyty na prenájom', () => {
  it('dopyt vytvorí len ten, kto upravuje akcie; každý dodávateľ má vlastný odkaz', async () => {
    await expect(t.as('viewer', `select public.create_rental_request($1, 'LED', '', '2026-12-01', '2026-12-02', $2::jsonb, $3::jsonb)`, [event, items, suppliers])).rejects.toThrow(/oprávnenie/)
    await expect(t.as('outsider', `select public.create_rental_request($1, 'LED', '', '2026-12-01', '2026-12-02', $2::jsonb, $3::jsonb)`, [event, items, suppliers])).rejects.toThrow(/oprávnenie/)
    await expect(t.as('boss', `select public.create_rental_request($1, 'LED', '', '2026-12-01', '2026-12-02', '[]'::jsonb, $2::jsonb)`, [event, suppliers])).rejects.toThrow(/položiek/)
    request = (await t.as('boss', `select public.create_rental_request($1, 'LED a suby', 'Doprava naša', '2026-12-01', '2026-12-02', $2::jsonb, $3::jsonb) as id`, [event, items, suppliers]))[0].id
    tokens = (await t.as('viewer', `select token from public.rental_request_suppliers order by supplier_name`)).map((row) => row.token)
    expect(tokens).toHaveLength(2)
    expect(tokens[0]).toHaveLength(64)
    expect(await t.as('outsider', `select id from public.rental_requests`)).toEqual([])
    await expect(t.as('viewer', `update public.rental_requests set status = 'closed'`)).resolves.toEqual([])
    expect((await t.as('boss', `select status from public.rental_requests`))[0].status).toBe('open')
  })

  it('dodávateľ bez prihlásenia vidí dopyt bez mena akcie a klienta; odpovie po riadkoch', async () => {
    const [{ data }] = await t.as(null, 'select public.get_rental_request($1) as data', [tokens[0]])
    expect([data.title, data.supplier, data.venue, data.open, data.items.length]).toEqual(['LED a suby', 'Ukážková požičovňa 1', 'Ukážkové mesto', true, 2])
    expect(JSON.stringify(data)).not.toContain('Tajný klient')
    const answers = JSON.stringify([{ item_id: data.items[0].id, available: 12, price: '35.50' }, { item_id: data.items[1].id, available: 2, price: 'zadarmo', note: 'len 2' }, { item_id: '00000000-0000-4000-8000-000000000000', available: 5 }])
    await t.as(null, `select public.answer_rental_request($1, $2::jsonb, 'Ďakujeme')`, [tokens[0], answers])
    const quotes = await t.as('viewer', `select available, unit_price, note from public.rental_quotes order by available desc`)
    expect(quotes).toEqual([{ available: 12, unit_price: '35.50', note: '' }, { available: 2, unit_price: null, note: 'len 2' }])
    const [{ data: again }] = await t.as(null, 'select public.get_rental_request($1) as data', [tokens[0]])
    expect([again.items[0].available, again.message]).toEqual([12, 'Ďakujeme'])
    const [{ data: other }] = await t.as(null, 'select public.get_rental_request($1) as data', [tokens[1]])
    expect(other.items[0].available).toBeNull()
  })

  it('zrušený odkaz a uzavretý dopyt', async () => {
    await t.as('boss', `update public.rental_request_suppliers set revoked_at = now() where token = $1`, [tokens[1]])
    expect((await t.as(null, 'select public.get_rental_request($1) as data', [tokens[1]]))[0].data).toBeNull()
    await expect(t.as(null, `select public.answer_rental_request($1, '[]'::jsonb)`, [tokens[1]])).rejects.toThrow(/neplatí/)
    await t.as('boss', `update public.rental_requests set status = 'closed' where id = $1`, [request])
    await expect(t.as(null, `select public.answer_rental_request($1, '[]'::jsonb)`, [tokens[0]])).rejects.toThrow(/uzavretý/)
    await expect(t.as('boss', `update public.rental_request_suppliers set token = 'x'`)).rejects.toThrow(/permission/)
    await expect(t.as(null, `select id from public.rental_quotes`)).rejects.toThrow(/permission/)
  })

  it('ďalší dodávateľ k dopytu', async () => {
    const [{ token }] = await t.as('boss', `select public.add_rental_supplier($1, 'Ukážková požičovňa 3', '') as token`, [request])
    expect(token).toHaveLength(64)
    await expect(t.as('viewer', `select public.add_rental_supplier($1, 'X', '')`, [request])).rejects.toThrow(/oprávnenie/)
  })
})
