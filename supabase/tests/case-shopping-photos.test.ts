// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let box: string
let wish: string

const bin = () => t.as('admin', 'select id, kind, label, detail from public.recycle_bin_items($1)', [companyA])

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'technik', 'viewer']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  for (const role of ['technik', 'viewer']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [companyA, t.users[role], role])
  }
  box = (await t.as('admin', `insert into public.cases (company_id, name) values ($1, 'Audio case') returning id`, [companyA]))[0].id
  wish = (await t.as('admin', `insert into public.shopping_items (company_id, name) values ($1, 'Nový pult') returning id`, [companyA]))[0].id
})

describe('case and shopping photos', () => {
  it('are set by those who may edit and go to the bin and back', async () => {
    await expect(t.as('viewer', `update public.cases set photo_path = 'x/v.jpg' where id = $1 returning id`, [box])).resolves.toEqual([])
    await t.as('technik', `update public.cases set photo_path = $1 where id = $2`, [`${companyA}/case.jpg`, box])
    await t.as('technik', `update public.shopping_items set photo_path = $1 where id = $2`, [`${companyA}/wish.jpg`, wish])

    await t.as('technik', `select public.trash_photo('case_photo', $1)`, [box])
    await t.as('technik', `select public.trash_photo('shopping_items', $1)`, [wish])
    expect(await t.as('admin', 'select photo_path from public.cases where id = $1', [box])).toEqual([{ photo_path: '' }])
    const items = await bin()
    expect(items.map((item) => item.detail).sort()).toEqual(['fotka case', 'fotka položky na nákup'])

    for (const item of items) await t.as('admin', 'select public.restore_bin_item($1, $2, $3)', [companyA, 'photo', item.id])
    expect(await t.as('admin', 'select photo_path from public.cases where id = $1', [box])).toEqual([{ photo_path: `${companyA}/case.jpg` }])
    expect(await t.as('admin', 'select photo_path from public.shopping_items where id = $1', [wish])).toEqual([{ photo_path: `${companyA}/wish.jpg` }])
  })

  it('reports the case photo file when the case is deleted for good', async () => {
    await t.as('admin', `update public.cases set label_photo_path = $1 where id = $2`, [`${companyA}/label.jpg`, box])
    await t.as('admin', 'select public.trash_case($1)', [box])
    const files = await t.as('admin', `select path from public.purge_bin($1, 'all', null, null) order by path`, [companyA])
    expect(files).toEqual([{ path: `${companyA}/case.jpg` }, { path: `${companyA}/label.jpg` }])
  })
})
