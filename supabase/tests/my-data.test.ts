// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'worker', 'other']) await t.signUp(name, `${name}@example.com`)
  company = (await t.as('boss', `select public.create_company('Firma') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik')`, [company, t.users.worker])
})

describe('my data (GDPR)', () => {
  it('exports only my own data', async () => {
    await t.as('worker', `insert into public.member_devices (company_id, kind, name, mac) values ($1, 'phone', 'Môj mobil', '00:11:22:33:44:55')`, [company])
    const [{ data }] = await t.as('worker', 'select public.export_my_data() as data')
    expect(data.account.email).toBe('worker@example.com')
    expect(data.memberships).toEqual([{ company: 'Firma', role: 'technik' }])
    expect(data.devices.map((d: { name: string }) => d.name)).toEqual(['Môj mobil'])
    const [{ data: theirs }] = await t.as('other', 'select public.export_my_data() as data')
    expect(theirs.devices).toEqual([])
  })

  it('deletes my account after e-mail confirmation, but not the last admin of a team', async () => {
    await expect(t.as('worker', `select public.delete_my_account('zly@example.com')`)).rejects.toThrow(/e-mail/)
    await expect(t.as('boss', `select public.delete_my_account('boss@example.com')`)).rejects.toThrow(/jediný admin/)
    await t.as('worker', `select public.delete_my_account('WORKER@example.com')`)
    expect(await t.rows('select id from public.profiles where id = $1', [t.users.worker])).toEqual([])
    expect(await t.rows('select user_id from public.company_members where user_id = $1', [t.users.worker])).toEqual([])
  })
})
