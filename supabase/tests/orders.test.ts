// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let companyB: string
let hooks: string
let foreignItem: string

const ORDER = { supplier: 'Thomann', order_number: 'T-1001', ordered_at: '2026-10-01' }

const createOrder = (user: string, company: string, items: object[], order: object = ORDER) =>
  t.as(user, 'select public.create_order($1, $2::jsonb, $3::jsonb) as id', [company, JSON.stringify(order), JSON.stringify(items)])

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik', 'technik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  companyB = (await t.as('outsider', `select public.create_company('B') as id`))[0].id
  for (const role of ['skladnik', 'technik', 'viewer']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [
      companyA,
      t.users[role],
      role,
    ])
  }
  hooks = (
    await t.as('admin', `insert into public.equipment (company_id, name, quantity) values ($1, 'Hák', 20) returning id`, [companyA])
  )[0].id
  foreignItem = (
    await t.as('outsider', `insert into public.equipment (company_id, name) values ($1, 'Cudzí hák') returning id`, [companyB])
  )[0].id
})

describe('create_order', () => {
  let orderId: string

  it('creates the order, its lines and the equipment in every mode', async () => {
    orderId = (
      await createOrder('skladnik', companyA, [
        { name: 'LED Par 64', quantity: 4, unit_price: 89.5, mode: 'separate', equipment_name: 'Svetlo LED Par' },
        { name: 'Hák 50 mm', quantity: 16, unit_price: 5, mode: 'existing', equipment_id: hooks },
        { name: 'XLR kábel 10 m', quantity: 10, unit_price: 7.9, mode: 'bulk' },
        { name: 'Doprava', quantity: 1, unit_price: 9.9, mode: 'none' },
      ])
    )[0].id

    const lights = await t.as('admin', `select quantity from public.equipment where name = 'Svetlo LED Par'`)
    expect(lights).toEqual([{ quantity: 1 }, { quantity: 1 }, { quantity: 1 }, { quantity: 1 }])
    expect(await t.as('admin', 'select quantity from public.equipment where id = $1', [hooks])).toEqual([{ quantity: 36 }])
    expect(await t.as('admin', `select quantity from public.equipment where name = 'XLR kábel 10 m'`)).toEqual([{ quantity: 10 }])
    expect(await t.as('admin', `select 1 from public.equipment where name = 'Doprava'`)).toEqual([])
  })

  it('reports item count and total in the overview', async () => {
    const [row] = await t.as('admin', 'select supplier, item_count, total from public.orders_overview where id = $1', [orderId])
    expect(row).toEqual({ supplier: 'Thomann', item_count: 4, total: '526.90' })
  })

  it('exposes the purchase history of a piece of equipment', async () => {
    const history = await t.as(
      'admin',
      'select quantity, unit_price, supplier, ordered_at::text from public.equipment_purchases where equipment_id = $1',
      [hooks],
    )
    expect(history).toEqual([{ quantity: 16, unit_price: '5.00', supplier: 'Thomann', ordered_at: '2026-10-01' }])
  })

  it('rolls everything back when one line fails', async () => {
    await expect(
      createOrder('admin', companyA, [
        { name: 'Stativ', quantity: 2, unit_price: 30, mode: 'separate' },
        { name: 'Zlý riadok', quantity: 0, unit_price: 1, mode: 'none' },
      ]),
    ).rejects.toThrow(/check constraint/)
    expect(await t.rows(`select 1 from public.equipment where name = 'Stativ'`)).toEqual([])
    expect(await t.rows('select 1 from public.orders')).toHaveLength(1)
  })

  it('rejects an empty order and topping up equipment of another company', async () => {
    await expect(createOrder('admin', companyA, [])).rejects.toThrow(/aspoň jednu položku/)
    await expect(
      createOrder('admin', companyA, [{ name: 'Hák', quantity: 1, unit_price: 5, mode: 'existing', equipment_id: foreignItem }]),
    ).rejects.toThrow(/neexistuje/)
    expect(await t.rows('select quantity from public.equipment where id = $1', [foreignItem])).toEqual([{ quantity: 1 }])
  })

  it('keeps the equipment when the order is deleted', async () => {
    const [extra] = await createOrder('admin', companyA, [{ name: 'Gafa', quantity: 3, unit_price: 12, mode: 'bulk' }])
    expect(await t.as('skladnik', 'delete from public.orders where id = $1 returning id', [extra.id])).toEqual([])
    expect(await t.as('admin', 'delete from public.orders where id = $1 returning id', [extra.id])).toHaveLength(1)
    expect(await t.rows(`select quantity from public.equipment where name = 'Gafa'`)).toEqual([{ quantity: 3 }])
    expect(await t.rows('select 1 from public.order_items where order_id = $1', [extra.id])).toEqual([])
  })
})

describe('article numbers', () => {
  it('remembers which equipment a supplier article was added to', async () => {
    await createOrder('admin', companyA, [
      { name: 'Hák 50 mm', article_number: '105218', quantity: 4, unit_price: 5, mode: 'existing', equipment_id: hooks },
      { name: 'Bez kódu', quantity: 1, unit_price: 1, mode: 'bulk' },
    ])
    const known = await t.as(
      'skladnik',
      `select equipment_id from public.equipment_purchases where supplier ilike 'thomann' and article_number = '105218'`,
    )
    expect(known).toEqual([{ equipment_id: hooks }])
    expect(await t.as('admin', `select article_number from public.order_items where name = 'Bez kódu'`)).toEqual([
      { article_number: '' },
    ])
  })
})

describe('orders access', () => {
  it('hides orders and prices from technik and viewer', async () => {
    for (const user of ['technik', 'viewer']) {
      expect(await t.as(user, 'select 1 from public.orders')).toEqual([])
      expect(await t.as(user, 'select 1 from public.orders_overview')).toEqual([])
      expect(await t.as(user, 'select 1 from public.order_items')).toEqual([])
      expect(await t.as(user, 'select 1 from public.equipment_purchases')).toEqual([])
      await expect(createOrder(user, companyA, [{ name: 'x', quantity: 1, unit_price: 1, mode: 'none' }])).rejects.toThrow(
        /row-level security/,
      )
    }
  })

  it('isolates companies', async () => {
    expect(await t.as('outsider', 'select 1 from public.orders_overview')).toEqual([])
    expect(await t.as('outsider', 'select 1 from public.equipment_purchases')).toEqual([])
    await expect(createOrder('outsider', companyA, [{ name: 'x', quantity: 1, unit_price: 1, mode: 'none' }])).rejects.toThrow(
      /row-level security/,
    )
    await expect(t.as(null, 'select 1 from public.orders_overview')).rejects.toThrow(/permission denied/)
  })

  it('does not allow editing order lines after creation', async () => {
    await expect(t.as('admin', 'update public.order_items set unit_price = 0')).rejects.toThrow(/permission denied/)
    await expect(t.as('admin', 'delete from public.order_items')).rejects.toThrow(/permission denied/)
  })
})

describe('second-hand purchases', () => {
  let usedOrder: string

  it('keep the marketplace and the seller, and show them in the equipment history', async () => {
    usedOrder = (
      await createOrder('skladnik', companyA, [{ name: 'Moving head', quantity: 1, unit_price: 450, mode: 'separate' }], {
        supplier: 'Bazoš.sk',
        ordered_at: '2026-09-12',
        source: 'marketplace',
        seller: 'Jozef M.',
      })
    )[0].id
    expect(await t.as('admin', 'select source, seller, photo_path from public.orders_overview where id = $1', [usedOrder])).toEqual([
      { source: 'marketplace', seller: 'Jozef M.', photo_path: '' },
    ])
    expect(await t.as('admin', `select source, seller, ordered_at::text from public.equipment_purchases where order_id = $1`, [usedOrder])).toEqual([
      { source: 'marketplace', seller: 'Jozef M.', ordered_at: '2026-09-12' },
    ])
  })

  it('default to a shop and reject unknown sources', async () => {
    const [{ id }] = await createOrder('admin', companyA, [{ name: 'x', quantity: 1, unit_price: 1, mode: 'none' }])
    expect(await t.as('admin', 'select source, seller from public.orders where id = $1', [id])).toEqual([{ source: 'shop', seller: '' }])
    const line = [{ name: 'x', quantity: 1, unit_price: 1, mode: 'none' }]
    await expect(createOrder('admin', companyA, line, { supplier: 'X', source: 'auction' })).rejects.toThrow(/check constraint/)
  })

  it('may have a photo that goes to the bin and comes back', async () => {
    const photo = `${companyA}/order-1.jpg`
    // fotku mení len ten, kto smie upravovať objednávky
    expect(await t.as('technik', 'update public.orders set photo_path = $1 where id = $2 returning id', [photo, usedOrder])).toEqual([])
    await t.as('skladnik', 'update public.orders set photo_path = $1 where id = $2', [photo, usedOrder])
    await expect(t.as('skladnik', `update public.orders set supplier = 'x', source = 'shop' where id = $1`, [usedOrder])).rejects.toThrow(
      /permission denied/,
    )

    await expect(t.as('technik', `select public.trash_photo('orders', $1)`, [usedOrder])).rejects.toThrow(/nepodarilo zmazať/)
    await t.as('skladnik', `select public.trash_photo('orders', $1)`, [usedOrder])
    expect(await t.as('admin', 'select photo_path from public.orders where id = $1', [usedOrder])).toEqual([{ photo_path: '' }])
    const [item] = await t.as('admin', 'select id, kind, label, detail from public.recycle_bin_items($1)', [companyA])
    expect(item).toMatchObject({ kind: 'photo', label: 'Bazoš.sk', detail: 'fotka nákupu' })
    await t.as('admin', 'select public.restore_bin_item($1, $2, $3)', [companyA, 'photo', item.id])
    expect(await t.as('admin', 'select photo_path from public.orders where id = $1', [usedOrder])).toEqual([{ photo_path: photo }])
  })
})
