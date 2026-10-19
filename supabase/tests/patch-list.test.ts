// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string
let event: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'technik', 'viewer', 'outsider']) await t.signUp(name, `${name}@example.com`)
  company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik'), ($1, $3, 'viewer')`, [company, t.users.technik, t.users.viewer])
  event = (await t.as('admin', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ples', '2026-11-01', '2026-11-01') returning id`, [company]))[0].id
})

describe('patch list', () => {
  it('stores channels editable by technicians and readable by viewers', async () => {
    await t.as('technik', `insert into public.event_patch (company_id, event_id, channel, name, stagebox, stagebox_input, source, connector, phantom) values ($1, $2, 1, 'Kick In', 'SB1', 1, 'mic', '', false), ($1, $2, 2, 'Klávesy L', 'SB1', 2, 'port', 'jack', false)`, [company, event])
    expect(await t.as('viewer', 'select channel, name, connector from public.event_patch order by channel')).toEqual([
      { channel: 1, name: 'Kick In', connector: '' },
      { channel: 2, name: 'Klávesy L', connector: 'jack' },
    ])
    await expect(t.as('viewer', `insert into public.event_patch (company_id, event_id, channel) values ($1, $2, 3)`, [company, event])).rejects.toThrow(/row-level security/)
    await expect(t.as('technik', `insert into public.event_patch (company_id, event_id, channel, connector) values ($1, $2, 3, 'speakon')`, [company, event])).rejects.toThrow(/check constraint/)
    expect(await t.as('outsider', 'select 1 from public.event_patch')).toEqual([])
  })
})
