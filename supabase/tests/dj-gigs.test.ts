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

describe('DJ gigs (0173)', () => {
  it('stores the kind of an event, regular by default, and only allowed values', async () => {
    const plain = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Akcia', '2026-11-20', '2026-11-20') returning id, kind`, [a]))[0]
    expect(plain.kind).toBe('event')
    await t.as('boss', `update public.events set kind = 'dj' where id = $1`, [plain.id])
    expect(await t.as('viewer', 'select kind from public.events')).toEqual([{ kind: 'dj' }])
    await expect(t.as('boss', `update public.events set kind = 'party' where id = $1`, [plain.id])).rejects.toThrow()
    // Kto eventy nemôže upravovať, nezmení ani druh.
    await t.as('viewer', `update public.events set kind = 'event' where id = $1`, [plain.id]).catch(() => [])
    expect(await t.as('boss', 'select kind from public.events')).toEqual([{ kind: 'dj' }])
  })
})
