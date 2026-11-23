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
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ukážkový koncert', current_date, current_date) returning id`, [a]))[0].id
})

describe('HF plán', () => {
  it('uloží len ten, kto upravuje akcie; hodnoty sa očistia', async () => {
    const channels = JSON.stringify([
      { id: 'c1', name: 'Spev 1', kind: 'mic', min_mhz: 606, max_mhz: 630, freq_mhz: 606.5, locked: true, extra: 'x' },
      { id: 'c2', name: 'IEM', kind: 'zlé', min_mhz: 'veľa', max_mhz: 99999, freq_mhz: 'abc' },
    ])
    const settings = JSON.stringify({ spacing_khz: 999999, imd3_khz: 80, fifth: true, hack: 1 })
    await expect(t.as('viewer', `select public.save_rf_plan($1, 0, $2::jsonb, $3::jsonb, '[38]'::jsonb)`, [event, channels, settings])).rejects.toThrow(/oprávnenie/)
    await expect(t.as('outsider', `select public.save_rf_plan($1, 0, $2::jsonb, $3::jsonb, '[38]'::jsonb)`, [event, channels, settings])).rejects.toThrow(/oprávnenie/)
    expect((await t.as('boss', `select public.save_rf_plan($1, 0, $2::jsonb, $3::jsonb, '[38, 38, 5, "x", 45]'::jsonb, 'Námestie', 'skenované') as v`, [event, channels, settings]))[0].v).toBe(1)
    const [row] = await t.as('viewer', `select channels, settings, excluded_tv, place from public.event_rf_plans where event_id = $1`, [event])
    expect(row.channels[0]).toEqual({ id: 'c1', name: 'Spev 1', kind: 'mic', equipment_id: null, min_mhz: 606, max_mhz: 630, freq_mhz: 606.5, locked: true })
    expect(row.channels[1]).toMatchObject({ kind: 'other', min_mhz: 470, max_mhz: 694, freq_mhz: null, locked: false })
    expect(row.settings).toEqual({ spacing_khz: 350, imd3_khz: 80, imd5_khz: 50, fifth: true, step_khz: 25 })
    expect(row.excluded_tv).toEqual([38, 45])
    expect(row.place).toBe('Námestie')
    expect(await t.as('outsider', `select event_id from public.event_rf_plans`)).toEqual([])
    await expect(t.as('boss', `select public.save_rf_plan($1, 0, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb)`, [event])).rejects.toThrow(/niekto iný/)
  })

  it('zdieľanie HF plánu', async () => {
    const [{ token }] = await t.as('boss', `select public.create_doc_share('rfplan', $1, 'Koordinátor') as token`, [event])
    const [{ data }] = await t.as(null, 'select public.get_shared_doc($1) as data', [token])
    expect([data.docType, data.data.channels.length, data.data.excluded_tv, data.data.place, data.data.settings.fifth]).toEqual(['rfplan', 2, [38, 45], 'Námestie', true])
  })
})
