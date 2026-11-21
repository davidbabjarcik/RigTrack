import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let box: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  box = (await t.as('boss', `insert into public.cases (company_id, name) values ($1, 'Ukážkový case') returning id`, [a]))[0].id
})

describe('kontrola case po položkách', () => {
  it('uloží, čo sa našlo; kto a kedy dopĺňa databáza', async () => {
    const items = JSON.stringify([{ equipmentId: '00000000-0000-4000-8000-0000000000a1', unit: null, expected: 10, found: 8 }])
    await t.as('boss', `insert into public.case_checks (company_id, case_id, note, items) values ($1, $2, '', $3)`, [a, box, items])
    expect(await t.as('boss', 'select checked_by, items from public.case_checks')).toEqual([{ checked_by: t.users.boss, items: JSON.parse(items) }])
    await expect(t.as('outsider', `insert into public.case_checks (company_id, case_id, note, items) values ($1, $2, '', '[]')`, [a, box])).rejects.toThrow(/row-level/)
    await expect(t.as('boss', `insert into public.case_checks (company_id, case_id, note, items) values ($1, $2, '', '{}')`, [a, box])).rejects.toThrow(/check/)
  })
})
