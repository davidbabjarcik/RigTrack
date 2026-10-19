// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'technik']) await t.signUp(name, `${name}@example.com`)
  company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik')`, [company, t.users.technik])
})

describe('check levels', () => {
  it('are set by an admin and read by members', async () => {
    await t.as('admin', `insert into public.company_check_levels (company_id, low_days, normal_days, high_days) values ($1, 365, 90, 30)`, [company])
    expect(await t.as('technik', 'select high_days from public.company_check_levels')).toEqual([{ high_days: 30 }])
    expect(await t.as('technik', `update public.company_check_levels set high_days = 1 where company_id = $1 returning high_days`, [company])).toEqual([])
  })

  it('allow cases without checks', async () => {
    const box = (await t.as('admin', `insert into public.cases (company_id, name, check_priority) values ($1, 'Káble', 'none') returning check_priority`, [company]))[0]
    expect(box.check_priority).toBe('none')
  })
  it('assigns post-event tasks to the template assignees', async () => {
    await t.as('admin', `insert into public.task_templates (company_id, title, category, assignee_ids) values ($1, 'Fotky na soc. siete', 'soc. siete', $2)`, [company, [t.users.technik]])
    await t.as('admin', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ples', current_date - 3, current_date - 2)`, [company])
    await t.as('technik', 'select public.create_post_event_tasks($1)', [company])
    expect(await t.as('technik', 'select assignee_ids, assignee_id from public.tasks')).toEqual([{ assignee_ids: [t.users.technik], assignee_id: t.users.technik }])
  })
})
