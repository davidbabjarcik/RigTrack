// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let event: string

beforeAll(async () => {
  t = await createTestDb()
  await t.signUp('boss', 'boss@example.com')
  await t.signUp('other', 'other@example.com')
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Koncert', current_date, current_date) returning id`, [a]))[0].id
})

describe('patch templates and DMX patch', () => {
  it('stores templates of sound and DMX patch lists', async () => {
    await t.as('boss', `insert into public.patch_templates (company_id, kind, name, lines) values ($1, 'sound', 'Kapela', '[{"channel":1,"name":"Kick"}]')`, [a])
    expect(await t.as('boss', 'select kind, name, jsonb_array_length(lines) as n from public.patch_templates')).toEqual([{ kind: 'sound', name: 'Kapela', n: 1 }])
    expect(await t.as('other', 'select 1 from public.patch_templates')).toEqual([])
  })

  it('stores a DMX patch list of an event', async () => {
    await t.as('boss', `insert into public.event_dmx_patch (company_id, event_id, universe, address, channels, name, mode) values ($1, $2, '1', 17, 16, 'Beam #2', 'Basic')`, [a, event])
    expect(await t.as('boss', 'select universe, address, channels, name from public.event_dmx_patch')).toEqual([{ universe: '1', address: 17, channels: 16, name: 'Beam #2' }])
    await expect(t.as('boss', `insert into public.event_dmx_patch (company_id, event_id, address) values ($1, $2, 600)`, [a, event])).rejects.toThrow()
  })
})
