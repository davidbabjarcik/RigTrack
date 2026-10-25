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

describe('task links', () => {
  it('stores a link back to the page where the task came from', async () => {
    await t.as('boss', `insert into public.tasks (company_id, title, link) values ($1, 'Doplniť: Váha – LED Par', '/equipment/x/edit')`, [a])
    expect(await t.as('boss', 'select title, link from public.tasks')).toEqual([{ title: 'Doplniť: Váha – LED Par', link: '/equipment/x/edit' }])
  })
})
