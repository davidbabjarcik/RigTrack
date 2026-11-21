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

const sent = () => t.rows(`select user_id, body, url from public.notifications where title like 'Treba dokúpiť:%' order by created_at`)

describe('upozornenie treba dokúpiť', () => {
  it('príde raz pri poklese na hranicu tomu, kto zapisuje objednávky', async () => {
    const id = (await t.as('boss', `insert into public.equipment (company_id, name, kind, quantity, min_quantity) values ($1, 'Ukážková páska', 'consumable', 10, 3) returning id`, [a]))[0].id
    await t.as('boss', 'update public.equipment set quantity = 5 where id = $1', [id])
    expect(await sent()).toEqual([])
    await t.as('boss', 'update public.equipment set quantity = 3 where id = $1', [id])
    await t.as('boss', 'update public.equipment set quantity = 1 where id = $1', [id])
    const rows = await sent()
    expect(rows).toEqual([{ user_id: t.users.boss, body: 'Ostáva 3 ks (hranica 3).', url: `/orders/new?restock=${id}` }])
    // Po doplnení a ďalšom poklese znova.
    await t.as('boss', 'update public.equipment set quantity = 20 where id = $1', [id])
    await t.as('boss', 'update public.equipment set quantity = 0 where id = $1', [id])
    expect((await sent()).map((row) => row.body)).toEqual(['Ostáva 3 ks (hranica 3).', 'Došlo.'])
  })

  it('funkciu nikto nespustí priamo', async () => {
    await expect(t.as('boss', 'select public.notify_restock()')).rejects.toThrow(/permission|trigger/)
  })
})
