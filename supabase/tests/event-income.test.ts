// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let event: string

const pay = (user: string, amount: number, method: string) =>
  t.as(user, 'insert into public.event_payments (company_id, event_id, amount, method) values ($1, $2, $3, $4) returning id', [companyA, event, amount, method])

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [companyA, t.users.skladnik, 'skladnik'])
  event = (await t.as('admin', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Festival', '2026-09-05', '2026-09-05') returning id`, [companyA]))[0].id
})

describe('event income', () => {
  it('is recorded in cash or to the account by those who manage payouts', async () => {
    await pay('admin', 100, 'cash')
    await pay('admin', 200, 'account')
    expect(await t.as('admin', 'select method, amount::float, created_by_name from public.event_payments order by amount')).toEqual([
      { method: 'cash', amount: 100, created_by_name: 'admin@example.com' },
      { method: 'account', amount: 200, created_by_name: 'admin@example.com' },
    ])
  })

  it('is hidden from others unless the admin allows it', async () => {
    await expect(pay('skladnik', 50, 'cash')).rejects.toThrow(/row-level security/)
    expect(await t.as('skladnik', 'select 1 from public.event_payments')).toEqual([])
    expect(await t.as('outsider', 'select 1 from public.event_payments')).toEqual([])
    await t.as('admin', `insert into public.member_permissions (company_id, user_id, permission, allowed) values ($1, $2, 'payouts.manage', true)`, [companyA, t.users.skladnik])
    expect(await t.as('skladnik', 'select count(*)::int as n from public.event_payments')).toEqual([{ n: 2 }])
  })

  it('can be an invoice through one of the companies, with or without VAT', async () => {
    await t.as(
      'admin',
      `insert into public.event_payments (company_id, event_id, amount, method, invoiced_by, vat, vat_rate) values ($1, $2, 1500, 'invoice', 'JEF Production', 'without', 23)`,
      [companyA, event],
    )
    expect(await t.as('admin', `select invoiced_by, vat, vat_rate::float from public.event_payments where method = 'invoice'`)).toEqual([
      { invoiced_by: 'JEF Production', vat: 'without', vat_rate: 23 },
    ])
    await expect(t.as('admin', `insert into public.event_payments (company_id, event_id, amount, method, vat) values ($1, $2, 1, 'cash', 'maybe')`, [companyA, event])).rejects.toThrow(/check constraint/)
  })

  it('rejects nonsense', async () => {
    await expect(pay('admin', 0, 'cash')).rejects.toThrow(/check constraint/)
    await expect(pay('admin', 10, 'card')).rejects.toThrow(/check constraint/)
  })
})

describe('category colors and kinds', () => {
  it('accept the palette and the new kinds only', async () => {
    await t.as('admin', `insert into public.equipment_categories (company_id, name, color) values ($1, 'Svetlá', 'green')`, [companyA])
    await expect(t.as('admin', `insert into public.equipment_categories (company_id, name, color) values ($1, 'Iné', 'gold')`, [companyA])).rejects.toThrow(/check constraint/)
    await t.as('admin', `insert into public.equipment (company_id, name, kind) values ($1, 'F34 2 m', 'truss'), ($1, 'Nivtec 2x1', 'stage')`, [companyA])
    await expect(t.as('admin', `insert into public.equipment (company_id, name, kind) values ($1, 'x', 'boat')`, [companyA])).rejects.toThrow(/check constraint/)
  })
})
