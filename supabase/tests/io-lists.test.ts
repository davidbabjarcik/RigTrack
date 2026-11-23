import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let event: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ukážková svadba', current_date, current_date) returning id`, [a]))[0].id
})

describe('input / output listy', () => {
  it('kanál s insertom a farbou; outputy upravuje kto upravuje eventy', async () => {
    await t.as('boss', `insert into public.event_patch (company_id, event_id, channel, name, insert_note, color) values ($1, $2, 1, 'Kick', 'Gate', 'red')`, [a, event])
    await expect(t.as('boss', `insert into public.event_patch (company_id, event_id, channel, color) values ($1, $2, 2, 'pink')`, [a, event])).rejects.toThrow(/check/)
    await t.as('boss', `insert into public.event_outputs (company_id, event_id, number, name, kind, mix) values ($1, $2, 1, 'Wedge spevák', 'wedge', 'Mix 1')`, [a, event])
    await expect(t.as('viewer', `insert into public.event_outputs (company_id, event_id, number) values ($1, $2, 2)`, [a, event])).rejects.toThrow(/row-level/)
    expect(await t.as('viewer', 'select name from public.event_outputs')).toEqual([{ name: 'Wedge spevák' }])
    expect(await t.as('outsider', 'select name from public.event_outputs')).toEqual([])
  })

  it('verzia input / output listu so snímkou; viewer ju vidí, neuloží', async () => {
    const [{ v }] = await t.as('boss', 'select public.save_iolist_version($1) as v', [event])
    expect(v).toBe(1)
    const [{ inputs, outputs }] = await t.as('viewer', `select jsonb_array_length(data -> 'inputs') as inputs, jsonb_array_length(data -> 'outputs') as outputs from public.doc_versions where doc_type = 'iolist' and doc_id = $1`, [event])
    expect([inputs, outputs]).toEqual([1, 1])
    await expect(t.as('viewer', 'select public.save_iolist_version($1)', [event])).rejects.toThrow(/oprávnenie/)
    await expect(t.as('outsider', 'select public.save_iolist_version($1)', [event])).rejects.toThrow(/oprávnenie/)
    expect(await t.as('outsider', `select id from public.doc_versions`)).toEqual([])
  })
})
