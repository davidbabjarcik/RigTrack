// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let idea: string

const suggest = (user: string, title: string) =>
  t.as(user, 'insert into public.suggestions (company_id, title) values ($1, $2) returning id, author_name', [companyA, title])
const comment = (user: string, body: string) =>
  t.as(user, 'insert into public.suggestion_comments (company_id, suggestion_id, body) values ($1, $2, $3) returning author_name', [
    companyA,
    idea,
    body,
  ])

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  await t.rows(`update public.profiles set full_name = 'Viktor Viewer' where id = $1`, [t.users.viewer])
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const role of ['skladnik', 'viewer']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [
      companyA,
      t.users[role],
      role,
    ])
  }
})

describe('suggestions', () => {
  it('can be created by any member, with the author stamped by the server', async () => {
    const [row] = await suggest('viewer', 'Kúpme druhý hazer')
    idea = row.id
    expect(row.author_name).toBe('Viktor Viewer')
    await expect(
      t.as('viewer', `insert into public.suggestions (company_id, title, author_name) values ($1, 'x', 'Šéf')`, [companyA]),
    ).rejects.toThrow(/permission denied/)
    await expect(suggest('outsider', 'Cudzí nápad')).rejects.toThrow(/row-level security/)
  })

  it('lets the author edit the text but only admin and skladnik move the status', async () => {
    expect(await t.as('viewer', `update public.suggestions set body = 'Doplnené' where id = $1 returning id`, [idea])).toHaveLength(1)
    await expect(t.as('viewer', `update public.suggestions set status = 'done' where id = $1`, [idea])).rejects.toThrow(
      /iba admin alebo skladník/,
    )
    expect(await t.as('skladnik', `update public.suggestions set status = 'in_progress' where id = $1 returning status`, [idea])).toEqual([
      { status: 'in_progress' },
    ])
  })

  it('collects comments from any member', async () => {
    expect(await comment('admin', 'Súhlasím')).toEqual([{ author_name: 'admin@example.com' }])
    expect(await comment('viewer', 'Ďakujem')).toEqual([{ author_name: 'Viktor Viewer' }])
    await expect(comment('outsider', 'spam')).rejects.toThrow(/row-level security/)
    expect(await t.as('outsider', 'select 1 from public.suggestion_comments')).toEqual([])
  })

  it('can be deleted by its author or an admin, taking its comments along', async () => {
    expect(await t.as('skladnik', 'delete from public.suggestions where id = $1 returning id', [idea])).toEqual([])
    expect(await t.as('viewer', 'delete from public.suggestions where id = $1 returning id', [idea])).toHaveLength(1)
    expect(await t.rows('select 1 from public.suggestion_comments')).toEqual([])
  })
})
