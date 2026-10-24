// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string
let bars: string

const createOrder = (user: string, items: object[]) =>
  t.as(user, 'select public.create_order($1, $2::jsonb, $3::jsonb) as id', [company, JSON.stringify({ supplier: 'Thomann', ordered_at: '2026-05-01' }), JSON.stringify(items)])

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'viewer']) await t.signUp(name, `${name}@example.com`)
  company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [company, t.users.viewer])
  bars = (await t.as('admin', `insert into public.equipment (company_id, name, quantity, track_units) values ($1, 'LED bar', 8, true) returning id`, [company]))[0].id
})

describe('order links to existing equipment', () => {
  it('links a new order line to pieces without changing the quantity', async () => {
    await createOrder('admin', [{ name: 'LED bar', quantity: 4, unit_price: 120, mode: 'link', equipment_id: bars, unit_numbers: [4, 1, 2, 3, 3] }])
    expect(await t.as('admin', 'select quantity from public.equipment where id = $1', [bars])).toEqual([{ quantity: 8 }])
    expect(await t.as('admin', 'select unit_numbers, quantity, has_invoice from public.equipment_purchases where equipment_id = $1', [bars])).toEqual([
      { unit_numbers: [1, 2, 3, 4], quantity: 4, has_invoice: true },
    ])
  })

  it('links an older order line afterwards and can undo it', async () => {
    const [{ id: order }] = await createOrder('admin', [{ name: 'LED bar (bazár)', quantity: 4, unit_price: 90, mode: 'none' }])
    const [{ id: item }] = await t.as('admin', 'select id from public.order_items where order_id = $1', [order])
    await expect(t.as('viewer', 'select public.link_order_item($1, $2, $3)', [item, bars, [5, 6]])).rejects.toThrow(/oprávnenie/)
    await t.as('admin', 'select public.link_order_item($1, $2, $3)', [item, bars, [5, 6, 7, 8]])
    expect(await t.as('admin', 'select mode from public.order_items where id = $1', [item])).toEqual([{ mode: 'link' }])
    expect(await t.as('admin', 'select count(*)::int as n from public.equipment_purchases where equipment_id = $1', [bars])).toEqual([{ n: 2 }])
    await t.as('admin', 'select public.unlink_order_item($1, $2)', [item, bars])
    expect(await t.as('admin', 'select mode from public.order_items where id = $1', [item])).toEqual([{ mode: 'none' }])
    expect(await t.as('admin', 'select quantity from public.equipment where id = $1', [bars])).toEqual([{ quantity: 8 }])
  })
})
