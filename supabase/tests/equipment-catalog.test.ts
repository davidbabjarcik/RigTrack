// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let b: string

const submit = (user: string, company: string, maker: string, model: string, attributes = '{}') =>
  t.as(user, `select public.submit_catalog_entry($1, 'audio', $2, $3, 'Názov', $4::jsonb) as id`, [company, maker, model, attributes]).then((rows) => rows[0].id as string | null)

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['dev', 'bossA', 'bossB', 'viewer']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('bossA', `select public.create_company('Firma A') as id`))[0].id
  b = (await t.as('bossB', `select public.create_company('Firma B') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
  await t.rows('insert into public.app_developers (user_id) values ($1)', [t.users.dev])
})

describe('equipment catalog (0146)', () => {
  it('has datasheet specs (0147) and lights from Open Fixture Library (0148)', async () => {
    const [jbl] = await t.as('viewer', `select attributes from public.equipment_catalog where manufacturer = 'JBL' and model = 'VRX932LA-1'`)
    expect(jbl.attributes).toMatchObject({ audioType: 'line_array', rmsW: 800, impedanceOhm: 8 })
    const [{ n }] = await t.as('viewer', `select count(*)::int as n from public.equipment_catalog where kind = 'light' and attributes ? 'dmxModes'`)
    expect(n).toBeGreaterThan(600)
  })

  it('has TAF truss sections (0149) and Nivtec stage parts (0150)', async () => {
    const [taf] = await t.as('viewer', `select attributes from public.equipment_catalog where kind = 'truss' and manufacturer = 'TAF' and model = 'FT34-200'`)
    expect(taf.attributes).toMatchObject({ trussType: 'point4', trussShape: 'straight', lengthM: 2, weightKg: 10.8 })
    const [{ n }] = await t.as('viewer', `select count(*)::int as n from public.equipment_catalog where kind = 'stage' and manufacturer = 'Nivtec originál'`)
    expect(n).toBeGreaterThan(40)
  })

  it('has Global Truss, JBL 2026 and Shure wireless entries (0151)', async () => {
    const [gta] = await t.as('viewer', `select attributes from public.equipment_catalog where kind = 'truss' and model = 'F34 – 2 m (SQ-4112)'`)
    expect(gta.attributes).toMatchObject({ trussType: 'point4', lengthM: 2, weightKg: 13.17 })
    const [m22] = await t.as('viewer', `select attributes from public.equipment_catalog where manufacturer = 'JBL' and model = 'VTX M22'`)
    expect(m22.attributes).toMatchObject({ audioType: 'monitor', rmsW: 1500 })
    const [ulx] = await t.as('viewer', `select attributes from public.equipment_catalog where manufacturer = 'Shure' and model = 'ULXD4'`)
    expect(ulx.attributes).toMatchObject({ audioType: 'wireless', rfRange: 'VHF / UHF / 900 MHz, ladenie 64 MHz' })
    // 0152: výrobníky hmly sú pri svetlách
    const [haze] = await t.as('viewer', `select kind, attributes from public.equipment_catalog where manufacturer = 'MDG' and model = 'theONE'`)
    expect(haze).toMatchObject({ kind: 'light', attributes: { lightType: 'hazer' } })
  })

  it('is readable by everyone signed in and has seeded brands, but nobody writes it directly', async () => {
    const [{ n }] = await t.as('viewer', `select count(*)::int as n from public.equipment_catalog where manufacturer = 'JBL'`)
    expect(n).toBeGreaterThan(0)
    await expect(t.as('bossA', `insert into public.equipment_catalog (kind, manufacturer, model) values ('audio', 'X', 'Y')`)).rejects.toThrow(/permission denied/)
  })

  it('takes suggestions only from editors and skips models already in the catalog', async () => {
    await expect(submit('viewer', a, 'Ukážka Audio', 'UA-1')).rejects.toThrow(/Not allowed/)
    expect(await submit('bossA', a, 'JBL', 'srx835p')).toBeNull()
    const first = await submit('bossA', a, 'Ukážka Audio', 'UA-1', '{"powered": "active"}')
    // Rovnaký návrh tej istej firmy sa len aktualizuje.
    expect(await submit('bossA', a, 'ukážka audio', 'ua-1', '{"powered": "passive"}')).toBe(first)
    await submit('bossB', b, 'Ukážka Audio', 'UA-1')
    // Firma vidí len svoje návrhy, ostatné nie.
    expect(await t.as('bossB', 'select company_id from public.equipment_catalog_submissions')).toEqual([{ company_id: b }])
  })

  it('lets only a developer review: one row per model with the number of companies, approve closes all of them', async () => {
    await expect(t.as('bossA', 'select * from public.catalog_review_queue()')).rejects.toThrow(/Not allowed/)
    const queue = await t.as('dev', 'select id, manufacturer, model, companies::int as companies, attributes from public.catalog_review_queue()')
    expect(queue).toHaveLength(1)
    expect(queue[0]).toMatchObject({ manufacturer: 'Ukážka Audio', model: 'UA-1', companies: 2 })
    await expect(t.as('bossA', `select public.approve_catalog_entry($1, 'audio', 'X', 'Y', '{}')`, [queue[0].id])).rejects.toThrow(/Not allowed/)
    await t.as('dev', `select public.approve_catalog_entry($1, 'audio', 'Ukážka Audio', 'UA-1 Pro', '{"powered": "passive"}')`, [queue[0].id])
    expect(await t.as('dev', 'select * from public.catalog_review_queue()')).toEqual([])
    const [entry] = await t.as('viewer', `select model, attributes from public.equipment_catalog where manufacturer = 'Ukážka Audio'`)
    expect(entry).toEqual({ model: 'UA-1 Pro', attributes: { powered: 'passive' } })
    expect(await t.as('bossB', `select status from public.equipment_catalog_submissions`)).toEqual([{ status: 'approved' }])
  })

  it('rejects all pending suggestions of the same model with a note', async () => {
    await submit('bossA', a, 'Ukážka Svetlá', 'US-2')
    const [{ id }] = await t.as('dev', 'select id from public.catalog_review_queue()')
    await t.as('dev', `select public.reject_catalog_entry($1, 'Duplicita')`, [id])
    expect(await t.as('bossA', `select status, review_note from public.equipment_catalog_submissions where model = 'US-2'`)).toEqual([{ status: 'rejected', review_note: 'Duplicita' }])
  })
})
