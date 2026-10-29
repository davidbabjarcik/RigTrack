// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'tech', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik')`, [a, t.users.tech])
})

describe('company notes', () => {
  it('are shared in the company, notify tagged people and stay private to it', async () => {
    const id = (await t.as('boss', `insert into public.company_notes (company_id, title, body, people) values ($1, 'Kľúče', 'Kľúče od skladu sú v šuplíku', $2) returning id`, [a, [t.users.tech]]))[0].id
    expect(await t.as('tech', 'select title, author_name from public.company_notes')).toEqual([{ title: 'Kľúče', author_name: 'boss@example.com' }])
    expect(await t.as('tech', `select title, url from public.notifications`)).toEqual([{ title: 'boss@example.com vás označil v poznámke', url: '/notes' }])
    // Zdieľané: upraviť môže aj iný člen, autor ostáva.
    await t.as('tech', `update public.company_notes set body = 'Kľúče sú u Jana' where id = $1`, [id])
    expect(await t.as('boss', 'select body, author_name from public.company_notes')).toEqual([{ body: 'Kľúče sú u Jana', author_name: 'boss@example.com' }])
    // Zmazať môže len autor alebo admin; cudzí nevidí nič a nemôže označiť človeka mimo firmy.
    await t.as('tech', 'delete from public.company_notes where id = $1', [id])
    expect(await t.as('boss', 'select count(*)::int as n from public.company_notes')).toEqual([{ n: 1 }])
    expect(await t.as('outsider', 'select * from public.company_notes')).toEqual([])
    await expect(t.as('boss', `insert into public.company_notes (company_id, title, people) values ($1, 'x', $2)`, [a, [t.users.outsider]])).rejects.toThrow(/row-level security/)
    await t.as('boss', 'delete from public.company_notes where id = $1', [id])
    expect(await t.as('boss', 'select count(*)::int as n from public.company_notes')).toEqual([{ n: 0 }])
  })
})
