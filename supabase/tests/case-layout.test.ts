import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let box: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
  box = (await t.as('boss', `insert into public.cases (company_id, name) values ($1, 'Ukážkový case') returning id`, [a]))[0].id
})

describe('priehradky v case', () => {
  it('rozloženie mení len ten, kto upravuje cases', async () => {
    const layout = '{"rows":2,"cols":3,"cells":[]}'
    expect(await t.as('boss', 'update public.cases set layout = $2 where id = $1 returning layout', [box, layout])).toEqual([{ layout: { rows: 2, cols: 3, cells: [] } }])
    expect(await t.as('viewer', `update public.cases set layout = '{}' where id = $1 returning id`, [box])).toEqual([])
    expect(await t.as('outsider', `update public.cases set layout = '{}' where id = $1 returning id`, [box])).toEqual([])
    await expect(t.as('boss', `update public.cases set layout = '[]' where id = $1`, [box])).rejects.toThrow(/check/)
  })
})
