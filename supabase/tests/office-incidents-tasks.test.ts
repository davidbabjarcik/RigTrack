// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'technik', 'technik2', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const [name, role] of [['technik', 'technik'], ['technik2', 'technik'], ['viewer', 'viewer']]) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [company, t.users[name], role])
  }
})

describe('tasks', () => {
  it('have several assignees and a category; strangers cannot be assigned', async () => {
    const task = (await t.as('technik', `insert into public.tasks (company_id, title, category, assignee_ids) values ($1, 'Fotky na web', 'web', $2) returning id, assignee_id, done_at`, [company, [t.users.technik, t.users.technik2]]))[0]
    expect(task.assignee_id).toBe(t.users.technik)
    await expect(t.as('technik', `insert into public.tasks (company_id, title, assignee_ids) values ($1, 'x', $2)`, [company, [t.users.outsider]])).rejects.toThrow(/row-level security/)
    const done = await t.as('technik2', `update public.tasks set status = 'done' where id = $1 returning done_at`, [task.id])
    expect(done[0].done_at).not.toBeNull()
  })

  it('creates post-event tasks from templates once', async () => {
    await t.as('admin', `insert into public.task_templates (company_id, title, category, days_after) values ($1, 'Vyúčtovanie', 'admin', 2), ($1, 'Fotky na soc. siete', 'soc. siete', 1)`, [company])
    await t.as('admin', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ples', current_date - 5, current_date - 4), ($1, 'Budúci', current_date + 5, current_date + 6)`, [company])
    expect(await t.as('viewer', 'select public.create_post_event_tasks($1) as n', [company])).toEqual([{ n: 2 }])
    expect(await t.as('viewer', 'select public.create_post_event_tasks($1) as n', [company])).toEqual([{ n: 0 }])
    const rows = await t.as('viewer', `select title, due_on = current_date - 2 as due from public.tasks where event_id is not null order by title`)
    expect(rows).toEqual([{ title: 'Fotky na soc. siete: Ples', due: false }, { title: 'Vyúčtovanie: Ples', due: true }])
    await expect(t.as('outsider', 'select public.create_post_event_tasks($1)', [company])).rejects.toThrow(/členom/)
  })
})

describe('office supplies', () => {
  it('records who bought what and keeps stock', async () => {
    const coffee = (await t.as('viewer', `insert into public.office_items (company_id, name, unit, min_quantity) values ($1, 'Káva', 'bal', 2) returning id`, [company]))[0].id
    await t.as('technik', `insert into public.office_purchases (company_id, item_id, quantity, price, pack_amount, pack_unit) values ($1, $2, 3, 12.5, 1, 'kg')`, [company, coffee])
    const mine = (await t.as('viewer', `insert into public.office_purchases (company_id, item_id, quantity, price) values ($1, $2, 1, 4) returning id, bought_by_name`, [company, coffee]))[0]
    expect(mine.bought_by_name).toBe('viewer@example.com')
    expect(await t.as('admin', `select quantity::float as q from public.office_items where id = $1`, [coffee])).toEqual([{ q: 4 }])
    expect(await t.as('technik', 'delete from public.office_purchases where id = $1 returning id', [mine.id])).toEqual([])
    await t.as('viewer', 'delete from public.office_purchases where id = $1', [mine.id])
    expect(await t.as('admin', `select quantity::float as q from public.office_items where id = $1`, [coffee])).toEqual([{ q: 3 }])
    expect(await t.as('outsider', 'select 1 from public.office_purchases')).toEqual([])
  })
})

describe('incidents', () => {
  it('shows injuries only to admin, the person and the author', async () => {
    await t.as('technik', `insert into public.incidents (company_id, kind, member_id, title, severity) values ($1, 'injury', $2, 'Porezaný prst', 'minor')`, [company, t.users.technik2])
    await t.as('technik', `insert into public.incidents (company_id, kind, title, cost, paid_by) values ($1, 'damage', 'Rozbitý reflektor', 350, 'company')`, [company])
    expect(await t.as('admin', 'select count(*)::int as n from public.incidents')).toEqual([{ n: 2 }])
    expect(await t.as('technik2', 'select title from public.incidents')).toEqual([{ title: 'Porezaný prst' }])
    expect(await t.as('viewer', 'select title from public.incidents')).toEqual([])
    await expect(t.as('viewer', `insert into public.incidents (company_id, kind, title, created_by) values ($1, 'damage', 'x', $2)`, [company, t.users.technik])).rejects.toThrow(/row-level security/)
  })
})

describe('profile and staff card', () => {
  it('keep the name in sync and store social links', async () => {
    await t.as('technik', `update public.profiles set full_name = 'Jano Technik' where id = auth.uid()`)
    expect(await t.as('admin', `select name from public.staff where member_id = $1`, [t.users.technik])).toEqual([{ name: 'Jano Technik' }])
    await t.as('technik', `update public.staff set name = 'Ján Technik', socials = '{"instagram": "jano"}' where member_id = auth.uid()`)
    expect(await t.as('admin', `select full_name from public.profiles where id = $1`, [t.users.technik])).toEqual([{ full_name: 'Ján Technik' }])
  })
  it('copies personal data to the card in a new company', async () => {
    await t.as('technik', `update public.staff set phone = '+421 900 111', birth_date = '1995-04-02', licences = '{B,C}' where member_id = auth.uid()`)
    const other = (await t.as('technik', `select public.create_company('Nová firma') as id`))[0].id
    expect(await t.as('technik', `select phone, birth_date::text as b, licences from public.staff where company_id = $1 and member_id = auth.uid()`, [other])).toEqual([
      { phone: '+421 900 111', b: '1995-04-02', licences: ['B', 'C'] },
    ])
  })
})
