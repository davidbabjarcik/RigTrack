// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let card: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'jano', 'other']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into storage.buckets (id) values ('equipment-photos') on conflict do nothing`)
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.jano])
  card = (await t.as('boss', `select id from public.staff where company_id = $1 and member_id = $2`, [a, t.users.jano]))[0].id
})

describe('own photo and own gear', () => {
  it('lets a viewer upload only a photo of their own card', async () => {
    await t.as('jano', `insert into storage.objects (bucket_id, name) values ('equipment-photos', $1)`, [`${a}/staff-${card}-1.jpg`])
    await expect(t.as('jano', `insert into storage.objects (bucket_id, name) values ('equipment-photos', $1)`, [`${a}/other-1.jpg`])).rejects.toThrow()
    await expect(t.as('other', `insert into storage.objects (bucket_id, name) values ('equipment-photos', $1)`, [`${a}/staff-${card}-2.jpg`])).rejects.toThrow()
  })

  it('creates own equipment and case owned by my card', async () => {
    const eq = (await t.as('jano', `select public.create_own_equipment($1, ' Môj mixpult ', 'audio', 1, 'Behringer', 'X32') as id`, [a]))[0].id
    const cs = (await t.as('jano', `select public.create_own_case($1, 'Môj rack') as id`, [a]))[0].id
    expect(await t.as('boss', 'select name, owner_staff_id from public.equipment where id = $1', [eq])).toEqual([{ name: 'Môj mixpult', owner_staff_id: card }])
    expect(await t.as('boss', 'select owner_staff_id from public.cases where id = $1', [cs])).toEqual([{ owner_staff_id: card }])
    await expect(t.as('other', `select public.create_own_case($1, 'X')`, [a])).rejects.toThrow(/členom/)
  })
})

describe('guest devices', () => {
  it('only equipment editors see and write guest devices', async () => {
    await t.as('boss', `insert into public.guest_devices (company_id, person_name, contact, device_name, mac) values ($1, 'Peter Hosť', '0900 111 222', 'MacBook', 'AA:BB:CC:DD:EE:FF')`, [a])
    expect(await t.as('boss', 'select person_name from public.guest_devices')).toEqual([{ person_name: 'Peter Hosť' }])
    expect(await t.as('jano', 'select person_name from public.guest_devices')).toEqual([])
    await expect(t.as('jano', `insert into public.guest_devices (company_id, person_name, mac) values ($1, 'X', 'AA:BB:CC:DD:EE:00')`, [a])).rejects.toThrow()
    await expect(t.as('boss', `insert into public.guest_devices (company_id, person_name) values ($1, 'Bez adresy')`, [a])).rejects.toThrow()
  })
})

describe('splitting equipment into cases', () => {
  it('moves part of the pieces into a case and creates many cases at once', async () => {
    const lights = (await t.as('boss', `insert into public.equipment (company_id, name, kind, quantity, inventory_number) values ($1, 'LED Par', 'light', 16, 'L-1') returning id`, [a]))[0].id
    const first = (await t.as('boss', `insert into public.cases (company_id, name) values ($1, 'Case A') returning id`, [a]))[0].id
    const part = (await t.as('boss', 'select public.split_equipment_into_case($1, $2, 2) as id', [lights, first]))[0].id
    expect(part).not.toBe(lights)
    expect(await t.as('boss', 'select quantity, case_id, inventory_number from public.equipment where id = $1', [part])).toEqual([{ quantity: 2, case_id: first, inventory_number: '' }])
    expect(await t.as('boss', 'select quantity from public.equipment where id = $1', [lights])).toEqual([{ quantity: 14 }])

    const ids = (await t.as('boss', `select public.create_cases_bulk($1, 'Case svetlo', 7, 2, null, $2, 2) as ids`, [a, lights]))[0].ids
    expect(ids).toHaveLength(7)
    expect(await t.as('boss', `select count(*)::int as n, sum(quantity)::int as q from public.equipment where name = 'LED Par' and case_id is not null`)).toEqual([{ n: 8, q: 16 }])
    expect(await t.as('boss', `select name from public.cases where id = $1`, [ids[6]])).toEqual([{ name: 'Case svetlo 8' }])
    await expect(t.as('boss', `select public.create_cases_bulk($1, 'X', 2, 1, null, $2, 5)`, [a, part])).rejects.toThrow(/dosť kusov/)
    await expect(t.as('jano', `select public.create_cases_bulk($1, 'X', 1)`, [a])).rejects.toThrow(/Nemôžete/)
  })
})

describe('socials from profile', () => {
  it('copies socials from the personal profile to the staff card', async () => {
    await t.as('jano', `insert into public.personal_profiles (user_id, phone, socials) values ($1, '0900', '{"instagram":"jano.zvuk"}')`, [t.users.jano])
    expect(await t.as('boss', 'select socials from public.staff where id = $1', [card])).toEqual([{ socials: { instagram: 'jano.zvuk' } }])
    await t.as('jano', `update public.personal_profiles set socials = '{"instagram":"jano2"}' where user_id = $1`, [t.users.jano])
    expect(await t.as('boss', 'select socials from public.staff where id = $1', [card])).toEqual([{ socials: { instagram: 'jano2' } }])
  })
})
