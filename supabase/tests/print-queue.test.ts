// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
})

describe('print queue and company prefs', () => {
  it('collects labels once per item and stays inside the company', async () => {
    const box = (await t.as('boss', `insert into public.cases (company_id, name) values ($1, 'Case 1') returning id`, [a]))[0].id
    await t.as('boss', `insert into public.print_queue (company_id, kind, target_id) values ($1, 'case', $2)`, [a, box])
    await expect(t.as('boss', `insert into public.print_queue (company_id, kind, target_id) values ($1, 'case', $2)`, [a, box])).rejects.toThrow(/duplicate|unique/)
    expect(await t.as('viewer', 'select kind from public.print_queue')).toEqual([{ kind: 'case' }])
    expect(await t.as('outsider', 'select * from public.print_queue')).toEqual([])
    await t.as('boss', `insert into public.print_queue (company_id, kind, target_id, label) values ($1, 'case', $2, 'case_label'), ($1, 'case', $2, 'content')`, [a, box])
    await expect(t.as('boss', `insert into public.print_queue (company_id, kind, target_id, label) values ($1, 'case', $2, 'poster')`, [a, box])).rejects.toThrow(/check/)
    await t.as('boss', 'delete from public.print_queue where company_id = $1', [a])
    expect(await t.as('boss', 'select count(*)::int as n from public.print_queue')).toEqual([{ n: 0 }])
  })

  it('lets only a lookups manager change the company prefs', async () => {
    await t.as('boss', `insert into public.company_prefs (company_id, prefs) values ($1, '{"qrTarget":"a4"}')`, [a])
    expect(await t.as('viewer', 'select prefs from public.company_prefs')).toEqual([{ prefs: { qrTarget: 'a4' } }])
    await expect(t.as('viewer', `update public.company_prefs set prefs = '{}' where company_id = $1 returning 1`, [a])).resolves.toEqual([])
    expect(await t.as('outsider', 'select * from public.company_prefs')).toEqual([])
  })

  it('remembers printed labels per company', async () => {
    const box = (await t.as('boss', `insert into public.cases (company_id, name) values ($1, 'Case 2') returning id`, [a]))[0].id
    await t.as('viewer', `insert into public.printed_labels (company_id, kind, target_id) values ($1, 'case', $2)`, [a, box])
    await expect(t.as('viewer', `insert into public.printed_labels (company_id, kind, target_id) values ($1, 'case', $2)`, [a, box])).rejects.toThrow(/duplicate|unique/)
    expect(await t.as('boss', 'select kind, label from public.printed_labels')).toEqual([{ kind: 'case', label: 'qr' }])
    expect(await t.as('outsider', 'select * from public.printed_labels')).toEqual([])
    await expect(t.as('outsider', `insert into public.printed_labels (company_id, kind, target_id) values ($1, 'case', $2)`, [a, box])).rejects.toThrow(/row-level/)
  })

  it('takes warehouse spot QR labels too', async () => {
    const spot = (await t.as('boss', `insert into public.warehouse_spots (company_id, name, x, y, length, width) values ($1, 'Regál A', 0, 0, 200, 80) returning id`, [a]))[0].id
    await t.as('viewer', `insert into public.print_queue (company_id, kind, target_id) values ($1, 'spot', $2)`, [a, spot])
    await t.as('viewer', `insert into public.printed_labels (company_id, kind, target_id) values ($1, 'spot', $2)`, [a, spot])
    expect(await t.as('boss', `select kind from public.print_queue where kind = 'spot'`)).toEqual([{ kind: 'spot' }])
  })

  it('takes an inventory poster', async () => {
    await t.as('viewer', `insert into public.print_queue (company_id, kind, target_id, label) values ($1, 'poster', $1, 'poster:truss')`, [a])
    expect(await t.as('boss', `select label from public.print_queue where kind = 'poster'`)).toEqual([{ label: 'poster:truss' }])
    await expect(t.as('viewer', `insert into public.print_queue (company_id, kind, target_id, label) values ($1, 'case', $1, 'poster:truss')`, [a])).rejects.toThrow(/check/)
  })

  it('takes event patch lists', async () => {
    const event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Koncert', current_date, current_date) returning id`, [a]))[0].id
    await t.as('viewer', `insert into public.print_queue (company_id, kind, target_id, label) values ($1, 'event', $2, 'patch'), ($1, 'event', $2, 'dmx')`, [a, event])
    expect(await t.as('boss', `select label from public.print_queue where kind = 'event' order by label`)).toEqual([{ label: 'dmx' }, { label: 'patch' }])
    await expect(t.as('viewer', `insert into public.print_queue (company_id, kind, target_id, label) values ($1, 'event', $2, 'poster:x')`, [a, event])).rejects.toThrow(/check/)
  })

  it('remembers the paper format', async () => {
    const box = (await t.as('boss', `insert into public.cases (company_id, name) values ($1, 'Case F') returning id`, [a]))[0].id
    await t.as('viewer', `insert into public.print_queue (company_id, kind, target_id, label, format) values ($1, 'case', $2, 'content', 'A5-landscape')`, [a, box])
    expect(await t.as('boss', `select format from public.print_queue where target_id = $1`, [box])).toEqual([{ format: 'A5-landscape' }])
    await expect(t.as('viewer', `insert into public.print_queue (company_id, kind, target_id, label, format) values ($1, 'case', $2, 'case_label', 'A3')`, [a, box])).rejects.toThrow(/check/)
  })

  it('takes network address tables', async () => {
    await t.as('viewer', `insert into public.print_queue (company_id, kind, target_id, label, format) values ($1, 'network', $1, 'ip', 'A4-landscape')`, [a])
    await expect(t.as('viewer', `insert into public.print_queue (company_id, kind, target_id, label) values ($1, 'network', $1, 'dmx')`, [a])).rejects.toThrow(/check/)
  })
})
