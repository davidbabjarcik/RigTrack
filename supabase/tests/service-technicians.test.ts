// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let companyB: string
let technician: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  companyB = (await t.as('outsider', `select public.create_company('B') as id`))[0].id
  for (const [name, role] of [['skladnik', 'skladnik'], ['viewer', 'viewer']]) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [companyA, t.users[name], role])
  }
})

describe('service technicians', () => {
  it('lets editors manage the directory and viewers only read it', async () => {
    technician = (
      await t.as('skladnik', `insert into public.service_technicians (company_id, name, firm, phone, scope) values ($1, 'Peter Opravár', 'AV Servis', '+421 900', 'equipment') returning id`, [companyA])
    )[0].id
    await expect(t.as('viewer', `insert into public.service_technicians (company_id, name) values ($1, 'X')`, [companyA])).rejects.toThrow(/row-level security/)
    await expect(t.as('skladnik', `insert into public.service_technicians (company_id, name) values ($1, ' ')`, [companyA])).rejects.toThrow(/check constraint/)
    await expect(t.as('skladnik', `insert into public.service_technicians (company_id, name, scope) values ($1, 'Y', 'boats')`, [companyA])).rejects.toThrow(/check constraint/)
    expect(await t.as('viewer', 'select name, firm from public.service_technicians')).toEqual([{ name: 'Peter Opravár', firm: 'AV Servis' }])
    expect(await t.as('viewer', `update public.service_technicians set name = 'Z' where id = $1 returning id`, [technician])).toEqual([])
    expect(await t.as('outsider', 'select 1 from public.service_technicians')).toEqual([])
  })

  it('links vehicles within the same company and clears the link on delete', async () => {
    const vehicle = (await t.as('admin', `insert into public.vehicles (company_id, plate) values ($1, 'SP123AB') returning id`, [companyA]))[0].id
    await t.as('admin', 'update public.vehicles set technician_id = $1 where id = $2', [technician, vehicle])
    const foreignVehicle = (await t.as('outsider', `insert into public.vehicles (company_id, plate) values ($1, 'KE1') returning id`, [companyB]))[0].id
    await expect(t.as('outsider', 'update public.vehicles set technician_id = $1 where id = $2', [technician, foreignVehicle])).rejects.toThrow(/foreign key/)

    await t.as('admin', 'delete from public.service_technicians where id = $1', [technician])
    expect(await t.as('admin', 'select technician_id, company_id = $2 as same from public.vehicles where id = $1', [vehicle, companyA])).toEqual([{ technician_id: null, same: true }])
    const audit = await t.as('admin', `select action from public.audit_log where entity = 'service_technicians' order by id`)
    expect(audit.map((row) => row.action)).toEqual(['insert', 'delete'])
  })
})
