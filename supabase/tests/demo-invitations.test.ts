// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>

beforeAll(async () => {
  t = await createTestDb()
  await t.signUp('dev', 'dev@example.com')
  await t.signUp('boss', 'boss@example.com')
  await t.rows('insert into public.app_developers (user_id) values ($1)', [t.users.dev])
})

describe('demo-only invitations', () => {
  it('only a developer invites, and the e-mail may then sign up', async () => {
    const check = async (email: string) => (await t.rows('select public.hook_require_invitation($1::jsonb) as r', [JSON.stringify({ user: { email } })]))[0].r
    expect((await check('skusobny@example.com')).error.http_code).toBe(403)
    await expect(t.as('boss', `insert into public.demo_invitations (email) values ('skusobny@example.com')`)).rejects.toThrow(/row-level security/)
    await t.as('dev', `insert into public.demo_invitations (email, note) values ('skusobny@example.com', 'test')`)
    expect(await check('Skusobny@Example.com')).toEqual({})
    expect(await t.as('boss', 'select email from public.demo_invitations')).toEqual([])
    expect(await t.as('dev', 'select email from public.demo_invitations')).toEqual([{ email: 'skusobny@example.com' }])
    expect(await t.as('dev', 'select registered, demo_created_at from public.demo_invitation_status()')).toEqual([{ registered: false, demo_created_at: null }])
  })

  it('the invited person has no company but can open a demo', async () => {
    await t.signUp('guest', 'skusobny@example.com')
    expect(await t.as('guest', 'select company_id from public.company_members')).toEqual([])
    const demo = (await t.as('guest', 'select public.create_demo_company() as id'))[0].id
    expect(await t.as('guest', 'select company_id from public.company_members')).toEqual([{ company_id: demo }])
    const [row] = await t.as('dev', 'select email, registered, demo_created_at is not null as demo from public.demo_invitation_status()')
    expect(row).toEqual({ email: 'skusobny@example.com', registered: true, demo: true })
    expect(await t.as('boss', 'select * from public.demo_invitation_status()')).toEqual([])
  })
})
