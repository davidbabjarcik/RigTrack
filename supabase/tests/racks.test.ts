import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let b: string
let rack: string
let amp: string
let foreignAmp: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'tech', 'viewer', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  b = (await t.as('outsider', `select public.create_company('B') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik'), ($1, $3, 'viewer')`, [a, t.users.tech, t.users.viewer])
  amp = (await t.as('boss', `insert into public.equipment (company_id, name, kind, quantity) values ($1, 'Ukážkový zosilňovač', 'audio', 2) returning id`, [a]))[0].id
  foreignAmp = (await t.as('outsider', `insert into public.equipment (company_id, name, kind) values ($1, 'Cudzí', 'audio') returning id`, [b]))[0].id
})

describe('racky', () => {
  it('založí ten, kto upravuje racky; viewer len vidí; cudzí nič', async () => {
    rack = (await t.as('tech', `insert into public.rack_designs (company_id, name, units, depth_mm) values ($1, 'Ukážkový FOH rack', 12, 500) returning id`, [a]))[0].id
    await expect(t.as('viewer', `insert into public.rack_designs (company_id, name) values ($1, 'X')`, [a])).rejects.toThrow(/row-level/)
    expect(await t.as('viewer', 'select name from public.rack_designs')).toEqual([{ name: 'Ukážkový FOH rack' }])
    expect(await t.as('outsider', 'select name from public.rack_designs')).toEqual([])
    await expect(t.as('outsider', `insert into public.rack_designs (company_id, name) values ($1, 'X')`, [a])).rejects.toThrow(/row-level/)
  })

  it('osadenie sa ukladá naraz s novou verziou a snímkou; cudzia technika sa zahodí', async () => {
    const slots = JSON.stringify([
      { side: 'front', bottomU: 1, heightU: 2, equipmentId: amp, unit: 1, weightKg: 12.5, powerW: 800 },
      { side: 'front', bottomU: 3, heightU: 1, accessory: 'blank' },
      { side: 'rear', bottomU: 1, heightU: 1, equipmentId: foreignAmp, label: 'Cudzí' },
    ])
    const [{ v }] = await t.as('tech', 'select public.save_rack($1, 1, $2::jsonb) as v', [rack, slots])
    expect(v).toBe(2)
    const stored = await t.as('viewer', 'select bottom_u, equipment_id, unit, accessory, label from public.rack_slots order by sort')
    expect(stored).toEqual([
      { bottom_u: 1, equipment_id: amp, unit: 1, accessory: null, label: '' },
      { bottom_u: 3, equipment_id: null, unit: null, accessory: 'blank', label: '' },
      { bottom_u: 1, equipment_id: null, unit: null, accessory: null, label: 'Cudzí' },
    ])
    const [{ n }] = await t.as('viewer', `select jsonb_array_length(data -> 'slots') as n from public.doc_versions where doc_id = $1 and version = 2`, [rack])
    expect(n).toBe(3)
  })

  it('stará verzia neprepíše novšiu; viewer a cudzí neuložia', async () => {
    await expect(t.as('tech', `select public.save_rack($1, 1, '[]'::jsonb)`, [rack])).rejects.toThrow(/niekto iný/)
    await expect(t.as('viewer', `select public.save_rack($1, 2, '[]'::jsonb)`, [rack])).rejects.toThrow(/oprávnenie/)
    await expect(t.as('outsider', `select public.save_rack($1, 2, '[]'::jsonb)`, [rack])).rejects.toThrow(/oprávnenie/)
  })

  it('osadenie ani verzie sa nemenia priamo, len cez uloženie', async () => {
    await expect(t.as('tech', `insert into public.rack_slots (company_id, rack_id, bottom_u) values ($1, $2, 5)`, [a, rack])).rejects.toThrow(/permission/)
    await expect(t.as('tech', `insert into public.doc_versions (company_id, doc_type, doc_id, version, data) values ($1, 'rack', $2, 9, '{}')`, [a, rack])).rejects.toThrow(/permission/)
    await expect(t.as('tech', 'update public.rack_designs set version = 99 where id = $1', [rack])).rejects.toThrow(/permission/)
  })

  it('zmazať smie skladník / admin, nie technik', async () => {
    expect(await t.as('tech', 'delete from public.rack_designs where id = $1 returning id', [rack])).toEqual([])
    expect(await t.as('boss', 'delete from public.rack_designs where id = $1 returning id', [rack])).toHaveLength(1)
    expect(await t.rows('select count(*)::int as n from public.rack_slots')).toEqual([{ n: 0 }])
  })
})
