// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let companyB: string
let event: string
let mixer: string
let foreignMixer: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'technik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  companyB = (await t.as('outsider', `select public.create_company('B') as id`))[0].id
  for (const role of ['technik', 'viewer']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [
      companyA,
      t.users[role],
      role,
    ])
  }
  mixer = (await t.as('admin', `insert into public.equipment (company_id, name) values ($1, 'Mixpult') returning id`, [companyA]))[0].id
  foreignMixer = (
    await t.as('outsider', `insert into public.equipment (company_id, name) values ($1, 'Cudzí pult') returning id`, [companyB])
  )[0].id
  event = (
    await t.as(
      'technik',
      `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Festival', '2026-11-01', '2026-11-02') returning id`,
      [companyA],
    )
  )[0].id
})

describe('events', () => {
  it('are visible to members only and reject reversed dates', async () => {
    expect(await t.as('viewer', 'select name from public.events')).toEqual([{ name: 'Festival' }])
    expect(await t.as('outsider', 'select 1 from public.events')).toEqual([])
    await expect(t.as(null, 'select 1 from public.events')).rejects.toThrow(/permission denied/)
    await expect(
      t.as('admin', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'x', '2026-11-05', '2026-11-01')`, [companyA]),
    ).rejects.toThrow(/check constraint/)
    await expect(
      t.as('viewer', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'x', '2026-11-05', '2026-11-06')`, [companyA]),
    ).rejects.toThrow(/row-level security/)
  })

  it('take equipment of the same company only', async () => {
    await t.as('technik', 'insert into public.event_equipment (company_id, event_id, equipment_id, quantity) values ($1, $2, $3, 1)', [
      companyA,
      event,
      mixer,
    ])
    await expect(
      t.as('technik', 'insert into public.event_equipment (company_id, event_id, equipment_id) values ($1, $2, $3)', [companyA, event, foreignMixer]),
    ).rejects.toThrow(/foreign key/)
    await expect(
      t.as('viewer', 'delete from public.event_equipment where event_id = $1 returning equipment_id', [event]),
    ).resolves.toEqual([])
  })

  it('accept crew from the company or outsiders by name, never an empty row', async () => {
    const add = (member: string | null, name: string) =>
      t.as('technik', 'insert into public.event_crew (company_id, event_id, member_id, name, role) values ($1, $2, $3, $4, $5)', [
        companyA,
        event,
        member,
        name,
        'zvukár',
      ])
    await add(t.users.viewer, '')
    await add(null, 'Externý Ivan')
    await expect(add(t.users.outsider, '')).rejects.toThrow(/row-level security/)
    await expect(add(null, '  ')).rejects.toThrow(/row-level security/)
    expect(await t.as('viewer', 'select count(*)::int as n from public.event_crew')).toEqual([{ n: 2 }])
  })

  it('store documents under the company folder with matching file access', async () => {
    const path = `${companyA}/${event}/rider.pdf`
    await t.as('technik', `insert into storage.objects (bucket_id, name) values ('event-documents', $1)`, [path])
    await t.as('technik', `insert into public.event_documents (company_id, event_id, name, path) values ($1, $2, 'Rider', $3)`, [companyA, event, path])
    await expect(
      t.as('outsider', `insert into storage.objects (bucket_id, name) values ('event-documents', $1)`, [`${companyA}/${event}/x.pdf`]),
    ).rejects.toThrow(/row-level security/)
    expect(await t.as('viewer', `select count(*)::int as n from storage.objects where bucket_id = 'event-documents'`)).toEqual([{ n: 1 }])
    expect(await t.as('outsider', `select 1 from storage.objects where bucket_id = 'event-documents'`)).toEqual([])
    expect(await t.as('outsider', 'select 1 from public.event_documents')).toEqual([])
  })

  it('keep the organizer, description, times and photos for the printout', async () => {
    await t.as(
      'technik',
      `update public.events set organizer = 'Mesto Stropkov', organizer_phone = '+421 900 000 000', description = 'Open air',
        get_in_time = '14:00', show_time = '19:30' where id = $1`,
      [event],
    )
    await expect(t.as('viewer', `update public.events set organizer = 'x' where id = $1 returning id`, [event])).resolves.toEqual([])
    expect(await t.as('viewer', 'select organizer, description, get_in_time::text, show_time::text, show_end_time from public.events where id = $1', [event])).toEqual([
      { organizer: 'Mesto Stropkov', description: 'Open air', get_in_time: '14:00:00', show_time: '19:30:00', show_end_time: null },
    ])

    const [photo] = await t.as(
      'technik',
      `insert into public.event_documents (company_id, event_id, name, path, is_photo) values ($1, $2, 'podium.jpg', $3, true) returning id`,
      [companyA, event, `${companyA}/${event}/p.jpg`],
    )
    await t.as('technik', 'select public.trash_event_document($1)', [photo.id])
    const bin = await t.as('admin', 'select label, detail from public.recycle_bin_items($1)', [companyA])
    expect(bin).toContainEqual({ label: 'podium.jpg', detail: 'fotka eventu: Festival' })
    await t.as('admin', 'select public.restore_bin_item($1, $2, $3)', [companyA, 'event_document', photo.id])
  })

  it('can be deleted by admin and skladnik only, taking everything attached along', async () => {
    expect(await t.as('technik', 'delete from public.events where id = $1 returning id', [event])).toEqual([])
    expect(await t.as('admin', 'delete from public.events where id = $1 returning id', [event])).toHaveLength(1)
    expect(await t.rows('select 1 from public.event_equipment')).toEqual([])
    expect(await t.rows('select 1 from public.event_crew')).toEqual([])
    expect(await t.rows('select 1 from public.event_documents')).toEqual([])
  })
})
