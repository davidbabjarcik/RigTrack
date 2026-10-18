// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let companyB: string
let report: string

const send = (user: string, company: string | null, title = 'Nejde uložiť event') =>
  t.as(user, `insert into public.bug_reports (company_id, title, description, reporter_name, status) values ($1, $2, 'Klikol som Uložiť', 'Podvrh', 'resolved') returning id`, [company, title])

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'technik', 'technik2', 'dev', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  companyB = (await t.as('outsider', `select public.create_company('B') as id`))[0].id
  for (const name of ['technik', 'technik2']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [companyA, t.users[name], 'technik'])
  }
  await t.rows('insert into public.app_developers (user_id) values ($1)', [t.users.dev])
})

describe('bug reports', () => {
  it('stamp the reporter and start as new, whatever the client sends', async () => {
    report = (await send('technik', companyA))[0].id
    expect(await t.as('technik', 'select reporter_name, status from public.bug_reports where id = $1', [report])).toEqual([
      { reporter_name: 'technik@example.com', status: 'new' },
    ])
    await expect(send('technik', companyB)).rejects.toThrow(/row-level security/)
  })

  it('are seen by the reporter, the company admin and developers only', async () => {
    expect(await t.as('admin', 'select id from public.bug_reports')).toEqual([{ id: report }])
    expect(await t.as('dev', 'select id from public.bug_reports')).toEqual([{ id: report }])
    expect(await t.as('technik2', 'select id from public.bug_reports')).toEqual([])
    expect(await t.as('outsider', 'select id from public.bug_reports')).toEqual([])
    expect(await t.as('dev', 'select public.is_developer() as dev')).toEqual([{ dev: true }])
    expect(await t.as('admin', 'select public.is_developer() as dev')).toEqual([{ dev: false }])
  })

  it('get a status and answer from the admin or a developer, not from the reporter', async () => {
    expect(await t.as('technik', `update public.bug_reports set status = 'resolved' where id = $1 returning id`, [report])).toEqual([])
    await t.as('admin', `update public.bug_reports set status = 'in_progress' where id = $1`, [report])
    await t.as('dev', `update public.bug_reports set status = 'resolved', response = 'Opravené vo verzii 1.10' where id = $1`, [report])
    expect(await t.as('technik', 'select status, response from public.bug_reports where id = $1', [report])).toEqual([
      { status: 'resolved', response: 'Opravené vo verzii 1.10' },
    ])
    await expect(t.as('dev', `update public.bug_reports set title = 'x' where id = $1`, [report])).rejects.toThrow(/permission denied/)
    expect(await t.as('admin', 'delete from public.bug_reports where id = $1 returning id', [report])).toEqual([])
  })

  it('keep the developer list out of reach of the app', async () => {
    await expect(t.as('admin', 'select 1 from public.app_developers')).rejects.toThrow(/permission denied/)
    await expect(t.as('admin', 'insert into public.app_developers (user_id) values ($1)', [t.users.admin])).rejects.toThrow(/permission denied/)
  })
})
