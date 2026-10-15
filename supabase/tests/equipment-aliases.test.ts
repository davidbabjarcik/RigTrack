// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let companyB: string
let sharpy: string
let foreign: string

const remember = (user: string, alias: string, equipmentId: string, company = companyA) =>
  t.as(user, 'insert into public.equipment_aliases (company_id, alias, equipment_id) values ($1, $2, $3)', [company, alias, equipmentId])

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'technik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  companyB = (await t.as('outsider', `select public.create_company('B') as id`))[0].id
  for (const role of ['technik', 'viewer']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [companyA, t.users[role], role])
  }
  sharpy = (await t.as('admin', `insert into public.equipment (company_id, name) values ($1, 'Sharpy') returning id`, [companyA]))[0].id
  foreign = (await t.as('outsider', `insert into public.equipment (company_id, name) values ($1, 'Cudzie') returning id`, [companyB]))[0].id
})

describe('equipment aliases', () => {
  it('are remembered by those who edit events and read by every member', async () => {
    await remember('technik', 'clay paky sharpy', sharpy)
    await expect(remember('viewer', 'iny', sharpy)).rejects.toThrow(/row-level security/)
    expect(await t.as('viewer', 'select alias from public.equipment_aliases')).toEqual([{ alias: 'clay paky sharpy' }])
    expect(await t.as('outsider', 'select 1 from public.equipment_aliases')).toEqual([])
  })

  it('point only to equipment of the same company and are unique', async () => {
    await expect(remember('admin', 'cudzie', foreign)).rejects.toThrow(/foreign key/)
    await expect(remember('admin', 'clay paky sharpy', sharpy)).rejects.toThrow(/duplicate key/)
  })

  it('disappear with the equipment', async () => {
    await t.as('admin', 'delete from public.equipment where id = $1', [sharpy])
    expect(await t.rows('select 1 from public.equipment_aliases')).toEqual([])
  })
})
