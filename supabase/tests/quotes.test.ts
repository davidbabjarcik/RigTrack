// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer', 'other']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
})

describe('quotes', () => {
  it('editors write quotes and templates, members with offers.view read, others see nothing', async () => {
    await t.as('boss', `insert into public.role_permissions (company_id, role, permission, allowed) values ($1, 'viewer', 'offers.view', true)`, [a])
    await t.as('boss', `insert into public.quotes (company_id, number, title, sections) values ($1, '20261101', 'Podujatie', '[{"title": "Ozvučenie", "price": 500}]')`, [a])
    await t.as('boss', `insert into public.quote_templates (company_id, title, part) values ($1, 'Ozvučenie', '{"title": "Ozvučenie"}')`, [a])
    expect(await t.as('viewer', `select number, sections->0->>'title' as part from public.quotes`)).toEqual([{ number: '20261101', part: 'Ozvučenie' }])
    expect(await t.as('other', 'select * from public.quotes')).toEqual([])
    await expect(t.as('viewer', `insert into public.quotes (company_id) values ($1)`, [a])).rejects.toThrow()
    expect((await t.as('viewer', 'select count(*)::int as n from public.quote_templates'))[0].n).toBe(1)
  })
})

describe('quote issuers', () => {
  it('admin keeps several issuers, a quote remembers its issuer and budget', async () => {
    const issuer = (await t.as('boss', `insert into public.quote_issuers (company_id, name, ico, vat_payer) values ($1, 'Firma s.r.o.', '123', true), ($1, 'Meno Priezvisko – živnosť', '456', false) returning id`, [a]))[0].id
    await t.as('boss', `insert into public.quotes (company_id, issuer_id, issuer, budget) values ($1, $2, '{"name": "Firma s.r.o."}', 2500)`, [a, issuer])
    expect((await t.as('viewer', 'select count(*)::int as n from public.quote_issuers'))[0].n).toBe(2)
    await expect(t.as('viewer', `insert into public.quote_issuers (company_id, name) values ($1, 'X')`, [a])).rejects.toThrow()
    await expect(t.as('viewer', `delete from public.quotes`)).resolves.toEqual([])
    expect(await t.as('viewer', `select issuer->>'name' as n, budget::float as b from public.quotes where issuer_id is not null`)).toEqual([{ n: 'Firma s.r.o.', b: 2500 }])
  })
})
