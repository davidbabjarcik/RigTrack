// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let caseA: string

const check = (user: string, note = '') =>
  t.as(user, 'insert into public.case_checks (company_id, case_id, note) values ($1, $2, $3) returning checked_by_name', [
    companyA,
    caseA,
    note,
  ])

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'technik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  await t.rows(`update public.profiles set full_name = 'Tomáš Technik' where id = $1`, [t.users.technik])
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const role of ['technik', 'viewer']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [
      companyA,
      t.users[role],
      role,
    ])
  }
  caseA = (await t.as('admin', `insert into public.cases (company_id, name) values ($1, 'Case') returning id`, [companyA]))[0].id
})

describe('case checks', () => {
  it('stamps the checker name from the profile, falling back to e-mail', async () => {
    expect(await check('technik')).toEqual([{ checked_by_name: 'Tomáš Technik' }])
    expect(await check('admin', 'chýba 1 kábel')).toEqual([{ checked_by_name: 'admin@example.com' }])
  })

  it('does not let the client choose who or when', async () => {
    await expect(
      t.as(
        'technik',
        `insert into public.case_checks (company_id, case_id, checked_by_name, checked_at) values ($1, $2, 'Šéf', '2020-01-01')`,
        [companyA, caseA],
      ),
    ).rejects.toThrow(/permission denied/)
  })

  it('reports the latest check per case', async () => {
    const last = await t.as('viewer', 'select checked_by_name, note from public.case_last_checks where case_id = $1', [caseA])
    expect(last).toEqual([{ checked_by_name: 'admin@example.com', note: 'chýba 1 kábel' }])
  })

  it('lets a viewer read but not check, and hides everything from other companies', async () => {
    await expect(check('viewer')).rejects.toThrow(/row-level security/)
    await expect(check('outsider')).rejects.toThrow(/row-level security/)
    expect(await t.as('outsider', 'select 1 from public.case_checks')).toEqual([])
    expect(await t.as('outsider', 'select 1 from public.case_last_checks')).toEqual([])
    await expect(t.as(null, 'select 1 from public.case_last_checks')).rejects.toThrow(/permission denied/)
  })

  it('keeps the history immutable', async () => {
    await expect(t.as('admin', `update public.case_checks set note = 'x'`)).rejects.toThrow(/permission denied/)
    await expect(t.as('admin', 'delete from public.case_checks')).rejects.toThrow(/permission denied/)
  })
})
