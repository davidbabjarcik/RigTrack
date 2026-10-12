// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let van: string

const addRecord = (user: string, kind: string, odometer: number | null) =>
  t.as(user, 'insert into public.vehicle_records (company_id, vehicle_id, kind, odometer_km, cost) values ($1, $2, $3, $4, 50) returning id', [
    companyA,
    van,
    kind,
    odometer,
  ])
const odometer = async () => (await t.as('viewer', 'select odometer_km from public.vehicles where id = $1', [van]))[0].odometer_km

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik', 'technik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const role of ['skladnik', 'technik', 'viewer']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [
      companyA,
      t.users[role],
      role,
    ])
  }
  van = (
    await t.as(
      'skladnik',
      `insert into public.vehicles (company_id, plate, model, odometer_km, stk_until) values ($1, 'SP123AB', 'VW Crafter', 100000, '2027-03-01') returning id`,
      [companyA],
    )
  )[0].id
})

describe('vehicles', () => {
  it('are visible to members only and editable by admin and skladnik', async () => {
    expect(await t.as('viewer', 'select plate from public.vehicles')).toEqual([{ plate: 'SP123AB' }])
    expect(await t.as('outsider', 'select plate from public.vehicles')).toEqual([])
    await expect(t.as(null, 'select 1 from public.vehicles')).rejects.toThrow(/permission denied/)

    const edit = `update public.vehicles set stk_until = '2028-03-01' where id = $1 returning id`
    expect(await t.as('technik', edit, [van])).toEqual([])
    expect(await t.as('skladnik', edit, [van])).toHaveLength(1)
    await expect(
      t.as('technik', `insert into public.vehicles (company_id, plate) values ($1, 'XX000XX')`, [companyA]),
    ).rejects.toThrow(/row-level security/)
  })

  it('keeps plates unique within a company regardless of case', async () => {
    await expect(
      t.as('admin', `insert into public.vehicles (company_id, plate) values ($1, 'sp123ab')`, [companyA]),
    ).rejects.toThrow(/unique|duplicate/)
  })

  it('lets only an admin delete a vehicle', async () => {
    const [extra] = await t.as('admin', `insert into public.vehicles (company_id, plate) values ($1, 'DEL001') returning id`, [companyA])
    expect(await t.as('skladnik', 'delete from public.vehicles where id = $1 returning id', [extra.id])).toEqual([])
    expect(await t.as('admin', 'delete from public.vehicles where id = $1 returning id', [extra.id])).toHaveLength(1)
  })
})

describe('vehicle records', () => {
  it('lets a technik log a record, which moves the odometer forward only', async () => {
    await addRecord('technik', 'fuel', 100500)
    expect(await odometer()).toBe(100500)
    // starší doklad zapísaný dodatočne tachometer nevráti späť
    await addRecord('technik', 'service', 99000)
    expect(await odometer()).toBe(100500)
    await addRecord('technik', 'other', null)
    expect(await odometer()).toBe(100500)
  })

  it('rejects records from viewers, outsiders and for unknown kinds', async () => {
    await expect(addRecord('viewer', 'fuel', 1)).rejects.toThrow(/row-level security/)
    await expect(addRecord('outsider', 'fuel', 1)).rejects.toThrow(/row-level security/)
    await expect(addRecord('admin', 'teleport', 1)).rejects.toThrow(/check constraint/)
    expect(await t.as('outsider', 'select 1 from public.vehicle_records')).toEqual([])
  })

  it('lets admin and skladnik delete a record, not a technik', async () => {
    const [record] = await addRecord('technik', 'tyres', null)
    expect(await t.as('technik', 'delete from public.vehicle_records where id = $1 returning id', [record.id])).toEqual([])
    expect(await t.as('skladnik', 'delete from public.vehicle_records where id = $1 returning id', [record.id])).toHaveLength(1)
  })
})
