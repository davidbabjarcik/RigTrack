// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string
let amp: string

beforeAll(async () => {
  t = await createTestDb()
  await t.signUp('admin', 'admin@example.com')
  company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  amp = (await t.as('admin', `insert into public.equipment (company_id, name, quantity, track_units) values ($1, 'I-T4000', 2, true) returning id`, [company]))[0].id
})

describe('unit details', () => {
  it('stores serial and inventory numbers per piece', async () => {
    await t.as('admin', `update public.equipment set unit_info = $2::jsonb where id = $1`, [amp, JSON.stringify({ '1': { serial: 'CT12345', inv: 'Z-01' }, '2': { serial: 'CT12346' } })])
    expect(await t.as('admin', `select unit_info->'2'->>'serial' as serial from public.equipment`)).toEqual([{ serial: 'CT12346' }])
    await expect(t.as('admin', `update public.equipment set unit_info = '[]'::jsonb where id = $1`, [amp])).rejects.toThrow(/check constraint/)
  })

  it('reads hours per piece: highest state and the oldest reading date go to the equipment', async () => {
    const read = (unit: number, readOn: string, hours: number) =>
      t.as('admin', 'insert into public.equipment_hour_readings (company_id, equipment_id, unit, read_on, hours) values ($1, $2, $3, $4, $5)', [company, amp, unit, readOn, hours])
    await read(1, '2026-09-01', 1200)
    await read(2, '2026-10-01', 800)
    await read(1, '2026-10-15', 1350)
    expect(await t.as('admin', 'select operating_hours::float as hours, hours_read_on::text as read_on from public.equipment')).toEqual([{ hours: 1350, read_on: '2026-10-01' }])
  })
})
