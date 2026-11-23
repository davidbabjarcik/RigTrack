import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let rack: string
let amp: string
let event: string
let foreignEvent: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  const b = (await t.as('outsider', `select public.create_company('B') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
  amp = (await t.as('boss', `insert into public.equipment (company_id, name, kind, quantity) values ($1, 'Ukážkový zosilňovač', 'audio', 3) returning id`, [a]))[0].id
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ukážková svadba', current_date + 5, current_date + 5) returning id`, [a]))[0].id
  foreignEvent = (await t.as('outsider', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Cudzia', current_date, current_date) returning id`, [b]))[0].id
  rack = (await t.as('boss', `insert into public.rack_designs (company_id, name, units) values ($1, 'Ukážkový amp rack', 6) returning id`, [a]))[0].id
  const slots = JSON.stringify([
    { bottomU: 1, heightU: 2, equipmentId: amp },
    { bottomU: 3, heightU: 2, equipmentId: amp },
    { bottomU: 5, accessory: 'blank' },
  ])
  await t.as('boss', 'select public.save_rack($1, 1, $2::jsonb)', [rack, slots])
})

describe('šablóny rackov a akcia', () => {
  it('uloženie ako šablóna skopíruje osadenie (verzia 1, bez akcie)', async () => {
    const [{ id }] = await t.as('boss', `select public.copy_rack($1, 'Amp rack 2× zosilňovač', true) as id`, [rack])
    const [copy] = await t.as('boss', 'select name, is_template, event_id, version from public.rack_designs where id = $1', [id])
    expect(copy).toEqual({ name: 'Amp rack 2× zosilňovač', is_template: true, event_id: null, version: 1 })
    expect((await t.as('boss', 'select count(*)::int as n from public.rack_slots where rack_id = $1', [id]))[0].n).toBe(3)
    expect((await t.as('boss', `select count(*)::int as n from public.doc_versions where doc_id = $1 and version = 1`, [id]))[0].n).toBe(1)
  })

  it('vloženie do akcie pridá kusy do techniky akcie (rezervácia)', async () => {
    const [{ id }] = await t.as('boss', `select public.copy_rack($1, '', false, $2) as id`, [rack, event])
    expect((await t.as('boss', 'select event_id from public.rack_designs where id = $1', [id]))[0].event_id).toBe(event)
    expect(await t.as('boss', 'select equipment_id, quantity from public.event_equipment where event_id = $1', [event])).toEqual([{ equipment_id: amp, quantity: 2 }])
    // Opakovane nič nezdvojí.
    await t.as('boss', 'select public.rack_to_event($1)', [id])
    expect(await t.as('boss', 'select quantity from public.event_equipment where event_id = $1', [event])).toEqual([{ quantity: 2 }])
  })

  it('cudzia akcia ani bez oprávnenia nie', async () => {
    await expect(t.as('boss', `select public.copy_rack($1, 'X', false, $2)`, [rack, foreignEvent])).rejects.toThrow(/Akcia neexistuje/)
    await expect(t.as('viewer', `select public.copy_rack($1, 'X', true)`, [rack])).rejects.toThrow(/oprávnenie/)
    await expect(t.as('outsider', `select public.copy_rack($1, 'X', true)`, [rack])).rejects.toThrow(/oprávnenie/)
    await expect(t.as('viewer', 'select public.rack_to_event($1)', [rack])).rejects.toThrow(/oprávnenie/)
    await expect(t.as('boss', 'select public.rack_to_event($1)', [rack])).rejects.toThrow(/nie je priradený/)
  })
})
