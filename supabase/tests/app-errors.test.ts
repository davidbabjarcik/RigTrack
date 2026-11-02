// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string

const report = (who: string, message: string, stack = '', company: string | null = null) =>
  t.as(who, `select public.report_app_error($1, $2, 'render', '/warehouse', '6.2.0', 'Test', $3)`, [message, stack, company])

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['dev', 'boss', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.rows('insert into public.app_developers (user_id) values ($1)', [t.users.dev])
})

describe('app error reports', () => {
  it('counts the same error once per person and shows it only to developers', async () => {
    await report('boss', 'x is undefined', 'TypeError\n    at Rack (RackFront.tsx:10:5)', a)
    await report('boss', 'x is undefined', 'TypeError\n    at Rack (RackFront.tsx:10:5)', a)
    await report('outsider', 'x is undefined', 'TypeError\n    at Rack (RackFront.tsx:10:5)', a)
    const rows = await t.as('dev', 'select user_email, company_id, count, source from public.app_errors order by user_email')
    expect(rows).toEqual([
      { user_email: 'boss@example.com', company_id: a, count: 2, source: 'render' },
      // Outsider nie je vo firme A, firma sa neuloží.
      { user_email: 'outsider@example.com', company_id: null, count: 1, source: 'render' },
    ])
    expect(await t.as('boss', 'select * from public.app_errors')).toEqual([])
    await expect(t.as('boss', `insert into public.app_errors (fingerprint, message) values ('x', 'y')`)).rejects.toThrow(/permission/)
  })

  it('lets a developer resolve; a new occurrence then opens a fresh row', async () => {
    await t.as('dev', `update public.app_errors set resolved_at = now() where user_email = 'boss@example.com'`)
    expect(await t.as('boss', `update public.app_errors set resolved_at = null returning 1`)).toEqual([])
    await report('boss', 'x is undefined', 'TypeError\n    at Rack (RackFront.tsx:10:5)')
    expect(await t.as('dev', `select count(*)::int as n from public.app_errors where user_email = 'boss@example.com'`)).toEqual([{ n: 2 }])
    await t.as('dev', 'delete from public.app_errors')
    expect(await t.as('dev', 'select count(*)::int as n from public.app_errors')).toEqual([{ n: 0 }])
  })
})
