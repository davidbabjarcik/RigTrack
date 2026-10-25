// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let b: string
let mine: string
let copy: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'other', 'jano']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  b = (await t.as('other', `select public.create_company('B') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $3, 'technik'), ($2, $3, 'technik')`, [a, b, t.users.jano])
  // Jano je v posádke eventu firmy B 10.–12. 11.
  const eb = (await t.as('other', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Tajný event B', '2026-11-10', '2026-11-12') returning id`, [b]))[0].id
  await t.as('other', `insert into public.event_crew (company_id, event_id, member_id) values ($1, $2, $3)`, [b, eb, t.users.jano])
  // Janova vlastná technika je vo firme A a jej kópia vo firme B, kde je na evente (2 ks).
  const card = (await t.as('boss', `select id from public.staff where company_id = $1 and member_id = $2`, [a, t.users.jano]))[0].id
  mine = (await t.as('boss', `insert into public.equipment (company_id, name, quantity, owner_staff_id) values ($1, 'Janove svetlá', 4, $2) returning id`, [a, card]))[0].id
  copy = (await t.as('jano', 'select public.share_own_equipment($1, $2) as id', [mine, b]))[0].id
  await t.as('other', `insert into public.event_equipment (company_id, event_id, equipment_id, quantity) values ($1, $2, $3, 2)`, [b, eb, copy])
})

describe('conflicts across companies', () => {
  it('shows that a crew member is busy in another company without details', async () => {
    expect(await t.as('boss', `select member_id, events, starts_on::text as s from public.crew_busy_elsewhere($1, '2026-11-11', '2026-11-11')`, [a])).toEqual([{ member_id: t.users.jano, events: 1, s: '2026-11-10' }])
    expect(await t.as('boss', `select * from public.crew_busy_elsewhere($1, '2026-11-13', '2026-11-14')`, [a])).toEqual([])
  })

  it('shows own gear used by another company in the same time', async () => {
    expect(await t.as('boss', `select equipment_id, quantity from public.gear_busy_elsewhere($1, '2026-11-12', '2026-11-15')`, [a])).toEqual([{ equipment_id: mine, quantity: 2 }])
    expect(await t.as('other', `select * from public.gear_busy_elsewhere($1, '2026-11-12', '2026-11-15')`, [b])).toEqual([])
  })
})
