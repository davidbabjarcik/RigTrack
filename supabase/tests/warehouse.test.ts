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

  it('keeps rack bays with their own shelves and the bay of a case', async () => {
    const id = (await addSpot('skladnik', 'Regál P'))[0].id
    const bays = JSON.stringify([{ widthCm: 267, levels: [{ heightCm: 160, pallets: 3 }, { heightCm: 120 }, { heightCm: 100 }] }, { widthCm: 267, levels: [{ heightCm: 200 }] }])
    await t.as('skladnik', 'update public.warehouse_spots set bays = $2::jsonb where id = $1', [id, bays])
    expect((await t.as('viewer', 'select jsonb_array_length(bays) as n from public.warehouse_spots where id = $1', [id]))[0]).toEqual({ n: 2 })
    await expect(t.as('skladnik', `update public.warehouse_spots set bays = '{}'::jsonb where id = $1`, [id])).rejects.toThrow(/check/)
    await t.as('technik', 'update public.cases set spot_id = $2, spot_bay = 2, spot_level = 1 where id = $1', [box, id])
    expect(await t.as('viewer', 'select spot_bay, spot_level from public.cases where id = $1', [box])).toEqual([{ spot_bay: 2, spot_level: 1 }])
    await t.as('technik', 'update public.cases set spot_pallet = 3 where id = $1', [box])
    expect(await t.as('viewer', 'select spot_pallet from public.cases where id = $1', [box])).toEqual([{ spot_pallet: 3 }])
    await expect(t.as('technik', 'update public.cases set spot_pallet = 0 where id = $1', [box])).rejects.toThrow(/check/)
    const pallet = (await addSpot('skladnik', 'Paleta 1'))[0].id
    await t.as('skladnik', `update public.warehouse_spots set kind = 'pallet', material = 'plastic' where id = $1`, [pallet])
    expect(await t.as('viewer', 'select material from public.warehouse_spots where id = $1', [pallet])).toEqual([{ material: 'plastic' }])
    await expect(t.as('skladnik', `update public.warehouse_spots set material = 'kov' where id = $1`, [pallet])).rejects.toThrow(/check/)
    await t.as('skladnik', `update public.warehouses set truss_layout = '{"cols": 4, "rows": 2, "stacks": []}' where company_id = $1`, [companyA])
    expect(await t.as('viewer', `select truss_layout->>'cols' as cols from public.warehouses where company_id = $1`, [companyA])).toEqual([{ cols: '4' }])
    await expect(t.as('skladnik', `update public.warehouses set truss_layout = '[]' where company_id = $1`, [companyA])).rejects.toThrow(/check/)
  })

  it('follows the warehouse permission, not the lists one', async () => {
    // Technik so skladom (výnimka člena) smie regály; skladník bez neho nie.
    await t.rows(`insert into public.member_permissions (company_id, user_id, permission, allowed) values ($1, $2, 'warehouse.manage', true), ($1, $3, 'warehouse.manage', false)`, [companyA, t.users.technik, t.users.skladnik])
    await addSpot('technik', 'Regál T')
    await expect(addSpot('skladnik', 'Regál S')).rejects.toThrow(/row-level security/)
    expect(await t.as('technik', `select public.can($1, 'lookups.manage') as lists`, [companyA])).toEqual([{ lists: false }])
  })

  it('keeps the rack types of the company', async () => {
    const types = JSON.stringify([{ id: 'a', name: 'Paletový', depthCm: 110, bays: [{ widthCm: 267, levels: [{ heightCm: 160, pallets: 3 }] }] }])
    await t.as('admin', 'update public.warehouses set rack_types = $2::jsonb where company_id = $1', [companyA, types])
    expect(await t.as('viewer', `select rack_types->0->>'name' as name from public.warehouses`)).toEqual([{ name: 'Paletový' }])
    expect(await t.as('viewer', 'update public.warehouses set rack_types = $2::jsonb where company_id = $1 returning 1', [companyA, '[]'])).toEqual([])
    await expect(t.as('admin', `update public.warehouses set rack_types = '{}'::jsonb where company_id = $1`, [companyA])).rejects.toThrow(/check/)
  })
})
