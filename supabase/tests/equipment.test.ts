// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let companyB: string
let categoryA: string
let categoryB: string
let itemA: string

const insertItem = (company: string, name: string, inventoryNumber = '') =>
  [
    'insert into public.equipment (company_id, name, inventory_number) values ($1, $2, $3) returning id',
    [company, name, inventoryNumber],
  ] as const

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik', 'technik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  companyB = (await t.as('outsider', `select public.create_company('B') as id`))[0].id
  for (const role of ['skladnik', 'technik', 'viewer']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [
      companyA,
      t.users[role],
      role,
    ])
  }
  categoryA = (
    await t.as('admin', `insert into public.equipment_categories (company_id, name) values ($1, 'Zvuk') returning id`, [companyA])
  )[0].id
  categoryB = (
    await t.as('outsider', `insert into public.equipment_categories (company_id, name) values ($1, 'Svetlá') returning id`, [
      companyB,
    ])
  )[0].id
  itemA = (await t.as('admin', ...insertItem(companyA, 'Mixpult')))[0].id
  await t.as('outsider', ...insertItem(companyB, 'Cudzí reflektor'))
})

describe('equipment isolation', () => {
  it('shows only the equipment and categories of the own company', async () => {
    expect(await t.as('viewer', 'select name from public.equipment')).toEqual([{ name: 'Mixpult' }])
    expect(await t.as('viewer', 'select name from public.equipment_categories')).toEqual([{ name: 'Zvuk' }])
    expect(await t.as('outsider', 'select name from public.equipment')).toEqual([{ name: 'Cudzí reflektor' }])
  })

  it('gives anon nothing', async () => {
    await expect(t.as(null, 'select * from public.equipment')).rejects.toThrow(/permission denied/)
  })

  it('rejects inserting into another company', async () => {
    await expect(t.as('admin', ...insertItem(companyB, 'Podvrh'))).rejects.toThrow(/row-level security/)
  })

  it('does not update or delete rows of another company', async () => {
    expect(await t.as('outsider', `update public.equipment set name = 'x' where id = $1 returning id`, [itemA])).toEqual([])
    expect(await t.as('outsider', 'delete from public.equipment where id = $1 returning id', [itemA])).toEqual([])
  })

  it('rejects a category that belongs to another company', async () => {
    await expect(
      t.as('admin', 'update public.equipment set category_id = $1 where id = $2', [categoryB, itemA]),
    ).rejects.toThrow(/foreign key/)
  })

  it('does not allow moving equipment to another company', async () => {
    await expect(
      t.as('admin', 'update public.equipment set company_id = $1 where id = $2', [companyB, itemA]),
    ).rejects.toThrow(/permission denied/)
  })
})

describe('equipment roles', () => {
  it('lets a viewer only read', async () => {
    await expect(t.as('viewer', ...insertItem(companyA, 'Kábel'))).rejects.toThrow(/row-level security/)
    expect(await t.as('viewer', `update public.equipment set name = 'x' where id = $1 returning id`, [itemA])).toEqual([])
    expect(await t.as('viewer', 'delete from public.equipment where id = $1 returning id', [itemA])).toEqual([])
  })

  it('lets a technik add and edit, but not delete', async () => {
    const [created] = await t.as('technik', ...insertItem(companyA, 'Mikrofón'))
    const updated = await t.as(
      'technik',
      `update public.equipment set status = 'in_service', category_id = $1 where id = $2 returning status`,
      [categoryA, created.id],
    )
    expect(updated).toEqual([{ status: 'in_service' }])
    expect(await t.as('technik', 'delete from public.equipment where id = $1 returning id', [created.id])).toEqual([])
  })

  it('lets a technik add a category but not rename or delete one', async () => {
    await t.as('technik', `insert into public.equipment_categories (company_id, name) values ($1, 'Video')`, [companyA])
    expect(
      await t.as('technik', `update public.equipment_categories set name = 'x' where id = $1 returning id`, [categoryA]),
    ).toEqual([])
    expect(await t.as('technik', 'delete from public.equipment_categories where id = $1 returning id', [categoryA])).toEqual([])
  })

  it('lets a skladnik delete equipment', async () => {
    const [created] = await t.as('skladnik', ...insertItem(companyA, 'Na vyradenie'))
    expect(await t.as('skladnik', 'delete from public.equipment where id = $1 returning id', [created.id])).toHaveLength(1)
  })
})

describe('equipment constraints', () => {
  it('keeps inventory numbers unique within a company, case-insensitively', async () => {
    await t.as('admin', ...insertItem(companyA, 'Prvý', 'INV-1'))
    await expect(t.as('admin', ...insertItem(companyA, 'Druhý', 'inv-1'))).rejects.toThrow(/unique/)
    // iná firma môže mať to isté číslo, prázdne číslo sa môže opakovať
    await t.as('outsider', ...insertItem(companyB, 'Tretí', 'INV-1'))
    await t.as('admin', ...insertItem(companyA, 'Bez čísla'))
  })

  it('rejects duplicate category names regardless of case', async () => {
    await expect(
      t.as('admin', `insert into public.equipment_categories (company_id, name) values ($1, 'ZVUK')`, [companyA]),
    ).rejects.toThrow(/unique/)
  })

  it('clears the category on equipment when the category is deleted', async () => {
    await t.as('admin', 'update public.equipment set category_id = $1 where id = $2', [categoryA, itemA])
    await t.as('admin', 'delete from public.equipment_categories where id = $1', [categoryA])
    expect(await t.as('admin', 'select category_id, company_id from public.equipment where id = $1', [itemA])).toEqual([
      { category_id: null, company_id: companyA },
    ])
  })

  it('bumps updated_at on change', async () => {
    await t.rows(`update public.equipment set updated_at = '2000-01-01' where id = $1`, [itemA])
    // priamy update vyššie trigger prepíše na now(); overíme, že hodnota nie je z roku 2000
    const [row] = await t.as('admin', `update public.equipment set note = 'x' where id = $1 returning updated_at`, [itemA])
    expect(new Date(row.updated_at).getFullYear()).toBeGreaterThan(2000)
  })
})
