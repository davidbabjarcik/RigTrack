// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let technikCard: string
let brigadnik: string

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

describe('staff', () => {
  it('gives every member a card that only they (and managers) can edit', async () => {
    // Karta vznikne sama pri pridaní do firmy (0052).
    technikCard = (await t.as('technik', 'select id from public.staff where member_id = $1', [t.users.technik]))[0].id
    await expect(t.as('technik', `insert into public.staff (company_id, member_id) values ($1, $2)`, [companyA, t.users.technik2])).rejects.toThrow(/row-level security/)
    await t.as('technik', `update public.staff set position = 'Osvetľovač', phone = '+421 911' where id = $1`, [technikCard])
    expect(await t.as('technik2', `update public.staff set phone = 'x' where id = $1 returning id`, [technikCard])).toEqual([])
    expect(await t.as('technik2', 'select position, phone from public.staff where id = $1', [technikCard])).toEqual([{ position: 'Osvetľovač', phone: '+421 911' }])
    expect(await t.as('outsider', 'select 1 from public.staff where company_id = $1', [companyA])).toEqual([])
  })

  it('lets managers add part-timers without an account, who need a name', async () => {
    brigadnik = (await t.as('skladnik', `insert into public.staff (company_id, name, position) values ($1, 'Jano Brigádnik', 'Stagehand') returning id`, [companyA]))[0].id
    await expect(t.as('skladnik', `insert into public.staff (company_id, name) values ($1, ' ')`, [companyA])).rejects.toThrow(/check constraint/)
    await expect(t.as('technik', `insert into public.staff (company_id, name) values ($1, 'Iný')`, [companyA])).rejects.toThrow(/row-level security/)
    expect(await t.as('technik', 'delete from public.staff where id = $1 returning id', [brigadnik])).toEqual([])
  })

  it('keeps own unavailability editable by its owner and managers', async () => {
    const add = (user: string, staffId: string) =>
      t.as(user, `insert into public.staff_unavailability (company_id, staff_id, starts_on, ends_on, note) values ($1, $2, '2026-11-01', '2026-11-07', 'Dovolenka') returning id`, [companyA, staffId])
    await add('technik', technikCard)
    await expect(add('technik2', technikCard)).rejects.toThrow(/row-level security/)
    await add('skladnik', brigadnik)
    expect(await t.as('technik2', 'select count(*)::int as n from public.staff_unavailability')).toEqual([{ n: 2 }])
    await expect(
      t.as('admin', `insert into public.staff_unavailability (company_id, staff_id, starts_on, ends_on) values ($1, $2, '2026-11-07', '2026-11-01')`, [companyA, technikCard]),
    ).rejects.toThrow(/check constraint/)
  })

  it('follows the permission settings', async () => {
    await t.as('admin', `insert into public.role_permissions (company_id, role, permission, allowed) values ($1, 'technik', 'staff.view', false)`, [companyA])
    // bez oprávnenia vidí len svoju kartu
    expect(await t.as('technik', 'select id from public.staff')).toEqual([{ id: technikCard }])
  })
})
