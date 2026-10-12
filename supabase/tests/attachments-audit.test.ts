// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let mixer: string

const log = (where = '') =>
  t.as('admin', `select action, entity, label, actor_name, changed from public.audit_log ${where} order by id`)

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'technik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  await t.rows(`update public.profiles set full_name = 'Tomáš Technik' where id = $1`, [t.users.technik])
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const role of ['technik', 'viewer']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [
      companyA,
      t.users[role],
      role,
    ])
  }
  mixer = (await t.as('technik', `insert into public.equipment (company_id, name) values ($1, 'Mixpult') returning id`, [companyA]))[0].id
})

describe('audit log', () => {
  it('records who created, changed and deleted what', async () => {
    await t.as('technik', `update public.equipment set status = 'damaged', note = 'Padol' where id = $1`, [mixer])
    const [extra] = await t.as('admin', `insert into public.equipment (company_id, name) values ($1, 'Na zmazanie') returning id`, [companyA])
    await t.as('admin', 'delete from public.equipment where id = $1', [extra.id])

    expect(await log(`where entity = 'equipment'`)).toEqual([
      { action: 'insert', entity: 'equipment', label: 'Mixpult', actor_name: 'Tomáš Technik', changed: null },
      { action: 'update', entity: 'equipment', label: 'Mixpult', actor_name: 'Tomáš Technik', changed: ['note', 'status'] },
      { action: 'insert', entity: 'equipment', label: 'Na zmazanie', actor_name: 'admin@example.com', changed: null },
      { action: 'delete', entity: 'equipment', label: 'Na zmazanie', actor_name: 'admin@example.com', changed: null },
    ])
  })

  it('skips updates that change nothing', async () => {
    const before = (await log()).length
    await t.as('technik', `update public.equipment set note = 'Padol' where id = $1`, [mixer])
    expect(await log()).toHaveLength(before)
  })

  it('labels other kinds of records by their natural name', async () => {
    await t.as('admin', `insert into public.vehicles (company_id, plate) values ($1, 'SP123AB')`, [companyA])
    await t.as('admin', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Festival', '2026-11-01', '2026-11-01')`, [
      companyA,
    ])
    const rows = await log(`where entity in ('vehicles', 'events')`)
    expect(rows.map((row) => [row.entity, row.label])).toEqual([
      ['vehicles', 'SP123AB'],
      ['events', 'Festival'],
    ])
  })

  it('is readable by the admin only and cannot be altered by anyone', async () => {
    expect(await t.as('technik', 'select 1 from public.audit_log')).toEqual([])
    expect(await t.as('outsider', 'select 1 from public.audit_log')).toEqual([])
    await expect(t.as('admin', 'delete from public.audit_log')).rejects.toThrow(/permission denied/)
    await expect(t.as('admin', `update public.audit_log set label = 'x'`)).rejects.toThrow(/permission denied/)
    await expect(
      t.as('admin', `insert into public.audit_log (company_id, action, entity) values ($1, 'insert', 'equipment')`, [companyA]),
    ).rejects.toThrow(/permission denied/)
  })

  it('does not block deleting a whole company', async () => {
    const [company] = await t.as('outsider', `select public.create_company('Dočasná') as id`)
    await t.as('outsider', `insert into public.equipment (company_id, name) values ($1, 'Vec')`, [company.id])
    await t.rows('delete from public.companies where id = $1', [company.id])
    expect(await t.rows('select 1 from public.audit_log where company_id = $1', [company.id])).toEqual([])
  })
})

describe('attachments', () => {
  it('belong to a company and disappear with the record they are attached to', async () => {
    const [record] = await t.as('technik', `insert into public.service_records (company_id, equipment_id) values ($1, $2) returning id`, [
      companyA,
      mixer,
    ])
    const attach = (user: string) =>
      t.as(user, `insert into public.attachments (company_id, entity_type, entity_id, name, path) values ($1, 'service', $2, 'Foto', 'p') returning id`, [
        companyA,
        record.id,
      ])
    expect(await attach('technik')).toHaveLength(1)
    await expect(attach('viewer')).rejects.toThrow(/row-level security/)
    await expect(attach('outsider')).rejects.toThrow(/row-level security/)
    expect(await t.as('viewer', 'select count(*)::int as n from public.attachments')).toEqual([{ n: 1 }])
    expect(await t.as('outsider', 'select 1 from public.attachments')).toEqual([])

    await t.as('admin', 'delete from public.service_records where id = $1', [record.id])
    expect(await t.rows('select 1 from public.attachments')).toEqual([])
  })

  it('reject unknown kinds of records', async () => {
    await expect(
      t.as('admin', `insert into public.attachments (company_id, entity_type, entity_id, name, path) values ($1, 'secret', $2, 'x', 'p')`, [
        companyA,
        mixer,
      ]),
    ).rejects.toThrow(/check constraint/)
  })
})
