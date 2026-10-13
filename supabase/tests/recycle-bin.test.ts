// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let mixer: string
let cable: string
let box: string

const visible = async (user: string, table: string) => (await t.as(user, `select name from public.${table} order by name`)).map((row) => row.name)
const bin = (user = 'admin') => t.as(user, 'select kind, label, detail, deleted_by_name from public.recycle_bin_items($1)', [companyA])
const restore = (kind: string, id: string, user = 'admin') => t.as(user, 'select public.restore_bin_item($1, $2, $3)', [companyA, kind, id])
const purge = (mode: string, kind: string | null = null, id: string | null = null, user = 'admin') =>
  t.as(user, 'select bucket, path from public.purge_bin($1, $2, $3, $4)', [companyA, mode, kind, id])

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik', 'technik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const role of ['skladnik', 'technik', 'viewer']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [companyA, t.users[role], role])
  }
  box = (await t.as('admin', `insert into public.cases (company_id, name, inventory_number) values ($1, 'Audio case', 'C-1') returning id`, [companyA]))[0].id
  const add = async (name: string, extra = '') =>
    (await t.as('admin', `insert into public.equipment (company_id, name, case_id, inventory_number, photo_path${extra ? ', kind' : ''}) values ($1, $2, $3, $4, $5${extra}) returning id`, [
      companyA,
      name,
      box,
      name === 'Mixpult' ? 'INV-1' : '',
      name === 'Mixpult' ? `${companyA}/mixer.jpg` : '',
    ]))[0].id
  mixer = await add('Mixpult')
  cable = await add('XLR 5 m')
})

describe('moving to the bin', () => {
  it('hides the equipment from everyone but keeps it restorable, with the same rights as deleting', async () => {
    await expect(t.as('technik', 'select public.trash_equipment($1)', [mixer])).rejects.toThrow(/nepodarilo zmazať/)
    await expect(t.as('outsider', 'select public.trash_equipment($1)', [mixer])).rejects.toThrow(/nepodarilo zmazať/)
    await t.as('skladnik', 'select public.trash_equipment($1)', [mixer])
    expect(await visible('admin', 'equipment')).toEqual(['XLR 5 m'])
    expect(await visible('viewer', 'equipment')).toEqual(['XLR 5 m'])
    expect(await bin()).toEqual([{ kind: 'equipment', label: 'Mixpult', detail: 'INV-1 · 1 ks', deleted_by_name: 'skladnik@example.com' }])
    // to isté označenie môže dostať nová technika
    await t.as('admin', `insert into public.equipment (company_id, name, inventory_number) values ($1, 'Nový pult', 'INV-1')`, [companyA])
  })

  it('is open to the admin only', async () => {
    await expect(bin('skladnik')).rejects.toThrow(/iba admin/)
    await expect(bin('outsider')).rejects.toThrow(/iba admin/)
    await expect(restore('equipment', mixer, 'skladnik')).rejects.toThrow(/iba admin/)
    await expect(purge('all', null, null, 'skladnik')).rejects.toThrow(/iba admin/)
    await expect(t.as(null, 'select public.trash_equipment($1)', [mixer])).rejects.toThrow(/permission denied/)
  })

  it('refuses to restore over a record that took its place, then restores cleanly', async () => {
    await expect(restore('equipment', mixer)).rejects.toThrow(/duplicate key/)
    await t.as('admin', `delete from public.equipment where name = 'Nový pult'`)
    await restore('equipment', mixer)
    expect(await visible('viewer', 'equipment')).toEqual(['Mixpult', 'XLR 5 m'])
    expect(await bin()).toEqual([])
    await expect(restore('equipment', mixer)).rejects.toThrow(/už nie je/)
  })
})

describe('cases', () => {
  it('take their content out when trashed and put it back when restored', async () => {
    await t.as('admin', 'select public.trash_case($1)', [box])
    expect(await visible('viewer', 'cases')).toEqual([])
    expect(await t.as('viewer', 'select count(*)::int as n from public.equipment where case_id is null')).toEqual([{ n: 2 }])
    expect((await bin())[0]).toMatchObject({ kind: 'case', label: 'Audio case', detail: 'C-1 · položiek v obsahu: 2' })

    // jedna položka medzitým skončila v inom case: tá sa nevráti
    const other = (await t.as('admin', `insert into public.cases (company_id, name) values ($1, 'Iný case') returning id`, [companyA]))[0].id
    await t.as('admin', 'update public.equipment set case_id = $1 where id = $2', [other, cable])
    await restore('case', box)
    expect(await t.as('viewer', 'select name, case_id from public.equipment order by name')).toEqual([
      { name: 'Mixpult', case_id: box },
      { name: 'XLR 5 m', case_id: other },
    ])
  })
})

describe('photos and documents', () => {
  it('keep a removed photo until it is restored to an empty slot', async () => {
    await t.as('technik', `select public.trash_photo('equipment', $1)`, [mixer])
    expect(await t.as('viewer', 'select photo_path from public.equipment where id = $1', [mixer])).toEqual([{ photo_path: '' }])
    const [photo] = await t.rows('select id from public.trashed_photos')
    expect((await bin())[0]).toMatchObject({ kind: 'photo', label: 'Mixpult', detail: 'fotka techniky' })
    await expect(t.as('viewer', `select public.trash_photo('equipment', $1)`, [cable])).rejects.toThrow(/nepodarilo zmazať/)

    await t.as('admin', `update public.equipment set photo_path = 'x/new.jpg' where id = $1`, [mixer])
    await expect(restore('photo', photo.id)).rejects.toThrow(/už má inú fotku/)
    await t.as('admin', `update public.equipment set photo_path = '' where id = $1`, [mixer])
    await restore('photo', photo.id)
    expect(await t.as('viewer', 'select photo_path from public.equipment where id = $1', [mixer])).toEqual([{ photo_path: `${companyA}/mixer.jpg` }])
  })

  it('hide a trashed event document and bring it back', async () => {
    const [event] = await t.as('admin', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Festival', '2027-01-01', '2027-01-02') returning id`, [companyA])
    const [doc] = await t.as('technik', `insert into public.event_documents (company_id, event_id, name, path) values ($1, $2, 'Rider.pdf', 'a/rider.pdf') returning id`, [companyA, event.id])
    await expect(t.as('viewer', 'select public.trash_event_document($1)', [doc.id])).rejects.toThrow(/nepodarilo zmazať/)
    await t.as('technik', 'select public.trash_event_document($1)', [doc.id])
    expect(await t.as('viewer', 'select 1 from public.event_documents')).toEqual([])
    expect((await bin())[0]).toMatchObject({ kind: 'event_document', label: 'Rider.pdf', detail: 'dokument eventu: Festival' })
    await restore('event_document', doc.id)
    expect(await t.as('viewer', 'select name from public.event_documents')).toEqual([{ name: 'Rider.pdf' }])
  })
})

describe('purging', () => {
  it('removes only what is older than 30 days and reports the files to delete', async () => {
    await t.as('admin', 'select public.trash_equipment($1)', [mixer])
    await t.as('admin', 'select public.trash_equipment($1)', [cable])
    expect(await purge('expired')).toEqual([])
    await t.rows(`update public.equipment set deleted_at = now() - interval '31 days' where id = $1`, [mixer])
    expect(await purge('expired')).toEqual([{ bucket: 'equipment-photos', path: `${companyA}/mixer.jpg` }])
    expect(await t.rows('select name from public.equipment where deleted_at is not null')).toEqual([{ name: 'XLR 5 m' }])
  })

  it('can delete one item for good, or empty the whole bin', async () => {
    await t.as('admin', 'select public.trash_case($1)', [box])
    await purge('one', 'equipment', cable)
    expect((await bin()).map((item) => item.kind)).toEqual(['case'])
    await expect(purge('one')).rejects.toThrow(/Neplatná požiadavka/)
    await purge('all')
    expect(await bin()).toEqual([])
    expect(await t.rows('select 1 from public.cases where id = $1', [box])).toEqual([])
  })
})
