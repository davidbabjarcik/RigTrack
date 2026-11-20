// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
})

describe('case corners and wheels (0174)', () => {
  it('stores whether dimensions include corners and where the wheels are', async () => {
    const box = (await t.as('boss', `insert into public.cases (company_id, name) values ($1, 'Ukážkový case') returning id, wheels, corners_included`, [a]))[0]
    expect(box).toMatchObject({ wheels: 'none', corners_included: null })
    await t.as('boss', `update public.cases set wheels = 'bottom', corners_included = true where id = $1`, [box.id])
    expect(await t.as('viewer', 'select wheels, corners_included from public.cases')).toEqual([{ wheels: 'bottom', corners_included: true }])
    await expect(t.as('boss', `update public.cases set wheels = 'roof' where id = $1`, [box.id])).rejects.toThrow()
  })
})
