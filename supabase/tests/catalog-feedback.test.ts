// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let b: string
let k2: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['dev', 'bossA', 'bossB', 'viewer']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('bossA', `select public.create_company('Firma A') as id`))[0].id
  b = (await t.as('bossB', `select public.create_company('Firma B') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
  await t.rows('insert into public.app_developers (user_id) values ($1)', [t.users.dev])
  k2 = (await t.as('viewer', `select id from public.equipment_catalog where manufacturer = 'L-Acoustics' and model = 'K2'`))[0].id
})

const feedback = (user: string, company: string, type: string, attributes = '{}') =>
  t.as(user, `select public.submit_catalog_feedback($1, $2, $3, $4::jsonb) as id`, [company, k2, type, attributes]).then((rows) => rows[0].id as string | null)

describe('catalog feedback (0165)', () => {
  it('takes confirmations and corrections only from editors, one pending per company', async () => {
    await expect(feedback('viewer', a, 'confirm')).rejects.toThrow(/Not allowed/)
    await expect(feedback('bossA', a, 'other')).rejects.toThrow(/Invalid entry/)
    const first = await feedback('bossA', a, 'confirm')
    expect(await feedback('bossA', a, 'confirm')).toBe(first)
    await feedback('bossB', b, 'confirm')
    // Prázdna zmena sa neposiela.
    expect(await feedback('bossA', a, 'correction', '{}')).toBeNull()
    await feedback('bossA', a, 'correction', '{"weightKg": 57}')
    // Nové modely (0146) sa s potvrdeniami nemiešajú.
    expect(await t.as('dev', 'select * from public.catalog_review_queue()')).toEqual([])
  })

  it('shows the developer one confirmation row with the number of companies and each correction', async () => {
    await expect(t.as('bossA', 'select * from public.catalog_feedback_queue()')).rejects.toThrow(/Not allowed/)
    const queue = await t.as('dev', 'select type, companies::int as companies, attributes from public.catalog_feedback_queue() order by type')
    expect(queue).toEqual([
      { type: 'confirm', companies: 2, attributes: {} },
      { type: 'correction', companies: 1, attributes: { weightKg: 57 } },
    ])
  })

  it('accepting a correction merges it into the model and verifies it; confirmations close together', async () => {
    const [correction] = await t.as('dev', `select id from public.catalog_feedback_queue() where type = 'correction'`)
    await expect(t.as('bossA', 'select public.resolve_catalog_feedback($1, true)', [correction.id])).rejects.toThrow(/Not allowed/)
    await t.as('dev', 'select public.resolve_catalog_feedback($1, true)', [correction.id])
    const [entry] = await t.as('viewer', `select attributes->>'weightKg' as weight, attributes->>'audioType' as type, verified from public.equipment_catalog where id = $1`, [k2])
    expect(entry).toEqual({ weight: '57', type: 'line_array', verified: true })
    const [confirm] = await t.as('dev', `select id from public.catalog_feedback_queue() where type = 'confirm'`)
    await t.as('dev', 'select public.resolve_catalog_feedback($1, false)', [confirm.id])
    expect(await t.as('dev', 'select * from public.catalog_feedback_queue()')).toEqual([])
    // Overený model sa už nepotvrdzuje.
    expect(await feedback('bossA', a, 'confirm')).toBeNull()
  })

  it('counts companies and pieces using a model, only for the developer', async () => {
    await t.as('bossA', `insert into public.equipment (company_id, name, kind, manufacturer, model, quantity) values ($1, 'K2', 'audio', 'L-Acoustics', 'k2 ', 12)`, [a])
    await t.as('bossB', `insert into public.equipment (company_id, name, kind, manufacturer, model, quantity) values ($1, 'K2', 'audio', 'l-acoustics', 'K2', 6)`, [b])
    await expect(t.as('bossA', 'select * from public.catalog_usage()')).rejects.toThrow(/Not allowed/)
    expect(await t.as('dev', 'select companies::int as companies, pieces::int as pieces from public.catalog_usage() where catalog_id = $1', [k2])).toEqual([{ companies: 2, pieces: 18 }])
  })
})
