// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let light: string

const equipmentState = async () =>
  (await t.as('viewer', 'select status, last_service_on::text from public.equipment where id = $1', [light]))[0]
const open = (user: string, status = 'open', date = '2026-10-10') =>
  t.as(user, 'insert into public.service_records (company_id, equipment_id, status, happened_on, problem) values ($1, $2, $3, $4, $5) returning id', [
    companyA,
    light,
    status,
    date,
    'Nesvieti',
  ])

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'technik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const role of ['technik', 'viewer']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [
      companyA,
      t.users[role],
      role,
    ])
  }
  light = (await t.as('admin', `insert into public.equipment (company_id, name) values ($1, 'Svetlo') returning id`, [companyA]))[0].id
})

describe('service records', () => {
  let record: string

  it('puts the equipment into service while a record is open', async () => {
    record = (await open('technik'))[0].id
    expect(await equipmentState()).toEqual({ status: 'in_service', last_service_on: null })
  })

  it('returns it to available and records the service date once done', async () => {
    await t.as('technik', `update public.service_records set status = 'done', work_done = 'Vymenený zdroj', hours = 1.5 where id = $1`, [record])
    expect(await equipmentState()).toEqual({ status: 'available', last_service_on: '2026-10-10' })
  })

  it('never moves the last service date backwards', async () => {
    await open('technik', 'done', '2026-01-05')
    expect((await equipmentState()).last_service_on).toBe('2026-10-10')
    await open('technik', 'done', '2026-10-12')
    expect((await equipmentState()).last_service_on).toBe('2026-10-12')
  })

  it('leaves retired equipment retired', async () => {
    await t.as('admin', `update public.equipment set status = 'retired' where id = $1`, [light])
    await open('technik')
    expect((await equipmentState()).status).toBe('retired')
    await t.as('admin', `update public.equipment set status = 'available' where id = $1`, [light])
  })

  it('is read-only for viewers and invisible to other companies', async () => {
    await expect(open('viewer')).rejects.toThrow(/row-level security/)
    await expect(open('outsider')).rejects.toThrow(/row-level security/)
    expect(await t.as('viewer', 'select count(*)::int as n from public.service_records')).toEqual([{ n: 4 }])
    expect(await t.as('outsider', 'select 1 from public.service_records')).toEqual([])
    await expect(t.as(null, 'select 1 from public.service_records')).rejects.toThrow(/permission denied/)
  })

  it('lets only admin and skladnik delete', async () => {
    expect(await t.as('technik', 'delete from public.service_records where id = $1 returning id', [record])).toEqual([])
    expect(await t.as('admin', 'delete from public.service_records where id = $1 returning id', [record])).toHaveLength(1)
  })
})
