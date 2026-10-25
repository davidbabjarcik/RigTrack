// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['dev', 'jano', 'fero']) await t.signUp(name, `${name}@example.com`)
})

describe('company creation approval', () => {
  it('lets anyone create a company while no developer is set', async () => {
    expect((await t.as('jano', 'select public.can_create_company() as ok'))[0].ok).toBe(true)
    await t.as('jano', `select public.create_company('Prvá')`)
  })

  it('requires a developer approval once a developer exists', async () => {
    await t.rows('insert into public.app_developers (user_id) values ($1)', [t.users.dev])
    await expect(t.as('fero', `select public.create_company('Fero s.r.o.')`)).rejects.toThrow(/povoliť/)
    const request = (await t.as('fero', `insert into public.company_requests (company_name, note) values ('Fero s.r.o.', 'zvukár') returning id`))[0].id
    expect(await t.as('dev', 'select company_name, email from public.pending_company_requests()')).toEqual([{ company_name: 'Fero s.r.o.', email: 'fero@example.com' }])
    expect(await t.as('jano', 'select * from public.pending_company_requests()')).toEqual([])
    await expect(t.as('jano', 'select public.decide_company_request($1, true)', [request])).rejects.toThrow(/vývojár/)
    await t.as('dev', 'select public.decide_company_request($1, true)', [request])
    await t.as('fero', `select public.create_company('Fero s.r.o.')`)
    expect(await t.rows('select title from public.notifications where user_id = $1', [t.users.fero])).toEqual([{ title: 'Môžete založiť firmu' }])
    expect((await t.rows('select count(*)::int as n from public.notifications where user_id = $1', [t.users.dev]))[0].n).toBe(1)
  })
})
