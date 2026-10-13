// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let box: string

const addSpot = (user: string, name: string, company = companyA) =>
  t.as(user, 'insert into public.warehouse_spots (company_id, name, x, y, length, width, levels) values ($1, $2, 0, 0, 200, 80, 3) returning id', [company, name])

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik', 'technik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const role of ['skladnik', 'technik', 'viewer']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [companyA, t.users[role], role])
  }
  box = (await t.as('admin', `insert into public.cases (company_id, name) values ($1, 'Audio case') returning id`, [companyA]))[0].id
})

describe('warehouse plan', () => {
  let rack: string

  it('is drawn by those who manage lists and seen by every member', async () => {
    await t.as('skladnik', 'insert into public.warehouses (company_id, length_cm, width_cm) values ($1, 1200, 800)', [companyA])
    rack = (await addSpot('skladnik', 'Regál A'))[0].id
    await expect(addSpot('technik', 'Regál B')).rejects.toThrow(/row-level security/)
    await expect(addSpot('viewer', 'Regál B')).rejects.toThrow(/row-level security/)
    expect(await t.as('viewer', 'select name from public.warehouse_spots')).toEqual([{ name: 'Regál A' }])
    expect(await t.as('viewer', 'select length_cm from public.warehouses')).toEqual([{ length_cm: 1200 }])
    expect(await t.as('outsider', 'select 1 from public.warehouse_spots')).toEqual([])
    await expect(t.as(null, 'select 1 from public.warehouse_spots')).rejects.toThrow(/permission denied/)
  })

  it('lets the plan be moved and resized but not handed to another company', async () => {
    await t.as('skladnik', 'update public.warehouse_spots set x = 300, length = 250 where id = $1', [rack])
    await t.as('skladnik', 'update public.warehouses set width_cm = 900 where company_id = $1', [companyA])
    expect(await t.as('viewer', 'select x, length from public.warehouse_spots where id = $1', [rack])).toEqual([{ x: 300, length: 250 }])
    await expect(t.as('skladnik', 'update public.warehouse_spots set company_id = gen_random_uuid() where id = $1', [rack])).rejects.toThrow(/permission denied/)
  })

  it('places a case on a spot and forgets the place when the spot is removed', async () => {
    await t.as('technik', 'update public.cases set spot_id = $1, spot_level = 2 where id = $2', [rack, box])
    expect(await t.as('viewer', 'select spot_id, spot_level from public.cases where id = $1', [box])).toEqual([{ spot_id: rack, spot_level: 2 }])
    expect(await t.as('viewer', 'update public.cases set spot_id = null where id = $1 returning id', [box])).toEqual([])
    await expect(t.as('technik', 'update public.cases set spot_level = 99 where id = $1', [box])).rejects.toThrow(/check constraint/)

    expect(await t.as('technik', 'delete from public.warehouse_spots where id = $1 returning id', [rack])).toEqual([])
    expect(await t.as('skladnik', 'delete from public.warehouse_spots where id = $1 returning id', [rack])).toHaveLength(1)
    expect((await t.as('viewer', 'select spot_id from public.cases where id = $1', [box]))[0].spot_id).toBeNull()
  })
})
