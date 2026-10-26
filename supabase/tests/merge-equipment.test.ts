// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let box: string

beforeAll(async () => {
  t = await createTestDb()
  await t.signUp('boss', 'boss@example.com')
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  box = (await t.as('boss', `insert into public.cases (company_id, name) values ($1, 'Case') returning id`, [a]))[0].id
})

describe('merging split equipment', () => {
  it('takes pieces out of a case back into the rest', async () => {
    const rope = (await t.as('boss', `insert into public.equipment (company_id, name, quantity) values ($1, 'Lanko', 10) returning id`, [a]))[0].id
    const part = (await t.as('boss', 'select public.split_equipment_into_case($1, $2, 2) as id', [rope, box]))[0].id
    expect(await t.as('boss', `select quantity from public.equipment where name = 'Lanko' order by quantity`)).toEqual([{ quantity: 2 }, { quantity: 8 }])
    const result = (await t.as('boss', 'select public.take_out_of_case($1) as id', [part]))[0].id
    expect(result).toBe(rope)
    expect(await t.as('boss', `select quantity, case_id from public.equipment where name = 'Lanko'`)).toEqual([{ quantity: 10, case_id: null }])
  })

  it('merges numbered pieces and moves their history', async () => {
    const heads = (await t.as('boss', `insert into public.equipment (company_id, name, quantity, track_units) values ($1, 'Hlava', 4, true) returning id`, [a]))[0].id
    const part = (await t.as('boss', 'select public.split_equipment_units($1, null, $2) as id', [heads, [3, 4]]))[0].id
    await t.as('boss', `insert into public.equipment_hour_readings (company_id, equipment_id, read_on, hours, unit) values ($1, $2, current_date, 100, 3)`, [a, part])
    await t.as('boss', 'select public.merge_equipment($1, $2)', [part, heads])
    expect(await t.as('boss', `select quantity, unit_ids from public.equipment where name = 'Hlava'`)).toEqual([{ quantity: 4, unit_ids: [1, 2, 3, 4] }])
    expect(await t.as('boss', 'select equipment_id from public.equipment_hour_readings')).toEqual([{ equipment_id: heads }])
  })

  it('refuses different equipment', async () => {
    const x = (await t.as('boss', `insert into public.equipment (company_id, name) values ($1, 'X') returning id`, [a]))[0].id
    const y = (await t.as('boss', `insert into public.equipment (company_id, name) values ($1, 'Y') returning id`, [a]))[0].id
    await expect(t.as('boss', 'select public.merge_equipment($1, $2)', [x, y])).rejects.toThrow(/tá istá technika/)
  })
})
