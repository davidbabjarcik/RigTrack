// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'helper', 'technik']) await t.signUp(name, `${name}@example.com`)
  company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'helper'), ($1, $3, 'technik')`, [company, t.users.helper, t.users.technik])
})

describe('helper role', () => {
  it('sees only events where it is in the crew', async () => {
    const [mine, other] = (await t.as('admin', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ples', '2026-11-01', '2026-11-01'), ($1, 'Festival', '2026-11-05', '2026-11-06') returning id`, [company])).map((row) => row.id)
    await t.as('admin', `insert into public.event_crew (company_id, event_id, member_id) values ($1, $2, $3)`, [company, mine, t.users.helper])
    expect(await t.as('helper', 'select name from public.events')).toEqual([{ name: 'Ples' }])
    expect(await t.as('technik', 'select count(*)::int as n from public.events')).toEqual([{ n: 2 }])
    expect(other).toBeTruthy()
  })

  it('can only look at equipment and checks cases only when allowed', async () => {
    await t.as('admin', `insert into public.equipment (company_id, name) values ($1, 'Kábel')`, [company])
    expect(await t.as('helper', 'select name from public.equipment')).toEqual([{ name: 'Kábel' }])
    await expect(t.as('helper', `insert into public.equipment (company_id, name) values ($1, 'X')`, [company])).rejects.toThrow(/row-level security/)
    const box = (await t.as('admin', `insert into public.cases (company_id, name) values ($1, 'Case') returning id`, [company]))[0].id
    await expect(t.as('helper', `insert into public.case_checks (company_id, case_id) values ($1, $2)`, [company, box])).rejects.toThrow(/row-level security/)
    await t.as('admin', `insert into public.role_permissions (company_id, role, permission, allowed) values ($1, 'helper', 'cases.check', true)`, [company])
    await t.as('helper', `insert into public.case_checks (company_id, case_id) values ($1, $2)`, [company, box])
    expect(await t.as('helper', 'select count(*)::int as n from public.loans')).toEqual([{ n: 0 }])
  })
})
