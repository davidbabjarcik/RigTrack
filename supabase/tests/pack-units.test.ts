// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let event: string
let beam: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'stranger']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Koncert', current_date, current_date) returning id`, [a]))[0].id
  beam = (await t.as('boss', `insert into public.equipment (company_id, name, quantity, track_units) values ($1, 'Beam', 2, true) returning id`, [a]))[0].id
})

describe('pack list pieces', () => {
  it('records scanned pieces once per phase', async () => {
    const add = (unit: number) => t.as('boss', `insert into public.event_pack_units (company_id, event_id, equipment_id, unit, phase) values ($1, $2, $3, $4, 'out')`, [a, event, beam, unit])
    await add(1)
    await expect(add(1)).rejects.toThrow(/duplicate key/)
    await add(2)
    expect(await t.as('boss', `select unit from public.event_pack_units order by unit`)).toEqual([{ unit: 1 }, { unit: 2 }])
    expect(await t.as('stranger', 'select unit from public.event_pack_units')).toEqual([])
  })
})
