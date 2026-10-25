// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let led: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'jano', 'fero']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik'), ($1, $3, 'viewer')`, [a, t.users.jano, t.users.fero])
  led = (await t.as('boss', `insert into public.cases (company_id, name) values ($1, 'Case LED') returning id`, [a]))[0].id
  const par = (await t.as('boss', `insert into public.equipment (company_id, name, kind, quantity, attributes, case_id) values ($1, 'LED Par', 'light', 16, '{"trackHours": true}', $2) returning id`, [a, led]))[0].id
  await t.as('boss', `insert into public.equipment (company_id, name, kind, quantity, attributes) values ($1, 'Beam', 'light', 2, '{"trackHours": true}')`, [a])
  await t.as('boss', `insert into public.equipment (company_id, name, kind, quantity) values ($1, 'Mix', 'audio', 1)`, [a])
  await t.as('boss', `insert into public.equipment_hour_readings (company_id, equipment_id, read_on, hours) values ($1, $2, current_date - 3, 120)`, [a, par])
})

describe('responsibilities', () => {
  it('only admin writes; members read', async () => {
    await expect(t.as('jano', `insert into public.responsibilities (company_id, name) values ($1, 'X')`, [a])).rejects.toThrow()
    await t.as('boss', `insert into public.responsibilities (company_id, name, kinds, member_ids, hours_every_days, check_every_days) values ($1, 'Svetlá', '{light}', $2, 30, 14)`, [a, [t.users.jano]])
    expect(await t.as('fero', 'select name from public.responsibilities')).toEqual([{ name: 'Svetlá' }])
  })

  it('shows due hour readings and case checks to the responsible person only', async () => {
    const mine = await t.as('jano', 'select task, due_count, items from public.my_responsibility_tasks($1) order by task', [a])
    expect(mine).toEqual([
      { task: 'check', due_count: 1, items: ['Case LED'] },
      { task: 'hours', due_count: 1, items: ['Beam'] },
    ])
    expect(await t.as('fero', 'select * from public.my_responsibility_tasks($1)', [a])).toEqual([])
  })

  it('sends a reminder notification once a week', async () => {
    expect((await t.rows('select public.remind_responsibilities() as n'))[0].n).toBe(2)
    expect((await t.rows('select public.remind_responsibilities() as n'))[0].n).toBe(0)
    expect(await t.rows(`select title from public.notifications where user_id = $1 order by title`, [t.users.jano])).toEqual([
      { title: 'Odčítať prevádzkové hodiny: Svetlá' },
      { title: 'Skontrolovať case: Svetlá' },
    ])
  })
})
