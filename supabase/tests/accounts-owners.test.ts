// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string
let other: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik', 'technik', 'invited', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  other = (await t.as('outsider', `select public.create_company('B') as id`))[0].id
  for (const [name, role] of [['skladnik', 'skladnik'], ['technik', 'technik']]) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [company, t.users[name], role])
  }
  await t.rows(`update auth.users set last_sign_in_at = '2026-10-18T08:00:00Z' where id = $1`, [t.users.technik])
  await t.as('admin', `insert into public.company_invitations (company_id, email, role) values ($1, 'invited@example.com', 'technik'), ($1, 'nobody@example.com', 'viewer')`, [company])
})

describe('account status', () => {
  it('shows the admin who has an account and who signed in', async () => {
    const rows = await t.as('admin', 'select email, is_member, has_account, last_sign_in_at is not null as signed_in from public.company_account_status($1) order by email', [company])
    expect(rows).toEqual([
      { email: 'admin@example.com', is_member: true, has_account: true, signed_in: false },
      { email: 'invited@example.com', is_member: false, has_account: true, signed_in: false },
      { email: 'nobody@example.com', is_member: false, has_account: false, signed_in: false },
      { email: 'skladnik@example.com', is_member: true, has_account: true, signed_in: false },
      { email: 'technik@example.com', is_member: true, has_account: true, signed_in: true },
    ])
    await expect(t.as('skladnik', 'select * from public.company_account_status($1)', [company])).rejects.toThrow(/Only an admin/)
  })
})

describe('devices for other members', () => {
  it('lets a team manager add a device for a member, but not for strangers', async () => {
    const add = (user: string, owner: string, mac: string) =>
      t.as(user, `insert into public.member_devices (company_id, user_id, name, mac) values ($1, $2, 'Telefón', $3) returning id`, [company, t.users[owner], mac])
    expect(await add('skladnik', 'technik', 'AA:BB:CC:00:00:01')).toHaveLength(1)
    await expect(add('technik', 'skladnik', 'AA:BB:CC:00:00:02')).rejects.toThrow(/row-level security/)
    await expect(add('skladnik', 'outsider', 'AA:BB:CC:00:00:03')).rejects.toThrow(/row-level security/)
    expect(await t.as('technik', 'select mac from public.member_devices')).toEqual([{ mac: 'AA:BB:CC:00:00:01' }])
  })
})

describe('equipment owned by a team member', () => {
  it('links equipment to a staff card of the same company and falls back to the company on delete', async () => {
    const card = (await t.as('skladnik', `insert into public.staff (company_id, name) values ($1, 'Jano Brigádnik') returning id`, [company]))[0].id
    const mic = (await t.as('technik', `insert into public.equipment (company_id, name, owner_staff_id) values ($1, 'Vlastný SM58', $2) returning id`, [company, card]))[0].id
    expect(await t.as('admin', 'select owner_staff_id from public.equipment where id = $1', [mic])).toEqual([{ owner_staff_id: card }])
    await expect(t.as('outsider', `insert into public.equipment (company_id, name, owner_staff_id) values ($1, 'Cudzí', $2)`, [other, card])).rejects.toThrow(/foreign key/)
    await t.as('skladnik', 'delete from public.staff where id = $1', [card])
    expect(await t.as('admin', 'select owner_staff_id, name from public.equipment where id = $1', [mic])).toEqual([{ owner_staff_id: null, name: 'Vlastný SM58' }])
  })
})

describe('staff cards for members', () => {
  it('are created automatically when someone joins the company', async () => {
    const cards = await t.rows('select count(*)::int as n from public.staff where company_id = $1 and member_id = $2', [company, t.users.technik])
    expect(cards).toEqual([{ n: 1 }])
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [company, t.users.invited, 'viewer'])
    expect(await t.rows('select count(*)::int as n from public.staff where company_id = $1 and member_id = $2', [company, t.users.invited])).toEqual([{ n: 1 }])
  })
})
