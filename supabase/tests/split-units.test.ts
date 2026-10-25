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

const units = (id: string) => t.as('boss', 'select quantity, unit_ids from public.equipment where id = $1', [id])
const add = async (name: string, quantity: number, tracked: boolean) =>
  (await t.as('boss', `insert into public.equipment (company_id, name, kind, quantity, track_units) values ($1, $2, 'light', $3, $4) returning id`, [a, name, quantity, tracked]))[0].id as string

describe('splitting equipment keeps piece numbers', () => {
  it('moves the chosen pieces into a case and keeps the rest numbered', async () => {
    const heads = await add('Hlava', 12, false)
    const box = (await t.as('boss', `insert into public.cases (company_id, name) values ($1, 'Case 4') returning id`, [a]))[0].id
    const part = (await t.as('boss', 'select public.split_equipment_units($1, $2, $3) as id', [heads, box, [7, 8]]))[0].id
    expect(await units(part)).toEqual([{ quantity: 2, unit_ids: [7, 8] }])
    expect(await units(heads)).toEqual([{ quantity: 10, unit_ids: [1, 2, 3, 4, 5, 6, 9, 10, 11, 12] }])
  })

  it('splitting by count takes the next numbers instead of starting at 1 again', async () => {
    const heads = await add('Hlava B', 6, true)
    const box = (await t.as('boss', `insert into public.cases (company_id, name) values ($1, 'Case B') returning id`, [a]))[0].id
    const part = (await t.as('boss', 'select public.split_equipment_into_case($1, $2, 2) as id', [heads, box]))[0].id
    expect(await units(part)).toEqual([{ quantity: 2, unit_ids: [1, 2] }])
    expect(await units(heads)).toEqual([{ quantity: 4, unit_ids: [3, 4, 5, 6] }])
    await expect(t.as('boss', 'select public.split_equipment_units($1, $2, $3)', [heads, box, [99]])).rejects.toThrow(/aspoň jeden/)
    // Kusy bez čísel (káble) sa delia len na počet.
    const cables = await add('Kábel', 20, false)
    const some = (await t.as('boss', 'select public.split_equipment_into_case($1, $2, 5) as id', [cables, box]))[0].id
    expect(await units(some)).toEqual([{ quantity: 5, unit_ids: [] }])
    expect(await units(cables)).toEqual([{ quantity: 15, unit_ids: [] }])
  })
})
