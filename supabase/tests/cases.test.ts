// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let companyB: string
let caseA: string
let caseB: string
let itemA: string

const insertCase = (company: string, name: string) =>
  ['insert into public.cases (company_id, name) values ($1, $2) returning id', [company, name]] as const

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
  caseA = (await t.as('admin', ...insertCase(companyA, 'Case mikrofóny')))[0].id
  caseB = (await t.as('outsider', ...insertCase(companyB, 'Cudzí case')))[0].id
  itemA = (
    await t.as('admin', `insert into public.equipment (company_id, name) values ($1, 'Mikrofón') returning id`, [companyA])
  )[0].id
})

describe('cases isolation', () => {
  it('shows only cases of the own company', async () => {
    expect(await t.as('viewer', 'select name from public.cases')).toEqual([{ name: 'Case mikrofóny' }])
    expect(await t.as('outsider', 'select name from public.cases')).toEqual([{ name: 'Cudzí case' }])
    await expect(t.as(null, 'select * from public.cases')).rejects.toThrow(/permission denied/)
  })

  it('rejects writes into another company', async () => {
    await expect(t.as('admin', ...insertCase(companyB, 'Podvrh'))).rejects.toThrow(/row-level security/)
    expect(await t.as('admin', `update public.cases set name = 'x' where id = $1 returning id`, [caseB])).toEqual([])
    expect(await t.as('admin', 'delete from public.cases where id = $1 returning id', [caseB])).toEqual([])
    await expect(t.as('admin', 'update public.cases set company_id = $1 where id = $2', [companyB, caseA])).rejects.toThrow(
      /permission denied/,
    )
  })

  it('does not allow putting equipment into a case of another company', async () => {
    await expect(t.as('admin', 'update public.equipment set case_id = $1 where id = $2', [caseB, itemA])).rejects.toThrow(
      /foreign key/,
    )
  })
})

describe('cases roles', () => {
  it('lets a viewer only read', async () => {
    await expect(t.as('viewer', ...insertCase(companyA, 'x'))).rejects.toThrow(/row-level security/)
    expect(await t.as('viewer', 'update public.equipment set case_id = $1 where id = $2 returning id', [caseA, itemA])).toEqual([])
  })

  it('lets a technik create a case and pack equipment, but not delete the case', async () => {
    const [created] = await t.as('technik', ...insertCase(companyA, 'Case káble'))
    expect(
      await t.as('technik', 'update public.equipment set case_id = $1 where id = $2 returning case_id', [created.id, itemA]),
    ).toEqual([{ case_id: created.id }])
    expect(await t.as('technik', 'delete from public.cases where id = $1 returning id', [created.id])).toEqual([])
  })

  it('unpacks equipment when a skladnik deletes the case', async () => {
    await t.as('admin', 'update public.equipment set case_id = $1 where id = $2', [caseA, itemA])
    expect(await t.as('skladnik', 'delete from public.cases where id = $1 returning id', [caseA])).toHaveLength(1)
    expect(await t.as('admin', 'select case_id, company_id from public.equipment where id = $1', [itemA])).toEqual([
      { case_id: null, company_id: companyA },
    ])
  })
})
