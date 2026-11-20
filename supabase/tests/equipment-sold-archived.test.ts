// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let event: string
let archived: string
let sold: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'chief', 'tech']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'ceo'), ($1, $3, 'technik')`, [a, t.users.chief, t.users.tech])
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ukážkový event', '2026-12-01', '2026-12-01') returning id`, [a]))[0].id
  archived = (await t.as('boss', `insert into public.equipment (company_id, name, status) values ($1, 'Stará hlava', 'archived') returning id`, [a]))[0].id
  sold = (await t.as('boss', `insert into public.equipment (company_id, name, status) values ($1, 'Predaný pult', 'sold') returning id`, [a]))[0].id
})

describe('sold and archived equipment (0175)', () => {
  it('lets only the CEO put archived gear on an event', async () => {
    await expect(t.as('tech', `insert into public.event_equipment (company_id, event_id, equipment_id, quantity) values ($1, $2, $3, 1)`, [a, event, archived])).rejects.toThrow(/CEO/)
    // Admin (zakladateľ firmy) nie je CEO – ani on.
    await expect(t.as('boss', `insert into public.event_equipment (company_id, event_id, equipment_id, quantity) values ($1, $2, $3, 1)`, [a, event, archived])).rejects.toThrow(/CEO/)
    await t.as('chief', `insert into public.event_equipment (company_id, event_id, equipment_id, quantity) values ($1, $2, $3, 1)`, [a, event, archived])
    expect(await t.as('tech', 'select equipment_id from public.event_equipment')).toEqual([{ equipment_id: archived }])
  })

  it('lets an admin add archived gear when the company has no CEO', async () => {
    const b = (await t.as('tech', `select public.create_company('B') as id`))[0].id
    const other = (await t.as('tech', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Iný event', '2026-12-01', '2026-12-01') returning id`, [b]))[0].id
    const old = (await t.as('tech', `insert into public.equipment (company_id, name, status) values ($1, 'Starý repro', 'archived') returning id`, [b]))[0].id
    await t.as('tech', `insert into public.event_equipment (company_id, event_id, equipment_id, quantity) values ($1, $2, $3, 1)`, [b, other, old])
  })

  it('never puts sold gear on an event', async () => {
    await expect(t.as('chief', `insert into public.event_equipment (company_id, event_id, equipment_id, quantity) values ($1, $2, $3, 1)`, [a, event, sold])).rejects.toThrow(/Predaná/)
  })
})
