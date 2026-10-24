// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let b: string
let mine: string
let firms: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'jano', 'other']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  b = (await t.as('boss', `select public.create_company('B') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer'), ($3, $2, 'viewer'), ($1, $4, 'technik')`, [a, t.users.jano, b, t.users.other])
  const card = (await t.as('boss', `select id from public.staff where company_id = $1 and member_id = $2`, [a, t.users.jano]))[0].id
  mine = (await t.as('boss', `insert into public.equipment (company_id, name, quantity, owner_staff_id) values ($1, 'Janov pult X32', 1, $2) returning id`, [a, card]))[0].id
  firms = (await t.as('boss', `insert into public.equipment (company_id, name, quantity) values ($1, 'Firemný pult', 1) returning id`, [a]))[0].id
})

describe('own equipment in other companies', () => {
  it('copies own equipment into another company with the owner card there', async () => {
    const copy = (await t.as('jano', 'select public.share_own_equipment($1, $2) as id', [mine, b]))[0].id
    expect((await t.as('jano', 'select public.share_own_equipment($1, $2) as id', [mine, b]))[0].id).toBe(copy)
    const [row] = await t.as('boss', `select e.name, e.shared_from, s.member_id from public.equipment e join public.staff s on s.id = e.owner_staff_id where e.id = $1`, [copy])
    expect(row).toEqual({ name: 'Janov pult X32', shared_from: mine, member_id: t.users.jano })
  })

  it('refuses equipment the caller does not own', async () => {
    await expect(t.as('jano', 'select public.share_own_equipment($1, $2)', [firms, b])).rejects.toThrow(/nepatrí/)
    await expect(t.as('other', 'select public.share_own_equipment($1, $2)', [mine, b])).rejects.toThrow(/nepatrí/)
  })

  it('syncs changes to copies and removes a copy', async () => {
    await t.as('boss', `update public.equipment set name = 'Janov pult X32 Compact', quantity = 2 where id = $1`, [mine])
    expect((await t.as('jano', 'select public.sync_own_equipment($1) as n', [mine]))[0].n).toBe(1)
    const [copy] = await t.as('boss', 'select id, name, quantity from public.equipment where shared_from = $1', [mine])
    expect(copy).toMatchObject({ name: 'Janov pult X32 Compact', quantity: 2 })
    await expect(t.as('jano', 'select public.unshare_own_equipment($1)', [mine])).rejects.toThrow(/kópia/)
    await t.as('jano', 'select public.unshare_own_equipment($1)', [copy.id])
    expect(await t.as('boss', 'select count(*)::int as n from public.equipment where shared_from = $1', [mine])).toEqual([{ n: 0 }])
  })
})
