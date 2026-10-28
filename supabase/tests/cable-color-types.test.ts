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

describe('cable colours per cable type', () => {
  it('keeps a different colour for the same length per type', async () => {
    await t.as('boss', `insert into public.cable_colors (company_id, length_m, color) values ($1, 10, '#00a651')`, [a])
    await t.as('boss', `insert into public.cable_colors (company_id, cable_type, length_m, color) values ($1, 'xlr', 10, '#0000ff'), ($1, 'powercon', 10, '#ff0000')`, [a])
    expect(await t.as('boss', 'select cable_type, color from public.cable_colors order by cable_type')).toEqual([
      { cable_type: '', color: '#00a651' },
      { cable_type: 'powercon', color: '#ff0000' },
      { cable_type: 'xlr', color: '#0000ff' },
    ])
    await expect(t.as('boss', `insert into public.cable_colors (company_id, cable_type, length_m, color) values ($1, 'xlr', 10, '#123456')`, [a])).rejects.toThrow(/duplicate|unique/)
    await t.as('boss', `insert into public.cable_colors (company_id, cable_type, length_m, color) values ($1, 'Káblovka', 5, '#123456')`, [a])
    await expect(t.as('boss', `insert into public.cable_colors (company_id, cable_type, length_m, color) values ($1, $2, 5, '#123456')`, [a, 'x'.repeat(41)])).rejects.toThrow(/check/)
  })
})
