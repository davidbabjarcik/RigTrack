// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let real: string

const demoOf = async (user: string) => (await t.as(user, 'select public.my_demo_company() as id'))[0].id as string | null
const count = async (user: string, table: string) => Number((await t.as(user, `select count(*)::int as n from public.${table}`))[0].n)

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['anna', 'boris']) {
    await t.signUp(name, `${name}@example.com`)
  }
  real = (await t.as('anna', `select public.create_company('Skutočná') as id`))[0].id
  await t.as('anna', `insert into public.equipment (company_id, name) values ($1, 'Môj pult')`, [real])
})

describe('demo company', () => {
  let demo: string

  it('is created once per user, filled with sample data, with the user as admin', async () => {
    demo = (await t.as('anna', 'select public.create_demo_company() as id'))[0].id
    expect(await t.as('anna', 'select public.create_demo_company() as id')).toEqual([{ id: demo }])
    expect(await demoOf('anna')).toBe(demo)
    expect(await t.as('anna', 'select role from public.company_members where company_id = $1', [demo])).toEqual([{ role: 'admin' }])
    const sample = await t.as('anna', 'select count(*)::int as n from public.equipment where company_id = $1', [demo])
    expect(sample[0].n).toBeGreaterThan(10)
    expect(await t.as('anna', 'select count(*)::int as n from public.events where company_id = $1', [demo])).toEqual([{ n: 2 }])
  })

  it('belongs to its user only', async () => {
    expect(await demoOf('boris')).toBeNull()
    expect(await t.as('boris', 'select 1 from public.equipment')).toEqual([])
    const borisDemo = (await t.as('boris', 'select public.create_demo_company() as id'))[0].id
    expect(borisDemo).not.toBe(demo)
    await t.as('boris', 'select public.delete_demo_company()')
    expect(await demoOf('anna')).toBe(demo)
  })

  it('resets to the sample data and leaves real companies alone', async () => {
    await t.as('anna', `insert into public.equipment (company_id, name) values ($1, 'Skúšobná vec')`, [demo])
    const fresh = (await t.as('anna', 'select public.reset_demo_company() as id'))[0].id
    expect(fresh).not.toBe(demo)
    expect(await t.as('anna', `select 1 from public.equipment where name = 'Skúšobná vec'`)).toEqual([])
    expect(await t.as('anna', `select name from public.equipment where company_id = $1`, [real])).toEqual([{ name: 'Môj pult' }])

    await t.as('anna', 'select public.delete_demo_company()')
    expect(await demoOf('anna')).toBeNull()
    expect(await count('anna', 'companies')).toBe(1)
  })

  it('cannot be seeded or created by others directly', async () => {
    await expect(t.as('anna', 'select public.seed_demo_company($1)', [real])).rejects.toThrow(/permission denied/)
    await expect(t.as(null, 'select public.create_demo_company()')).rejects.toThrow(/permission denied/)
  })
})

describe('richer demo', () => {
  it('has staff, devices, wifi, technicians and payouts', async () => {
    await t.signUp('cyril', 'cyril@example.com')
    const demo = (await t.as('cyril', 'select public.create_demo_company() as id'))[0].id
    const count = async (table: string) => Number((await t.as('cyril', `select count(*)::int as n from public.${table} where company_id = $1`, [demo]))[0].n)
    expect(await count('staff')).toBeGreaterThanOrEqual(5)
    expect(await count('member_devices')).toBe(2)
    expect(await count('wifi_networks')).toBe(2)
    expect(await count('service_technicians')).toBe(2)
    expect(await count('member_payments')).toBe(2)
    expect(await t.as('cyril', 'select onboarded from public.staff where company_id = $1 and member_id = $2', [demo, t.users.cyril])).toEqual([{ onboarded: true }])
    // reset založí všetko znova
    const again = (await t.as('cyril', 'select public.reset_demo_company() as id'))[0].id
    expect(Number((await t.as('cyril', 'select count(*)::int as n from public.wifi_networks where company_id = $1', [again]))[0].n)).toBe(2)
  })
})

describe('demo company 4.0', () => {
  it('shows the new features: a numbered case set, a rack in U, split lights and tasks', async () => {
    await t.signUp('cyril', 'cyril@example.com')
    const demo = (await t.as('cyril', 'select public.create_demo_company() as id'))[0].id
    expect(await t.as('cyril', `select count(*)::int as n from public.cases where company_id = $1 and name = 'Svetlá case'`, [demo])).toEqual([{ n: 5 }])
    expect(await t.as('cyril', `select rack_units from public.cases where company_id = $1 and kind = 'rack'`, [demo])).toEqual([{ rack_units: 12 }])
    expect(await t.as('cyril', `select sum(quantity)::int as q from public.equipment where company_id = $1 and name = 'Beam 230'`, [demo])).toEqual([{ q: 10 }])
    expect(await t.as('cyril', `select count(*)::int as n from public.tasks where company_id = $1 and category = 'Doplniť'`, [demo])).toEqual([{ n: 1 }])
  })
})
