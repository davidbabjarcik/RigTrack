// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string

beforeAll(async () => {
  t = await createTestDb()
  await t.signUp('boss', 'boss@example.com')
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
})

describe('extra hour counters', () => {
  it('keeps the operating hours from the main counter only', async () => {
    const beam = (await t.as('boss', `insert into public.equipment (company_id, name) values ($1, 'Beam') returning id`, [a]))[0].id
    await t.as('boss', `insert into public.equipment_hour_readings (company_id, equipment_id, read_on, hours) values ($1, $2, current_date, 1200)`, [a, beam])
    await t.as('boss', `insert into public.equipment_hour_readings (company_id, equipment_id, read_on, hours, counter) values ($1, $2, current_date, 300, 'Výbojka')`, [a, beam])
    expect(await t.as('boss', 'select operating_hours from public.equipment where id = $1', [beam])).toEqual([{ operating_hours: '1200.0' }])
    expect(await t.as('boss', `select counter, hours from public.equipment_hour_readings where equipment_id = $1 order by hours`, [beam])).toEqual([
      { counter: 'Výbojka', hours: '300.0' },
      { counter: '', hours: '1200.0' },
    ])
  })
})
