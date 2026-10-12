// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string

const addTask = (user: string, title: string, assignee: string | null = null) =>
  t.as(user, 'insert into public.tasks (company_id, title, assignee_id) values ($1, $2, $3) returning id', [companyA, title, assignee])
const addItem = (user: string, name: string, extra: Record<string, unknown> = {}) => {
  const columns = ['company_id', 'name', ...Object.keys(extra)]
  const values = [companyA, name, ...Object.values(extra)]
  return t.as(
    user,
    `insert into public.shopping_items (${columns.join(', ')}) values (${values.map((_, i) => `$${i + 1}`).join(', ')}) returning id`,
    values,
  )
}

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'technik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const role of ['technik', 'viewer']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [
      companyA,
      t.users[role],
      role,
    ])
  }
})

describe('tasks', () => {
  it('can be assigned to a member of the company only', async () => {
    expect(await addTask('technik', 'Inventúra skladu', t.users.viewer)).toHaveLength(1)
    await expect(addTask('technik', 'Cudzia úloha', t.users.outsider)).rejects.toThrow(/row-level security/)
    const [task] = await addTask('admin', 'Bez osoby')
    await expect(
      t.as('admin', 'update public.tasks set assignee_id = $1 where id = $2', [t.users.outsider, task.id]),
    ).rejects.toThrow(/row-level security/)
  })

  it('is read-only for viewers and hidden from other companies', async () => {
    await expect(addTask('viewer', 'x')).rejects.toThrow(/row-level security/)
    expect(await t.as('viewer', `update public.tasks set status = 'done' returning id`)).toEqual([])
    expect(await t.as('viewer', 'select count(*)::int as n from public.tasks')).toEqual([{ n: 2 }])
    expect(await t.as('outsider', 'select 1 from public.tasks')).toEqual([])
    await expect(t.as(null, 'select 1 from public.tasks')).rejects.toThrow(/permission denied/)
  })

  it('lets a technik delete only tasks they created', async () => {
    const [own] = await addTask('technik', 'Moja')
    const [foreign] = await addTask('admin', 'Adminova')
    expect(await t.as('technik', 'delete from public.tasks where id = $1 returning id', [foreign.id])).toEqual([])
    expect(await t.as('technik', 'delete from public.tasks where id = $1 returning id', [own.id])).toHaveLength(1)
    expect(await t.as('admin', 'delete from public.tasks where id = $1 returning id', [foreign.id])).toHaveLength(1)
  })

  it('rejects unknown priorities and statuses', async () => {
    await expect(t.as('admin', `update public.tasks set priority = 'urgent'`)).rejects.toThrow(/check constraint/)
    await expect(t.as('admin', `update public.tasks set status = 'maybe'`)).rejects.toThrow(/check constraint/)
  })
})

describe('shopping items', () => {
  it('start on the want list and can move to the buy list', async () => {
    const [item] = await addItem('technik', 'Moving head', { unit_price: 1200 })
    expect(await t.as('viewer', 'select list, status from public.shopping_items where id = $1', [item.id])).toEqual([
      { list: 'want', status: 'planned' },
    ])
    expect(
      await t.as('technik', `update public.shopping_items set list = 'buy', status = 'ordered' where id = $1 returning list`, [item.id]),
    ).toEqual([{ list: 'buy' }])
  })

  it('accept only web links', async () => {
    await addItem('admin', 'S odkazom', { url: 'https://www.thomann.de/intl/search_dir.html?sw=1' })
    await expect(addItem('admin', 'Zlý odkaz', { url: 'javascript:alert(1)' })).rejects.toThrow(/check constraint/)
  })

  it('are closed to viewers and other companies', async () => {
    await expect(addItem('viewer', 'x')).rejects.toThrow(/row-level security/)
    await expect(addItem('outsider', 'x')).rejects.toThrow(/row-level security/)
    expect(await t.as('outsider', 'select 1 from public.shopping_items')).toEqual([])
  })
})
