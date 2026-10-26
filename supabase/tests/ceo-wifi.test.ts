// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'ceo', 'technik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const [name, role] of [['ceo', 'ceo'], ['technik', 'technik'], ['viewer', 'viewer']]) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [company, t.users[name], role])
  }
})

describe('CEO role', () => {
  it('has the same rights as an admin', async () => {
    expect(await t.as('ceo', `select public.can($1, 'payouts.manage') as ok`, [company])).toEqual([{ ok: true }])
    expect(await t.as('ceo', `select public.has_role($1, 'admin') as ok`, [company])).toEqual([{ ok: true }])
    expect(await t.as('technik', `select public.has_role($1, 'admin') as ok`, [company])).toEqual([{ ok: true }].map(() => ({ ok: false })))
    expect((await t.as('ceo', 'select * from public.company_account_status($1)', [company])).length).toBe(4)
    await t.as('ceo', `insert into public.company_invitations (company_id, email, role) values ($1, 'novy@example.com', 'technik')`, [company])
  })

  it('does not replace the last admin', async () => {
    await expect(t.as('ceo', `update public.company_members set role = 'technik' where user_id = $1`, [t.users.admin])).rejects.toThrow(/aspoň jedného admina/)
  })
})

describe('wifi networks', () => {
  it('are visible to members, editable by equipment editors, linked to equipment', async () => {
    const mixer = (await t.as('technik', `insert into public.equipment (company_id, name) values ($1, 'DiGiCo SD9') returning id`, [company]))[0].id
    await t.as('technik', `insert into public.wifi_networks (company_id, ssid, password, subnet, router_ip, equipment_id) values ($1, 'SD9-Router', 'tajne123', '192.168.1.0/24', '192.168.1.1', $2)`, [company, mixer])
    // Heslo sa od 0103 číta len cez wifi_passwords() (oprávnenie networks.passwords – viewer ho má predvolene).
    expect(await t.as('viewer', 'select ssid from public.wifi_networks')).toEqual([{ ssid: 'SD9-Router' }])
    expect(await t.as('viewer', 'select password from public.wifi_passwords($1)', [company])).toEqual([{ password: 'tajne123' }])
    await expect(t.as('viewer', `insert into public.wifi_networks (company_id, ssid) values ($1, 'X')`, [company])).rejects.toThrow(/row-level security/)
    await expect(t.as('technik', `insert into public.wifi_networks (company_id, ssid, security) values ($1, 'X', 'WPA9')`, [company])).rejects.toThrow(/check constraint/)
    expect(await t.as('outsider', 'select 1 from public.wifi_networks')).toEqual([])
    const network = (await t.as('viewer', 'select id from public.wifi_networks'))[0].id
    await t.as('technik', `insert into public.wifi_router_logins (network_id, company_id, username, password) values ($1, $2, 'admin', 'router-heslo')`, [network, company])
    expect(await t.as('technik', 'select username, password from public.wifi_router_logins')).toEqual([{ username: 'admin', password: 'router-heslo' }])
    expect(await t.as('viewer', 'select 1 from public.wifi_router_logins')).toEqual([])
    await t.as('admin', 'delete from public.equipment where id = $1', [mixer])
    expect(await t.as('viewer', 'select equipment_id from public.wifi_networks')).toEqual([{ equipment_id: null }])
  })
})

describe('invite-only sign-up hook', () => {
  it('lets only invited e-mails create an account', async () => {
    const check = async (email: string) => (await t.rows('select public.hook_require_invitation($1::jsonb) as r', [JSON.stringify({ user: { email } })]))[0].r
    expect(await check('Novy@Example.com')).toEqual({})
    expect((await check('cudzi@example.com')).error.http_code).toBe(403)
    await expect(t.as('technik', `select public.hook_require_invitation('{}'::jsonb)`)).rejects.toThrow(/permission denied/)
  })
})
