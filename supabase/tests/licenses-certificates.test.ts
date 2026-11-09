// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let b: string
let laptop: string
let techStaff: string
let helperStaff: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'tech', 'viewer', 'stranger']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  b = (await t.as('stranger', `select public.create_company('B') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik'), ($1, $3, 'viewer')`, [a, t.users.tech, t.users.viewer])
  laptop = (await t.as('boss', `insert into public.equipment (company_id, name) values ($1, 'Notebook') returning id`, [a]))[0].id
  const own = await t.rows('select id from public.staff where company_id = $1 and member_id = $2', [a, t.users.tech])
  techStaff = own[0]?.id ?? (await t.as('tech', `insert into public.staff (company_id, member_id, name) values ($1, $2, 'Technik') returning id`, [a, t.users.tech]))[0].id
  helperStaff = (await t.as('boss', `insert into public.staff (company_id, name) values ($1, 'Brigádnik') returning id`, [a]))[0].id
})

describe('software licenses', () => {
  it('shows licenses to gear viewers and keys only to gear editors', async () => {
    const id = (await t.as('tech', `insert into public.software_licenses (company_id, name, seats, equipment_id) values ($1, 'Mix program', 2, $2) returning id`, [a, laptop]))[0].id
    await t.as('tech', `insert into public.software_license_keys (company_id, license_id, license_key) values ($1, $2, 'AAAA-BBBB')`, [a, id])
    expect(await t.as('viewer', 'select name, seats from public.software_licenses')).toEqual([{ name: 'Mix program', seats: 2 }])
    expect(await t.as('viewer', 'select 1 from public.software_license_keys')).toEqual([])
    expect(await t.as('tech', 'select license_key from public.software_license_keys')).toEqual([{ license_key: 'AAAA-BBBB' }])
    await expect(t.as('viewer', `insert into public.software_licenses (company_id, name) values ($1, 'X')`, [a])).rejects.toThrow()
    expect(await t.as('stranger', 'select 1 from public.software_licenses')).toEqual([])
    // Kľúč sa nedá pripojiť k licencii inej firmy.
    await expect(t.as('stranger', `insert into public.software_license_keys (company_id, license_id, license_key) values ($1, $2, 'x')`, [b, id])).rejects.toThrow()
  })

  it('keeps the license when the computer is removed and drops the key with the license', async () => {
    await t.rows('delete from public.equipment where id = $1', [laptop])
    expect(await t.as('tech', 'select equipment_id from public.software_licenses')).toEqual([{ equipment_id: null }])
    await t.as('tech', 'delete from public.software_licenses')
    expect(await t.rows('select 1 from public.software_license_keys')).toEqual([])
  })
})

describe('staff certificates', () => {
  it('lets a person manage their own certificates and the team manager everyone’s', async () => {
    await t.as('tech', `insert into public.staff_certificates (company_id, staff_id, name, valid_until) values ($1, $2, 'Práca vo výškach', '2027-05-01')`, [a, techStaff])
    await expect(t.as('tech', `insert into public.staff_certificates (company_id, staff_id, name) values ($1, $2, 'Cudzie')`, [a, helperStaff])).rejects.toThrow()
    await t.as('boss', `insert into public.staff_certificates (company_id, staff_id, name) values ($1, $2, 'Elektro')`, [a, helperStaff])
    expect(await t.as('viewer', 'select name from public.staff_certificates order by name')).toEqual([{ name: 'Elektro' }, { name: 'Práca vo výškach' }])
    expect(await t.as('tech', `update public.staff_certificates set name = 'Zmenené' where staff_id = $1 returning 1`, [helperStaff])).toEqual([])
    expect(await t.as('stranger', 'select 1 from public.staff_certificates')).toEqual([])
    await expect(t.as('stranger', `insert into public.staff_certificates (company_id, staff_id, name) values ($1, $2, 'X')`, [b, techStaff])).rejects.toThrow()
  })
})
