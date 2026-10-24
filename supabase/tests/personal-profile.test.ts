// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let b: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['jano', 'boss', 'other']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  b = (await t.as('boss', `select public.create_company('B') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik')`, [a, t.users.jano])
})

describe('personal profile', () => {
  it('is private and fills the staff cards in every company', async () => {
    await t.as(
      'jano',
      `insert into public.personal_profiles (phone, email, birth_date, name_day, licences, home_address, home_lat, home_lon)
       values ('+421 900 111 222', 'jano@firma.sk', '1995-04-12', '06-24', '{B,C}', 'Hlavná 1', 49.2, 21.65)`,
    )
    expect(await t.as('other', 'select 1 from public.personal_profiles')).toEqual([])
    expect(await t.as('boss', `select phone, name_day, licences from public.staff where member_id = $1`, [t.users.jano])).toEqual([
      { phone: '+421 900 111 222', name_day: '06-24', licences: ['B', 'C'] },
    ])
    expect(await t.as('boss', `select address from public.member_homes where user_id = $1`, [t.users.jano])).toEqual([{ address: 'Hlavná 1' }])
  })

  it('copies the profile into a new company and its new card', async () => {
    await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [b, t.users.jano])
    expect(await t.as('boss', `select company_id from public.member_homes where user_id = $1 order by company_id`, [t.users.jano])).toHaveLength(2)
    expect(await t.as('boss', `select phone from public.staff where company_id = $1 and member_id = $2`, [b, t.users.jano])).toEqual([{ phone: '+421 900 111 222' }])
  })

  it('stops syncing a card with sync turned off, and catches up when turned on again', async () => {
    await t.as('boss', `update public.staff set sync_profile = false, phone = '0900 firemný' where company_id = $1 and member_id = $2`, [b, t.users.jano])
    await t.as('jano', `update public.personal_profiles set phone = '0911 nový'`)
    expect(await t.as('boss', `select company_id = $1 as in_b, phone from public.staff where member_id = $2 order by phone`, [b, t.users.jano])).toEqual([
      { in_b: true, phone: '0900 firemný' },
      { in_b: false, phone: '0911 nový' },
    ])
    await t.as('boss', `update public.staff set sync_profile = true where company_id = $1 and member_id = $2`, [b, t.users.jano])
    expect(await t.as('boss', `select phone from public.staff where company_id = $1 and member_id = $2`, [b, t.users.jano])).toEqual([{ phone: '0911 nový' }])
  })
})
