import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let incident: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'tech', 'other', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const name of ['tech', 'other']) await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik')`, [a, t.users[name]])
  incident = (await t.as('tech', `insert into public.incidents (company_id, kind, occurred_on, title, created_by) values ($1, 'damage', current_date, 'Poškodené: Ukážkový reprák', auth.uid()) returning id`, [a]))[0].id
})

const attach = (who: string, entity = incident) =>
  t.as(who, `insert into public.attachments (company_id, entity_type, entity_id, name, path) values ($1, 'incident', $2, 'foto.jpg', $3) returning id`, [a, entity, `${a}/incident/${entity}/x.jpg`])

describe('fotky pri škodách', () => {
  it('pridá ten, kto škodu zapísal, a admin; iný člen nie', async () => {
    expect(await attach('tech')).toHaveLength(1)
    expect(await attach('boss')).toHaveLength(1)
    await expect(attach('other')).rejects.toThrow(/row-level/)
    await expect(attach('outsider')).rejects.toThrow(/row-level/)
  })

  it('vidí ich len ten, kto vidí škodu', async () => {
    const count = async (who: string) => (await t.as(who, `select count(*)::int as n from public.attachments where entity_type = 'incident'`))[0].n
    expect(await count('tech')).toBe(2)
    expect(await count('boss')).toBe(2)
    expect(await count('other')).toBe(0)
    expect(await count('outsider')).toBe(0)
  })

  it('zmazať (do koša) smie len zapisovateľ alebo admin', async () => {
    const [{ id }] = await t.as('tech', `select id from public.attachments where entity_type = 'incident' limit 1`)
    await expect(t.as('other', 'select public.trash_attachment($1)', [id])).rejects.toThrow(/zmazať/)
    await t.as('tech', 'select public.trash_attachment($1)', [id])
    expect((await t.as('boss', `select count(*)::int as n from public.attachments where entity_type = 'incident'`))[0].n).toBe(1)
  })
})
