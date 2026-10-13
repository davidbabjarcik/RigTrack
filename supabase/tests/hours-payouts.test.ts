// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let head: string

const read = (user: string, date: string, hours: number) =>
  t.as(user, 'insert into public.equipment_hour_readings (company_id, equipment_id, read_on, hours) values ($1, $2, $3, $4) returning author_name', [
    companyA,
    head,
    date,
    hours,
  ])
const state = async () =>
  (await t.as('viewer', 'select operating_hours, hours_read_on::text from public.equipment where id = $1', [head]))[0]
const pay = (user: string, member: string, amount: number) =>
  t.as(user, 'insert into public.member_payments (company_id, member_id, amount) values ($1, $2, $3) returning id', [
    companyA,
    t.users[member],
    amount,
  ])

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik', 'technik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const role of ['skladnik', 'technik', 'viewer']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [
      companyA,
      t.users[role],
      role,
    ])
  }
  head = (await t.as('admin', `insert into public.equipment (company_id, name) values ($1, 'Moving head') returning id`, [companyA]))[0].id
})

describe('operating hours', () => {
  it('copies the newest reading onto the equipment', async () => {
    expect(await read('technik', '2026-06-01', 1200)).toEqual([{ author_name: 'technik@example.com' }])
    expect(await state()).toEqual({ operating_hours: '1200.0', hours_read_on: '2026-06-01' })
    await read('technik', '2026-10-01', 1350.5)
    expect(await state()).toEqual({ operating_hours: '1350.5', hours_read_on: '2026-10-01' })
  })

  it('keeps the newest state when an older reading is entered later', async () => {
    await read('technik', '2026-01-01', 900)
    expect(await state()).toEqual({ operating_hours: '1350.5', hours_read_on: '2026-10-01' })
  })

  it('cannot be overwritten without a reading', async () => {
    await expect(t.as('admin', 'update public.equipment set operating_hours = 1 where id = $1', [head])).rejects.toThrow(/permission denied/)
    expect(await t.as('technik', 'update public.equipment set hours_interval_months = 3 where id = $1 returning id', [head])).toHaveLength(1)
  })

  it('is closed to viewers and other companies, and only admin and skladnik delete readings', async () => {
    await expect(read('viewer', '2026-10-02', 1)).rejects.toThrow(/row-level security/)
    await expect(read('outsider', '2026-10-02', 1)).rejects.toThrow(/row-level security/)
    expect(await t.as('outsider', 'select 1 from public.equipment_hour_readings')).toEqual([])
    expect(await t.as('technik', 'delete from public.equipment_hour_readings returning id')).toEqual([])
    expect(await t.as('skladnik', `delete from public.equipment_hour_readings where read_on = '2026-01-01' returning id`)).toHaveLength(1)
  })
})

describe('member payments', () => {
  it('can be recorded by the admin only, for members of the company', async () => {
    await pay('admin', 'technik', 120)
    await pay('admin', 'viewer', 60)
    await expect(pay('skladnik', 'technik', 50)).rejects.toThrow(/row-level security/)
    await expect(pay('technik', 'technik', 1000)).rejects.toThrow(/row-level security/)
    await expect(pay('admin', 'outsider', 50)).rejects.toThrow(/row-level security/)
    await expect(pay('admin', 'technik', 0)).rejects.toThrow(/check constraint/)
  })

  it('shows each member only their own payments and the admin everything', async () => {
    expect(await t.as('technik', 'select amount from public.member_payments')).toEqual([{ amount: '120.00' }])
    expect(await t.as('viewer', 'select amount from public.member_payments')).toEqual([{ amount: '60.00' }])
    expect(await t.as('skladnik', 'select amount from public.member_payments')).toEqual([])
    expect(await t.as('admin', 'select count(*)::int as n from public.member_payments')).toEqual([{ n: 2 }])
    expect(await t.as('outsider', 'select 1 from public.member_payments')).toEqual([])
    await expect(t.as(null, 'select 1 from public.member_payments')).rejects.toThrow(/permission denied/)
  })

  it('lets only the admin mark a payment as paid or delete it', async () => {
    const paid = `update public.member_payments set paid_at = now() returning id`
    expect(await t.as('technik', paid)).toEqual([])
    expect(await t.as('admin', paid)).toHaveLength(2)
    expect(await t.as('technik', 'delete from public.member_payments returning id')).toEqual([])
  })

  it('stops showing a member their payments once they leave the company', async () => {
    await t.rows('delete from public.company_members where company_id = $1 and user_id = $2', [companyA, t.users.viewer])
    expect(await t.as('viewer', 'select 1 from public.member_payments')).toEqual([])
  })
})
