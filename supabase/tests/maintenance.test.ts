// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let beam: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'tech', 'viewer', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik'), ($1, $3, 'viewer')`, [a, t.users.tech, t.users.viewer])
  beam = (await t.as('boss', `insert into public.equipment (company_id, name, kind) values ($1, 'Beam', 'light') returning id`, [a]))[0].id
})

const due = (who: string) => t.as(who, 'select rule_id, equipment_id, unit, state, used::float as used from public.maintenance_due($1)', [a])

describe('hour limits', () => {
  it('counts the hours since the last replacement', async () => {
    const rule = (await t.as('boss', `insert into public.maintenance_rules (company_id, kind, name, counter, limit_hours, warn_percent, kinds) values ($1, 'hours', 'Výbojka', 'Výbojka', 1000, 90, '{light}') returning id`, [a]))[0].id
    // Bez odčítania tohto počítadla sa svetlo nesleduje.
    expect(await due('boss')).toEqual([])
    await t.as('boss', `insert into public.equipment_hour_readings (company_id, equipment_id, read_on, hours, counter) values ($1, $2, current_date - 2, 950, 'Výbojka')`, [a, beam])
    expect((await due('boss'))[0]).toMatchObject({ rule_id: rule, state: 'soon', used: 950 })
    await t.as('boss', `insert into public.equipment_hour_readings (company_id, equipment_id, read_on, hours, counter) values ($1, $2, current_date - 1, 1010, 'Výbojka')`, [a, beam])
    expect((await due('boss'))[0]).toMatchObject({ state: 'overdue', used: 1010 })
    // Výmena pri stave 1010 – od teraz sa počíta odznova.
    await t.as('tech', `insert into public.maintenance_records (company_id, rule_id, equipment_id, hours) values ($1, $2, $3, 1010)`, [a, rule, beam])
    expect((await due('boss'))[0]).toMatchObject({ state: 'ok', used: 0 })
    await t.as('boss', `insert into public.equipment_hour_readings (company_id, equipment_id, read_on, hours, counter) values ($1, $2, current_date, 1110, 'Výbojka')`, [a, beam])
    expect((await due('viewer'))[0]).toMatchObject({ state: 'ok', used: 100 })
    expect(await due('outsider')).toEqual([])
  })

  it('lets only permitted people change rules and write records', async () => {
    await expect(t.as('tech', `insert into public.maintenance_rules (company_id, kind, name, interval_months) values ($1, 'revision', 'X', 12)`, [a])).rejects.toThrow(/row-level/)
    const rule = (await t.as('boss', 'select id from public.maintenance_rules limit 1'))[0].id
    await expect(t.as('viewer', `insert into public.maintenance_records (company_id, rule_id, equipment_id) values ($1, $2, $3)`, [a, rule, beam])).rejects.toThrow(/row-level/)
    expect(await t.as('tech', `update public.maintenance_rules set limit_hours = 1 returning id`)).toEqual([])
    const author = await t.as('boss', 'select distinct author_name, created_by = $1 as mine from public.maintenance_records', [t.users.tech])
    expect(author).toEqual([{ author_name: 'tech@example.com', mine: true }])
  })
})

describe('revisions', () => {
  it('follows the interval, the warning days and a failed revision', async () => {
    const cable = (await t.as('boss', `insert into public.equipment (company_id, name, kind, quantity, track_units) values ($1, 'Predlžovačka', 'cable', 2, true) returning id`, [a]))[0].id
    const rule = (await t.as('boss', `insert into public.maintenance_rules (company_id, kind, name, interval_months, warn_days, kinds) values ($1, 'revision', 'Elektro revízia', 12, 30, '{cable}') returning id`, [a]))[0].id
    const states = async () => (await due('boss')).filter((row) => row.rule_id === rule).map((row) => `${row.unit}:${row.state}`)
    expect(await states()).toEqual(['1:unknown', '2:unknown'])
    await t.as('tech', `insert into public.maintenance_records (company_id, rule_id, equipment_id, unit, done_on) values ($1, $2, $3, 1, current_date - interval '350 days')`, [a, rule, cable])
    await t.as('tech', `insert into public.maintenance_records (company_id, rule_id, equipment_id, unit, done_on, result) values ($1, $2, $3, 2, current_date, 'fail')`, [a, rule, cable])
    expect(await states()).toEqual(['1:soon', '2:failed'])
    // Revízia celej položky platí pre všetky kusy.
    await t.as('tech', `insert into public.maintenance_records (company_id, rule_id, equipment_id, done_on) values ($1, $2, $3, current_date + 1)`, [a, rule, cable])
    expect(await states()).toEqual(['1:ok', '2:ok'])
  })

  it('notifies once per new state and can create a task', async () => {
    await t.rows(`update public.maintenance_rules set create_task = true`)
    await t.rows(`update public.maintenance_records set done_on = current_date - interval '2 years' where unit = 1`)
    await t.rows(`delete from public.maintenance_records where unit is null and equipment_id <> $1`, [beam])
    const sent = Number((await t.rows('select public.remind_maintenance() as n'))[0].n)
    expect(sent).toBeGreaterThan(0)
    const titles = (await t.rows('select title from public.notifications where user_id = $1 order by title', [t.users.boss])).map((row) => row.title)
    expect(titles.some((title) => title.startsWith('Elektro revízia: 2 po termíne'))).toBe(true)
    expect(titles.some((title) => title.startsWith('Výbojka'))).toBe(false)
    expect((await t.rows(`select title from public.tasks where category = 'Servis'`)).map((row) => row.title)).toEqual(['Revízia: Elektro revízia – Predlžovačka'])
    // Druhý beh nič nové neposiela.
    expect(Number((await t.rows('select public.remind_maintenance() as n'))[0].n)).toBe(0)
  })
})
