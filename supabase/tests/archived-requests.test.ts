// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let event: string
let old: string
let fresh: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'chief', 'tech', 'viewer']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'ceo'), ($1, $3, 'technik'), ($1, $4, 'viewer')`, [a, t.users.chief, t.users.tech, t.users.viewer])
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ukážkový event', '2026-12-01', '2026-12-01') returning id`, [a]))[0].id
  old = (await t.as('boss', `insert into public.equipment (company_id, name, status, quantity) values ($1, 'Stará hlava', 'archived', 4) returning id`, [a]))[0].id
  fresh = (await t.as('boss', `insert into public.equipment (company_id, name) values ($1, 'Nová hlava') returning id`, [a]))[0].id
})

describe('archived gear requests (0176)', () => {
  it('lets an event editor ask, notifies the CEO, and only the CEO decides', async () => {
    const id = (await t.as('tech', `insert into public.equipment_requests (company_id, event_id, equipment_id, quantity, note) values ($1, $2, $3, 2, 'na ples') returning id`, [a, event, old]))[0].id
    expect(await t.as('chief', `select title from public.notifications where title like 'Žiadosť%'`)).toEqual([{ title: 'Žiadosť o archívnu techniku' }])
    // Viewer nežiada, o nearchívnu techniku sa nežiada, technik nerozhoduje.
    await expect(t.as('viewer', `insert into public.equipment_requests (company_id, event_id, equipment_id) values ($1, $2, $3)`, [a, event, old])).rejects.toThrow()
    await expect(t.as('tech', `insert into public.equipment_requests (company_id, event_id, equipment_id) values ($1, $2, $3)`, [a, event, fresh])).rejects.toThrow()
    await expect(t.as('tech', `select public.decide_equipment_request($1, true)`, [id])).rejects.toThrow()
    await expect(t.as('tech', `update public.equipment_requests set status = 'approved' where id = $1`, [id])).rejects.toThrow()

    await t.as('chief', `select public.decide_equipment_request($1, true, 'ok')`, [id])
    expect(await t.as('tech', 'select equipment_id, quantity from public.event_equipment')).toEqual([{ equipment_id: old, quantity: 2 }])
    expect(await t.as('tech', `select status, answer from public.equipment_requests`)).toEqual([{ status: 'approved', answer: 'ok' }])
    expect(await t.as('tech', `select title from public.notifications`)).toEqual([{ title: 'Archívna technika schválená' }])
    await expect(t.as('chief', `select public.decide_equipment_request($1, false)`, [id])).rejects.toThrow(/rozhodnuté/)
  })

  it('lets the requester cancel a pending request only', async () => {
    const id = (await t.as('tech', `insert into public.equipment_requests (company_id, event_id, equipment_id) values ($1, $2, $3) returning id`, [a, event, old]))[0].id
    await t.as('chief', `select public.decide_equipment_request($1, false, 'nie')`, [id])
    expect(await t.as('tech', `delete from public.equipment_requests where id = $1 returning id`, [id])).toEqual([])
  })
})
