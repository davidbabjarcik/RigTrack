// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string
let other: string

/** Koľko riadkov vo všetkých tabuľkách so stĺpcom company_id patrí firme. */
async function leftovers(id: string) {
  const tables = await t.rows(
    `select table_name from information_schema.columns
     where table_schema = 'public' and column_name = 'company_id'
       and table_name in (select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE')`,
  )
  let total = 0
  for (const { table_name } of tables) {
    total += Number((await t.rows(`select count(*)::int as n from public.${table_name} where company_id = $1`, [id]))[0].n)
  }
  return total
}

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik']) {
    await t.signUp(name, `${name}@example.com`)
  }
  company = (await t.as('admin', `select public.create_company('JEF Production') as id`))[0].id
  other = (await t.as('admin', `select public.create_company('Iná firma') as id`))[0].id
  await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [company, t.users.skladnik, 'skladnik'])
  // Naplní firmu ukážkovými dátami zo všetkých modulov.
  await t.rows('select public.seed_demo_company($1)', [company])
  await t.as('admin', `insert into public.service_technicians (company_id, name) values ($1, 'Peter')`, [company])
  await t.as('admin', `insert into public.equipment (company_id, name) values ($1, 'Pult inej firmy')`, [other])
})

describe('delete company', () => {
  it('is allowed only to an admin who types the exact name', async () => {
    await expect(t.as('skladnik', 'select public.delete_company($1, $2)', [company, 'JEF Production'])).rejects.toThrow(/Only an admin/)
    await expect(t.as('admin', 'select public.delete_company($1, $2)', [company, 'JEF'])).rejects.toThrow(/does not match/)
    expect(await leftovers(company)).toBeGreaterThan(20)
  })

  it('removes every row of the company and nothing else', async () => {
    await t.as('admin', 'select public.delete_company($1, $2)', [company, '  JEF Production '])
    expect(await t.rows('select 1 from public.companies where id = $1', [company])).toEqual([])
    expect(await leftovers(company)).toBe(0)
    expect(await t.as('skladnik', 'select 1 from public.company_members')).toEqual([])
    expect(await t.as('admin', 'select name from public.equipment')).toEqual([{ name: 'Pult inej firmy' }])
  })
})
