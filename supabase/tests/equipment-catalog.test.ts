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

  it('has Global Truss 2023 (0154 replaces the US catalogue), JBL 2026 and Shure wireless entries (0151, 0154)', async () => {
    expect(await t.as('viewer', `select model from public.equipment_catalog where model = 'F34 – 2 m (SQ-4112)'`)).toEqual([])
    const [gt] = await t.as('viewer', `select attributes from public.equipment_catalog where kind = 'truss' and manufacturer = 'Global Truss' and model = 'F34 – 2 m (F34200)'`)
    expect(gt.attributes).toMatchObject({ trussType: 'point4', lengthM: 2, weightKg: 12 })
    const [rcf] = await t.as('viewer', `select attributes from public.equipment_catalog where manufacturer = 'RCF' and model = 'HDL 30-A'`)
    expect(rcf.attributes).toMatchObject({ audioType: 'line_array', powered: 'active', peakW: 2200, weightKg: 25 })
    const [k2] = await t.as('viewer', `select attributes from public.equipment_catalog where manufacturer = 'L-Acoustics' and model = 'K2'`)
    expect(k2.attributes.compatibleAmps).toEqual([{ model: 'LA12X', perOutput: 3, total: 3 }, { model: 'LA7.16', perOutput: 1, total: 4, note: 'aj LA7.16i' }, { model: 'LA4X', perOutput: 1, total: 1 }])
    const [eon] = await t.as('viewer', `select attributes from public.equipment_catalog where manufacturer = 'JBL' and model = 'EON715'`)
    expect(eon.attributes).toMatchObject({ powered: 'active', peakW: 1300 })
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
    // Schválený návrh je overený (0153).
    const [approved] = await t.as('viewer', `select verified, verified_by from public.equipment_catalog where manufacturer = 'Ukážka Audio'`)
    expect(approved).toEqual({ verified: true, verified_by: t.users.dev })
  })

  it('lets only a developer edit a model, its data and verification (0156)', async () => {
    const [row] = await t.as('viewer', `select id from public.equipment_catalog where manufacturer = 'TAF' and model = 'FT34-200'`)
    const edit = (user: string, model: string, verified = true) =>
      t.as(user, `select public.update_catalog_entry($1, 'truss', 'TAF', $2, '{"lengthM": 2, "weightKg": 11}'::jsonb, $3)`, [row.id, model, verified])
    await expect(edit('bossA', 'FT34-200')).rejects.toThrow(/Not allowed/)
    await expect(edit('dev', 'FT34-250')).rejects.toThrow(/Duplicate model/)
    await edit('dev', 'FT34-200')
    const [after] = await t.as('viewer', `select attributes, verified, verified_by from public.equipment_catalog where id = $1`, [row.id])
    expect(after).toEqual({ attributes: { lengthM: 2, weightKg: 11 }, verified: true, verified_by: t.users.dev })
    await edit('dev', 'FT34-200', false)
    const [undone] = await t.as('viewer', `select verified, verified_by from public.equipment_catalog where id = $1`, [row.id])
    expect(undone).toEqual({ verified: false, verified_by: null })
  })

  it('starts unverified and only a developer verifies (0153)', async () => {
    const [{ n }] = await t.as('viewer', `select count(*)::int as n from public.equipment_catalog where verified and manufacturer <> 'Ukážka Audio'`)
    expect(n).toBe(0)
    const ids = (await t.as('viewer', `select id from public.equipment_catalog where manufacturer = 'TAF' order by model limit 3`)).map((row) => row.id as string)
    await expect(t.as('bossA', `select public.verify_catalog_entries($1::uuid[], true)`, [ids])).rejects.toThrow(/Not allowed/)
    const [{ changed }] = await t.as('dev', `select public.verify_catalog_entries($1::uuid[], true) as changed`, [ids])
    expect(changed).toBe(3)
    const [{ verified }] = await t.as('viewer', `select count(*)::int as verified from public.equipment_catalog where id = any($1::uuid[]) and verified`, [ids])
    expect(verified).toBe(3)
    const [{ undone }] = await t.as('dev', `select public.verify_catalog_entries($1::uuid[], false) as undone`, [ids.slice(0, 1)])
    expect(undone).toBe(1)
  })

  it('rejects all pending suggestions of the same model with a note', async () => {
    await submit('bossA', a, 'Ukážka Svetlá', 'US-2')
    const [{ id }] = await t.as('dev', 'select id from public.catalog_review_queue()')
    await t.as('dev', `select public.reject_catalog_entry($1, 'Duplicita')`, [id])
    expect(await t.as('bossA', `select status, review_note from public.equipment_catalog_submissions where model = 'US-2'`)).toEqual([{ status: 'rejected', review_note: 'Duplicita' }])
  })
})
