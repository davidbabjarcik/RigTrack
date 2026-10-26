// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let item: string
let consumables: string

const createOrder = (items: object[]) =>
  t.as('admin', 'select public.create_order($1, $2::jsonb, $3::jsonb) as id', [
    companyA,
    JSON.stringify({ supplier: 'Thomann', ordered_at: '2026-10-01' }),
    JSON.stringify(items),
  ])

beforeAll(async () => {
  t = await createTestDb()
  await t.signUp('admin', 'admin@example.com')
  await t.signUp('technik', 'technik@example.com')
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik')`, [
    companyA,
    t.users.technik,
  ])
  item = (await t.as('admin', `insert into public.equipment (company_id, name) values ($1, 'Mixpult') returning id`, [companyA]))[0].id
  consumables = (
    await t.as('admin', `insert into public.equipment_categories (company_id, name, consumable) values ($1, 'Spotrebný', true) returning id`, [
      companyA,
    ])
  )[0].id
})

const update = (set: string) => t.as('technik', `update public.equipment set ${set} where id = $1 returning id`, [item])

describe('equipment details', () => {
  it('defaults to a general piece without extra data', async () => {
    const [row] = await t.as('admin', 'select kind, attributes::text, mac_address, service_interval_months from public.equipment where id = $1', [item])
    expect(row).toEqual({ kind: 'general', attributes: '{}', mac_address: '', service_interval_months: null })
  })

  it('stores kind-specific data, network addresses and the service interval', async () => {
    await update(`kind = 'light', attributes = '{"powerW": 200, "lightSource": "led"}'`)
    await update(`mac_address = '00:1A:2B:3C:4D:5E', ip_address = '192.168.1.50'`)
    await update(`service_interval_months = 12, last_service_on = '2026-01-15'`)
    const [row] = await t.as('admin', `select attributes ->> 'lightSource' as source, ip_address from public.equipment where id = $1`, [item])
    // Od 0107 sú IP a MAC v equipment_addresses (čítať len s oprávnením networks.addresses).
    expect(row).toEqual({ source: 'led', ip_address: '' })
    expect(await t.as('admin', 'select ip, mac from public.equipment_addresses where equipment_id = $1', [item])).toEqual([{ ip: '192.168.1.50', mac: '00:1A:2B:3C:4D:5E' }])
  })

  it('rejects malformed values', async () => {
    await expect(update(`kind = 'spaceship'`)).rejects.toThrow(/check constraint/)
    await expect(update(`mac_address = '00:1a:2b:3c:4d:5e'`)).rejects.toThrow(/check constraint/)
    await expect(update(`mac_address = 'not-a-mac'`)).rejects.toThrow(/check constraint/)
    await expect(update(`ip_address = 'router.local'`)).rejects.toThrow(/check constraint/)
    await expect(update(`service_interval_months = 0`)).rejects.toThrow(/check constraint/)
    await expect(update(`attributes = '[1, 2]'`)).rejects.toThrow(/check constraint/)
  })

  it('lets only admin and skladnik mark a category as consumable', async () => {
    expect(
      await t.as('technik', 'update public.equipment_categories set consumable = false where id = $1 returning id', [consumables]),
    ).toEqual([])
    expect(
      await t.as('admin', 'update public.equipment_categories set consumable = true where id = $1 returning id', [consumables]),
    ).toHaveLength(1)
  })
})

describe('order lines memory', () => {
  it('records the decision, category and kind of each line', async () => {
    await createOrder([
      { name: 'Viazačky', article_number: 'A1', quantity: 3, unit_price: 6.23, mode: 'none', category_id: consumables },
      { name: 'XLR 5 m', article_number: 'A2', quantity: 10, unit_price: 7, mode: 'bulk', kind: 'cable', attributes: { connector: 'XLR', lengthM: 5 } },
      { name: 'LED Par', article_number: 'A3', quantity: 2, unit_price: 90, mode: 'separate', kind: 'light' },
    ])
    const lines = await t.as('admin', 'select article_number, mode, category_id, unit_price from public.order_lines order by article_number')
    expect(lines).toEqual([
      { article_number: 'A1', mode: 'none', category_id: consumables, unit_price: '6.23' },
      { article_number: 'A2', mode: 'bulk', category_id: null, unit_price: '7.00' },
      { article_number: 'A3', mode: 'separate', category_id: null, unit_price: '90.00' },
    ])
  })

  it('creates the equipment with the requested kind and data', async () => {
    const [cable] = await t.as('admin', `select kind, quantity, attributes ->> 'lengthM' as length from public.equipment where name = 'XLR 5 m'`)
    expect(cable).toEqual({ kind: 'cable', quantity: 10, length: '5' })
    expect(await t.as('admin', `select kind from public.equipment where name = 'LED Par'`)).toEqual([{ kind: 'light' }, { kind: 'light' }])
    expect(await t.as('admin', `select 1 from public.equipment where name = 'Viazačky'`)).toEqual([])
  })

  it('hides order lines from a technik', async () => {
    expect(await t.as('technik', 'select 1 from public.order_lines')).toEqual([])
    await expect(t.as(null, 'select 1 from public.order_lines')).rejects.toThrow(/permission denied/)
  })
})
