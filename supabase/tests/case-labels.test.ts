// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let caseA: string

const uploadLogo = (user: string) =>
  t.as(user, `insert into storage.objects (bucket_id, name) values ('company-logos', $1) returning name`, [`${companyA}/logo.png`])

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const role of ['skladnik', 'viewer']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [
      companyA,
      t.users[role],
      role,
    ])
  }
  caseA = (await t.as('admin', `insert into public.cases (company_id, name) values ($1, 'Case') returning id`, [companyA]))[0].id
})

describe('case dimensions', () => {
  it('stores weight and size and rejects non-positive values', async () => {
    const [row] = await t.as(
      'skladnik',
      'update public.cases set weight_kg = 35.5, width_cm = 120, length_cm = 60, depth_cm = 40.5 where id = $1 returning weight_kg, depth_cm',
      [caseA],
    )
    expect(row).toEqual({ weight_kg: '35.50', depth_cm: '40.5' })
    await expect(t.as('skladnik', 'update public.cases set weight_kg = 0 where id = $1', [caseA])).rejects.toThrow(/check constraint/)
    await expect(t.as('skladnik', 'update public.cases set width_cm = -1 where id = $1', [caseA])).rejects.toThrow(/check constraint/)
  })
})

describe('label content', () => {
  it('stores the label number and category without requiring uniqueness', async () => {
    const [second] = await t.as('admin', `insert into public.cases (company_id, name) values ($1, 'Case B') returning id`, [companyA])
    for (const id of [caseA, second.id]) {
      await t.as('skladnik', `update public.cases set label_number = '1', label_category = 'Light' where id = $1`, [id])
    }
    expect(await t.as('viewer', `select count(*)::int as n from public.cases where label_number = '1'`)).toEqual([{ n: 2 }])
  })

  it('keeps a single main item per case and any number of secondary ones', async () => {
    const add = async (name: string) =>
      (await t.as('admin', 'insert into public.equipment (company_id, name, case_id) values ($1, $2, $3) returning id', [companyA, name, caseA]))[0].id
    const [mic, capsule, stand] = [await add('Mikrofón'), await add('Kapsula'), await add('Stojan')]
    const setRole = (id: string, role: string | null) =>
      t.as('skladnik', 'update public.equipment set label_role = $1 where id = $2', [role, id])
    const roles = async () =>
      Object.fromEntries(
        (await t.as('viewer', 'select name, label_role from public.equipment where case_id = $1', [caseA])).map((r) => [r.name, r.label_role]),
      )

    await setRole(mic, 'main')
    await setRole(capsule, 'secondary')
    await setRole(stand, 'secondary')
    expect(await roles()).toEqual({ Mikrofón: 'main', Kapsula: 'secondary', Stojan: 'secondary' })

    // nový hlavný prvok nahradí doterajší
    await setRole(stand, 'main')
    expect(await roles()).toEqual({ Mikrofón: null, Kapsula: 'secondary', Stojan: 'main' })
    await expect(setRole(mic, 'boss')).rejects.toThrow(/check constraint/)
  })

  it('clears the role when equipment leaves or changes its case', async () => {
    const [other] = await t.as('admin', `insert into public.cases (company_id, name) values ($1, 'Case C') returning id`, [companyA])
    const [item] = await t.as('admin', `insert into public.equipment (company_id, name, case_id) values ($1, 'Pult', $2) returning id`, [
      companyA,
      other.id,
    ])
    const mark = () => t.as('skladnik', `update public.equipment set label_role = 'main' where id = $1`, [item.id])
    const state = async () => (await t.as('viewer', 'select label_role, case_id from public.equipment where id = $1', [item.id]))[0]

    await mark()
    await t.as('skladnik', `update public.equipment set note = 'x' where id = $1`, [item.id])
    expect((await state()).label_role).toBe('main')

    await t.as('skladnik', 'update public.equipment set case_id = $1 where id = $2', [caseA, item.id])
    expect((await state()).label_role).toBeNull()

    await t.as('skladnik', 'update public.equipment set case_id = $1 where id = $2', [other.id, item.id])
    await mark()
    await t.as('admin', 'delete from public.cases where id = $1', [other.id])
    expect(await state()).toEqual({ label_role: null, case_id: null })
  })
})

describe('custom label content', () => {
  it('lets editors set a custom title and photo, but not viewers', async () => {
    const set = `update public.cases set label_title = 'Blindre 2-Lite', label_photo_path = 'x/y.jpg' where id = $1 returning label_title`
    expect(await t.as('viewer', set, [caseA])).toEqual([])
    expect(await t.as('skladnik', set, [caseA])).toEqual([{ label_title: 'Blindre 2-Lite' }])
    await expect(
      t.as('skladnik', `update public.cases set label_title = repeat('x', 81) where id = $1`, [caseA]),
    ).rejects.toThrow(/check constraint/)
  })
})

describe('stock and cable colours', () => {
  it('lets a consumable run down to zero and remembers its reorder level', async () => {
    const [fluid] = await t.as(
      'skladnik',
      `insert into public.equipment (company_id, name, kind, quantity, min_quantity) values ($1, 'Kvapalina do hazera', 'consumable', 2, 1) returning id`,
      [companyA],
    )
    expect(await t.as('skladnik', 'update public.equipment set quantity = 0 where id = $1 returning quantity', [fluid.id])).toEqual([
      { quantity: 0 },
    ])
    await expect(t.as('skladnik', 'update public.equipment set quantity = -1 where id = $1', [fluid.id])).rejects.toThrow(/check constraint/)
  })

  it('stores one colour per cable length, managed by admin and skladnik', async () => {
    const insert = (user: string, length: number, color: string) =>
      t.as(user, `insert into public.cable_colors (company_id, length_m, name, color) values ($1, $2, 'zelená', $3)`, [companyA, length, color])
    await insert('skladnik', 1, '#00a651')
    await expect(insert('skladnik', 1, '#ff0000')).rejects.toThrow(/unique|duplicate/)
    await expect(insert('skladnik', 2, 'green')).rejects.toThrow(/check constraint/)
    await expect(insert('viewer', 3, '#ff0000')).rejects.toThrow(/row-level security/)
    expect(await t.as('viewer', 'select color from public.cable_colors')).toEqual([{ color: '#00a651' }])

    // Zmena farby ide cez update iba stĺpca color; upsert, ktorý prepisuje aj kľúč, databáza odmietne.
    expect(
      await t.as('skladnik', `update public.cable_colors set color = '#ff0000' where company_id = $1 and length_m = 1 returning color`, [
        companyA,
      ]),
    ).toEqual([{ color: '#ff0000' }])
    await expect(
      t.as(
        'skladnik',
        `insert into public.cable_colors (company_id, length_m, color) values ($1, 1, '#0000ff')
         on conflict (company_id, length_m) do update set company_id = excluded.company_id, length_m = excluded.length_m, color = excluded.color`,
        [companyA],
      ),
    ).rejects.toThrow(/permission denied/)
    await t.as('skladnik', `update public.cable_colors set color = '#00a651' where company_id = $1 and length_m = 1`, [companyA])
    expect(await t.as('outsider', 'select color from public.cable_colors')).toEqual([])
  })
})

describe('company branding', () => {
  it('lets only an admin change the label footer and logo', async () => {
    const set = `update public.companies set label_footer = 'info@example.com', logo_path = 'x' where id = $1 returning id`
    expect(await t.as('skladnik', set, [companyA])).toEqual([])
    expect(await t.as('admin', set, [companyA])).toHaveLength(1)
  })

  it('restricts logo files to the admin, readable by members only', async () => {
    await expect(uploadLogo('skladnik')).rejects.toThrow(/row-level security/)
    await expect(uploadLogo('outsider')).rejects.toThrow(/row-level security/)
    expect(await uploadLogo('admin')).toHaveLength(1)
    expect(await t.as('viewer', `select 1 from storage.objects where bucket_id = 'company-logos'`)).toHaveLength(1)
    expect(await t.as('outsider', `select 1 from storage.objects where bucket_id = 'company-logos'`)).toEqual([])
    expect(await t.as('skladnik', `delete from storage.objects where bucket_id = 'company-logos' returning name`)).toEqual([])
  })
})
