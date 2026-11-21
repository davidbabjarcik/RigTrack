import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'tech', 'viewer', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik'), ($1, $3, 'viewer')`, [a, t.users.tech, t.users.viewer])
})

describe('šablóny eventov', () => {
  it('ukladá a maže, kto upravuje eventy; vidí, kto vidí eventy; cudzí nič', async () => {
    const [row] = await t.as('boss', `insert into public.event_templates (company_id, name, data) values ($1, 'Svadba – základ', '{"venue":"Ukážková sála"}') returning id, created_by`, [a])
    expect(row.created_by).toBe(t.users.boss)
    expect(await t.as('viewer', 'select name from public.event_templates')).toEqual([{ name: 'Svadba – základ' }])
    expect(await t.as('outsider', 'select name from public.event_templates')).toEqual([])
    await expect(t.as('viewer', `insert into public.event_templates (company_id, name) values ($1, 'X')`, [a])).rejects.toThrow(/row-level/)
    await expect(t.as('outsider', `insert into public.event_templates (company_id, name) values ($1, 'X')`, [a])).rejects.toThrow(/row-level/)
    expect(await t.as('viewer', 'delete from public.event_templates returning id')).toEqual([])
    // Autora ani firmu nikto neprepíše.
    await expect(t.as('boss', 'update public.event_templates set company_id = gen_random_uuid()')).rejects.toThrow(/permission/)
    await expect(t.as('boss', `insert into public.event_templates (company_id, name, created_by) values ($1, 'Y', $2)`, [a, t.users.tech])).rejects.toThrow(/permission/)
    expect(await t.as('boss', 'delete from public.event_templates returning id')).toHaveLength(1)
  })

  it('obmedzí názov a veľkosť obsahu', async () => {
    await expect(t.as('boss', `insert into public.event_templates (company_id, name) values ($1, '  ')`, [a])).rejects.toThrow(/check/)
    await expect(t.as('boss', `insert into public.event_templates (company_id, name, data) values ($1, 'Veľká', jsonb_build_object('x', repeat(md5(random()::text), 5000)))`, [a])).rejects.toThrow(/check/)
  })
})
