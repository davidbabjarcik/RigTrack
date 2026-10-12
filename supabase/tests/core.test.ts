// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let companyC: string

beforeAll(async () => {
  t = await createTestDb()
  await t.signUp('alice', 'alice@example.com')
  await t.signUp('bob', 'bob@example.com')
  await t.signUp('carol', 'carol@example.com')
  await t.signUp('fakeBob', 'BOB@example.com', false)

  companyA = (await t.as('alice', `select public.create_company('Alice AV') as id`))[0].id
  companyC = (await t.as('carol', `select public.create_company('Carol Stage') as id`))[0].id
})

describe('core schema', () => {
  it('creates a profile for every new auth user', async () => {
    expect(await t.rows('select email from public.profiles order by email')).toHaveLength(4)
  })

  it('makes the creator an admin of the new company', async () => {
    const members = await t.as('alice', 'select user_id, role from public.company_members')
    expect(members).toEqual([{ user_id: t.users.alice, role: 'admin' }])
  })

  it('gives anon no access at all', async () => {
    await expect(t.as(null, 'select * from public.companies')).rejects.toThrow(/permission denied/)
    await expect(t.as(null, `select public.create_company('x')`)).rejects.toThrow(/permission denied/)
  })
})

describe('tenant isolation', () => {
  it('shows each user only their own company, members and co-member profiles', async () => {
    expect(await t.as('alice', 'select id from public.companies')).toEqual([{ id: companyA }])
    expect(await t.as('alice', 'select company_id from public.company_members')).toEqual([{ company_id: companyA }])
    expect(await t.as('alice', 'select id from public.profiles')).toEqual([{ id: t.users.alice }])
  })

  it('does not let an admin touch another company', async () => {
    expect(await t.as('alice', `update public.companies set name = 'hacked' where id = $1 returning id`, [companyC])).toEqual([])
    expect(
      await t.as('alice', 'delete from public.company_members where company_id = $1 returning user_id', [companyC]),
    ).toEqual([])
    await expect(
      t.as('alice', `insert into public.company_invitations (company_id, email) values ($1, 'x@example.com')`, [companyC]),
    ).rejects.toThrow(/row-level security/)
  })

  it('forbids creating memberships directly', async () => {
    await expect(
      t.as('alice', `insert into public.company_members (company_id, user_id, role) values ($1, $2, 'admin')`, [
        companyC,
        t.users.alice,
      ]),
    ).rejects.toThrow(/permission denied/)
  })
})

describe('invitations', () => {
  let invitation: string

  it('lets an admin invite by e-mail', async () => {
    const [row] = await t.as(
      'alice',
      `insert into public.company_invitations (company_id, email, role) values ($1, 'bob@example.com', 'technik') returning id`,
      [companyA],
    )
    invitation = row.id
    expect(invitation).toBeTruthy()
  })

  it('shows the invitation and company name only to the invited, confirmed address', async () => {
    const forBob = await t.as(
      'bob',
      'select c.name from public.company_invitations i join public.companies c on c.id = i.company_id',
    )
    expect(forBob).toEqual([{ name: 'Alice AV' }])
    expect(await t.as('carol', 'select id from public.company_invitations')).toEqual([])
    expect(await t.as('fakeBob', 'select id from public.company_invitations')).toEqual([])
  })

  it('rejects acceptance by anyone else, including an unconfirmed same-address account', async () => {
    for (const name of ['carol', 'fakeBob']) {
      await expect(t.as(name, 'select public.accept_invitation($1)', [invitation])).rejects.toThrow(/Pozvánka neexistuje/)
    }
  })

  it('turns an accepted invitation into a membership with the invited role', async () => {
    await t.as('bob', 'select public.accept_invitation($1)', [invitation])
    const members = await t.as('bob', 'select role from public.company_members where user_id = $1 and company_id = $2', [
      t.users.bob,
      companyA,
    ])
    expect(members).toEqual([{ role: 'technik' }])
    expect(await t.rows('select id from public.company_invitations')).toEqual([])
  })
})

describe('roles', () => {
  it('lets members see each other after joining', async () => {
    const profiles = await t.as('bob', 'select email from public.profiles order by email')
    expect(profiles.map((p) => p.email)).toEqual(['alice@example.com', 'bob@example.com'])
  })

  it('does not let a non-admin change roles, rename the company or invite', async () => {
    expect(
      await t.as('bob', `update public.company_members set role = 'admin' where user_id = $1 returning role`, [t.users.bob]),
    ).toEqual([])
    expect(await t.as('bob', `update public.companies set name = 'Bob AV' returning id`)).toEqual([])
    await expect(
      t.as('bob', `insert into public.company_invitations (company_id, email) values ($1, 'x@example.com')`, [companyA]),
    ).rejects.toThrow(/row-level security/)
  })

  it('limits admin updates to the role column', async () => {
    await expect(
      t.as('alice', 'update public.company_members set user_id = $1 where user_id = $2', [t.users.carol, t.users.bob]),
    ).rejects.toThrow(/permission denied/)
  })

  it('keeps at least one admin in a company', async () => {
    await expect(
      t.as('alice', `update public.company_members set role = 'viewer' where user_id = $1`, [t.users.alice]),
    ).rejects.toThrow(/aspoň jedného admina/)
    await expect(t.as('alice', 'delete from public.company_members where user_id = $1', [t.users.alice])).rejects.toThrow(
      /aspoň jedného admina/,
    )
  })

  it('lets an admin change roles and a member leave', async () => {
    const changed = await t.as(
      'alice',
      `update public.company_members set role = 'skladnik' where user_id = $1 returning role`,
      [t.users.bob],
    )
    expect(changed).toEqual([{ role: 'skladnik' }])
    const left = await t.as('bob', 'delete from public.company_members where user_id = $1 returning user_id', [t.users.bob])
    expect(left).toHaveLength(1)
  })
})
