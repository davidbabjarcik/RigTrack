// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let b: string
let event: string
const png = 'data:image/png;base64,iVBORw0KGgo='

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'tech', 'viewer', 'stranger']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  b = (await t.as('stranger', `select public.create_company('B') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik'), ($1, $3, 'viewer')`, [a, t.users.tech, t.users.viewer])
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ukážkový event', '2026-12-01', '2026-12-01') returning id`, [a]))[0].id
})

describe('event contracts (0177)', () => {
  it('numbers contracts per company and year and keeps the content fixed', async () => {
    const year = new Date().getFullYear()
    const first = (await t.as('boss', `insert into public.event_contracts (company_id, event_id, kind, data, number) values ($1, $2, 'service', '{"price": 100}', 'X') returning id, number`, [a, event]))[0]
    const second = (await t.as('boss', `insert into public.event_contracts (company_id, event_id) values ($1, $2) returning number`, [a, event]))[0]
    expect([first.number, second.number]).toEqual([`Z${year}-001`, `Z${year}-002`])
    // Obsah sa po uložení nemení, podpisy áno.
    await expect(t.as('boss', `update public.event_contracts set data = '{}' where id = $1`, [first.id])).rejects.toThrow()
    await t.as('boss', `update public.event_contracts set client_signer = 'Ukážkový klient', client_signature = $2 where id = $1`, [first.id, png])
    expect(await t.as('boss', `select client_signer from public.event_contracts where id = $1`, [first.id])).toEqual([{ client_signer: 'Ukážkový klient' }])
  })

  it('is only for event editors of the company', async () => {
    expect(await t.as('viewer', 'select 1 from public.event_contracts')).toEqual([])
    expect(await t.as('stranger', 'select 1 from public.event_contracts')).toEqual([])
    await expect(t.as('stranger', `insert into public.event_contracts (company_id, event_id) values ($1, $2)`, [b, event])).rejects.toThrow()
    expect((await t.as('tech', 'select number from public.event_contracts')).length).toBe(2)
  })
})
