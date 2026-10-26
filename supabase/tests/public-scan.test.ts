// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let light: string

beforeAll(async () => {
  t = await createTestDb()
  await t.signUp('boss', 'boss@example.com')
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  light = (await t.as('boss', `insert into public.equipment (company_id, name) values ($1, 'Hlava') returning id`, [a]))[0].id
})

describe('public QR scan', () => {
  it('shows nothing to a stranger until the company turns it on', async () => {
    expect((await t.as(null, `select public.public_scan_info('equipment', $1) as info`, [light]))[0].info).toEqual({ enabled: false })
    await t.as('boss', `insert into public.company_profile (company_id, phone, public_scan) values ($1, '+421 900 000 000', true)`, [a])
    const info = (await t.as(null, `select public.public_scan_info('equipment', $1) as info`, [light]))[0].info
    expect(info).toMatchObject({ enabled: true, name: 'Hlava', company: 'A', phone: '+421 900 000 000' })
    await expect(t.as(null, 'select name from public.equipment')).rejects.toThrow()
  })
})
