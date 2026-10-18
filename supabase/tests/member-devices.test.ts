// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik', 'technik', 'technik2', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const [name, role] of [['skladnik', 'skladnik'], ['technik', 'technik'], ['technik2', 'technik']]) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [companyA, t.users[name], role])
  }
})

const add = (user: string, mac: string, company = companyA) =>
  t.as(user, `insert into public.member_devices (company_id, kind, name, mac) values ($1, 'phone', 'iPhone', $2) returning id, user_id`, [company, mac])

describe('member devices', () => {
  it('lets every member add their own devices with a valid, unique MAC', async () => {
    const [row] = await add('technik', 'AA:BB:CC:DD:EE:01')
    expect(row.user_id).toBe(t.users.technik)
    await expect(add('technik2', 'AA:BB:CC:DD:EE:01')).rejects.toThrow(/duplicate key/)
    await expect(add('technik2', 'aa-bb-cc-dd-ee-02')).rejects.toThrow(/check constraint/)
    await expect(add('outsider', 'AA:BB:CC:DD:EE:03')).rejects.toThrow(/row-level security/)
    await expect(
      t.as('technik', `insert into public.member_devices (company_id, user_id, name, mac) values ($1, $2, 'Cudzí', 'AA:BB:CC:DD:EE:04')`, [companyA, t.users.technik2]),
    ).rejects.toThrow(/row-level security/)
  })

  it('shows devices to their owner and to managers only', async () => {
    await add('technik2', 'AA:BB:CC:DD:EE:05')
    expect(await t.as('technik', 'select mac from public.member_devices')).toEqual([{ mac: 'AA:BB:CC:DD:EE:01' }])
    expect(await t.as('skladnik', 'select count(*)::int as n from public.member_devices')).toEqual([{ n: 2 }])
    expect(await t.as('admin', 'select count(*)::int as n from public.member_devices')).toEqual([{ n: 2 }])
    expect(await t.as('technik2', `delete from public.member_devices where mac = 'AA:BB:CC:DD:EE:01' returning id`)).toEqual([])
    expect(await t.as('skladnik', `delete from public.member_devices where mac = 'AA:BB:CC:DD:EE:01' returning id`)).toHaveLength(1)
  })
})
