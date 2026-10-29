// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>

beforeAll(async () => {
  t = await createTestDb()
  await t.signUp('dev', 'dev@example.com')
  await t.signUp('boss', 'boss@example.com')
  await t.as('boss', `select public.create_company('Firma A')`)
  await t.rows('insert into public.app_developers (user_id) values ($1)', [t.users.dev])
})

describe('developer user list', () => {
  it('shows accounts with their companies and roles only to a developer', async () => {
    const rows = await t.as('dev', 'select email, companies from public.developer_users() order by email')
    expect(rows).toEqual([
      { email: 'boss@example.com', companies: [{ name: 'Firma A', role: 'admin', demo: false }] },
      { email: 'dev@example.com', companies: [] },
    ])
    expect(await t.as('boss', 'select * from public.developer_users()')).toEqual([])
  })
})
