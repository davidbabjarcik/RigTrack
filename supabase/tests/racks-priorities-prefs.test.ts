// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string

beforeAll(async () => {
  t = await createTestDb()
  await t.signUp('boss', 'boss@example.com')
  await t.signUp('other', 'other@example.com')
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
})

describe('racks, task priorities and user prefs', () => {
  it('stores a rack with its height in U', async () => {
    await t.as('boss', `insert into public.cases (company_id, name, kind, rack_units) values ($1, 'Rack zosilňovače', 'rack', 12)`, [a])
    expect(await t.as('boss', 'select kind, rack_units from public.cases')).toEqual([{ kind: 'rack', rack_units: 12 }])
    await expect(t.as('boss', `insert into public.cases (company_id, name, rack_units) values ($1, 'X', 99)`, [a])).rejects.toThrow()
  })

  it('creates tasks without priority by default', async () => {
    await t.as('boss', `insert into public.tasks (company_id, title) values ($1, 'Úloha')`, [a])
    expect(await t.as('boss', 'select priority from public.tasks')).toEqual([{ priority: 'none' }])
  })

  it('keeps prefs private to the account', async () => {
    await t.as('boss', `insert into public.user_prefs (prefs) values ('{"a":1}')`)
    expect(await t.as('boss', 'select prefs from public.user_prefs')).toEqual([{ prefs: { a: 1 } }])
    expect(await t.as('other', 'select prefs from public.user_prefs')).toEqual([])
  })
})

describe('bags', () => {
  it('stores a bag next to cases and racks', async () => {
    await t.as('boss', `insert into public.cases (company_id, name, kind) values ($1, 'Taška na stojany', 'bag')`, [a])
    expect(await t.as('boss', `select kind from public.cases where name = 'Taška na stojany'`)).toEqual([{ kind: 'bag' }])
  })
})
