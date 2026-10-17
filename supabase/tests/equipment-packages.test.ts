// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string

const add = (user: string, name: string, items = '[]') =>
  t.as(user, 'insert into public.equipment_packages (company_id, name, category, items) values ($1, $2, $3, $4::jsonb) returning id', [companyA, name, 'Zvuk', items])

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik', 'technik', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const role of ['skladnik', 'technik']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [companyA, t.users[role], role])
  }
})

describe('equipment packages', () => {
  it('are managed by those who manage lists and offered to every member', async () => {
    const [box] = await add('skladnik', 'Malý zvukový balík', '[{"equipmentId":"x","quantity":2}]')
    await expect(add('technik', 'Iný')).rejects.toThrow(/row-level security/)
    expect(await t.as('technik', 'select name, category, items from public.equipment_packages')).toEqual([
      { name: 'Malý zvukový balík', category: 'Zvuk', items: [{ equipmentId: 'x', quantity: 2 }] },
    ])
    expect(await t.as('outsider', 'select 1 from public.equipment_packages')).toEqual([])
    expect(await t.as('technik', 'delete from public.equipment_packages where id = $1 returning id', [box.id])).toEqual([])
    await t.as('admin', `update public.equipment_packages set name = 'Malý zvuk' where id = $1`, [box.id])
  })

  it('have unique names and list contents', async () => {
    await expect(add('admin', 'MALÝ ZVUK')).rejects.toThrow(/duplicate key/)
    await expect(add('admin', 'Zlý', '{}')).rejects.toThrow(/check constraint/)
  })
})
