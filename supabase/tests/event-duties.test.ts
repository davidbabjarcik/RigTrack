// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string
let event: string
let loading: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'crew', 'viewer']) await t.signUp(name, `${name}@example.com`)
  company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer'), ($1, $3, 'viewer')`, [company, t.users.crew, t.users.viewer])
  event = (await t.as('admin', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ples', '2026-11-01', '2026-11-01') returning id`, [company]))[0].id
  await t.as('admin', `insert into public.event_crew (company_id, event_id, member_id) values ($1, $2, $3)`, [company, event, t.users.crew])
})

describe('event duties', () => {
  it('lets admins define duty types; members only read them', async () => {
    loading = (await t.as('admin', `insert into public.company_duty_types (company_id, name) values ($1, 'Nakladanie') returning id`, [company]))[0].id
    await expect(t.as('admin', `insert into public.company_duty_types (company_id, name) values ($1, ' nakladanie ')`, [company])).rejects.toThrow(/duplicate key/)
    await expect(t.as('viewer', `insert into public.company_duty_types (company_id, name) values ($1, 'Iné')`, [company])).rejects.toThrow(/row-level security/)
    expect(await t.as('viewer', 'select name from public.company_duty_types')).toEqual([{ name: 'Nakladanie' }])
  })

  it('records people on duties: editors anyone, crew only themselves', async () => {
    await t.as('admin', `insert into public.event_duties (company_id, event_id, duty_type_id, person_name) values ($1, $2, $3, 'Brigádnik Peter')`, [company, event, loading])
    await t.as('crew', `insert into public.event_duties (company_id, event_id, duty_type_id, member_id) values ($1, $2, $3, $4)`, [company, event, loading, t.users.crew])
    await expect(t.as('crew', `insert into public.event_duties (company_id, event_id, duty_type_id, member_id) values ($1, $2, $3, $4)`, [company, event, loading, t.users.crew])).rejects.toThrow(/duplicate key/)
    await expect(t.as('crew', `insert into public.event_duties (company_id, event_id, duty_type_id, member_id) values ($1, $2, $3, $4)`, [company, event, loading, t.users.viewer])).rejects.toThrow(/row-level security/)
    await expect(t.as('viewer', `insert into public.event_duties (company_id, event_id, duty_type_id, member_id) values ($1, $2, $3, $4)`, [company, event, loading, t.users.viewer])).rejects.toThrow(/row-level security/)
    expect(await t.as('viewer', 'select count(*)::int as n from public.event_duties')).toEqual([{ n: 2 }])
  })
})
