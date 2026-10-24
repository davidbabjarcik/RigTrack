// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string
let event: string
let van: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'driver', 'viewer']) await t.signUp(name, `${name}@example.com`)
  company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer'), ($1, $3, 'viewer')`, [company, t.users.driver, t.users.viewer])
  event = (await t.as('admin', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ples', '2026-11-01', '2026-11-01') returning id`, [company]))[0].id
  await t.as('admin', `insert into public.event_crew (company_id, event_id, member_id) values ($1, $2, $3)`, [company, event, t.users.driver])
  van = (await t.as('admin', `insert into public.vehicles (company_id, plate) values ($1, 'SP123AB') returning id`, [company]))[0].id
})

describe('event drives', () => {
  it('lets editors record anyone and crew only themselves', async () => {
    await t.as('admin', `insert into public.event_drives (company_id, event_id, drive_date, vehicle_id, driver_name, direction, km) values ($1, $2, '2026-11-01', $3, 'Brigádnik Peter', 'back', 42)`, [company, event, van])
    await t.as('driver', `insert into public.event_drives (company_id, event_id, drive_date, vehicle_id, member_id, direction, km) values ($1, $2, '2026-11-01', $3, $4, 'there', 42)`, [company, event, van, t.users.driver])
    await expect(t.as('driver', `insert into public.event_drives (company_id, event_id, drive_date, member_id) values ($1, $2, '2026-11-01', $3)`, [company, event, t.users.viewer])).rejects.toThrow(/row-level security/)
    await expect(t.as('viewer', `insert into public.event_drives (company_id, event_id, drive_date, member_id) values ($1, $2, '2026-11-01', $3)`, [company, event, t.users.viewer])).rejects.toThrow(/row-level security/)
    expect(await t.as('viewer', 'select sum(km)::float as km from public.event_drives')).toEqual([{ km: 84 }])
  })

  it('keeps the drive when the vehicle is deleted', async () => {
    await t.as('admin', 'delete from public.vehicles where id = $1', [van])
    expect(await t.as('admin', 'select count(*)::int as n, count(vehicle_id)::int as with_vehicle from public.event_drives')).toEqual([{ n: 2, with_vehicle: 0 }])
  })
})
