// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let jef: string
let cvr: string
let partner: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'cvr', 'viewer']) await t.signUp(name, `${name}@example.com`)
  jef = (await t.as('boss', `select public.create_company('Firma A') as id`))[0].id
  cvr = (await t.as('cvr', `select public.create_company('Zvuk Plus') as id`))[0].id
  await t.rows(`insert into public.company_profile (company_id, legal_name, ico) values ($1, 'Ukážka s.r.o.', '12 345 678')`, [cvr])
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [jef, t.users.viewer])
  partner = (await t.as('boss', `insert into public.partners (company_id, name, legal_name, ic_dph, ceo) values ($1, 'ZP', 'Ukážka s.r.o.', 'SK2020', 'Ján') returning id`, [jef]))[0].id
})

describe('partner details and linking', () => {
  it('finds an existing RigTrack company by IČO, name or legal name', async () => {
    expect(await t.as('boss', `select name from public.find_rigtrack_companies('12345678', '')`)).toEqual([{ name: 'Zvuk Plus' }])
    expect(await t.as('boss', `select name from public.find_rigtrack_companies('', 'zvuk plus')`)).toEqual([{ name: 'Zvuk Plus' }])
    expect(await t.as('boss', `select name from public.find_rigtrack_companies('', 'ZP', 'Ukážka s.r.o.')`)).toEqual([{ name: 'Zvuk Plus' }])
    expect(await t.as('boss', `select name from public.find_rigtrack_companies('123', 'Niekto')`)).toEqual([])
  })

  it('links and unlinks the partner only for event editors', async () => {
    await t.as('boss', 'select public.link_partner_company($1, $2)', [partner, cvr])
    expect(await t.as('boss', 'select linked_company_id, uses_app from public.partners where id = $1', [partner])).toEqual([{ linked_company_id: cvr, uses_app: true }])
    await expect(t.as('viewer', 'select public.link_partner_company($1, null)', [partner])).rejects.toThrow(/oprávnenie/)
    await t.as('boss', 'select public.link_partner_company($1, null)', [partner])
    expect(await t.as('boss', 'select linked_company_id from public.partners where id = $1', [partner])).toEqual([{ linked_company_id: null }])
  })

  it('stores contact birth date', async () => {
    await t.as('boss', `insert into public.partner_contacts (company_id, partner_id, name, birth_date) values ($1, $2, 'Peter', '1990-05-01')`, [jef, partner])
    await t.as('boss', `update public.partner_contacts set birth_date = '1991-06-02', name = 'Peter K.' where partner_id = $1`, [partner])
    expect(await t.as('boss', `select name, birth_date::text as b from public.partner_contacts where partner_id = $1`, [partner])).toEqual([{ name: 'Peter K.', b: '1991-06-02' }])
  })
})

describe('founding a partner company', () => {
  it('copies legal name, IČ DPH and CEO into the new company profile', async () => {
    const other = (await t.as('boss', `insert into public.partners (company_id, name, legal_name, ic_dph, ceo, ico) values ($1, 'Nová', 'Nová s.r.o.', 'SK1', 'Eva', '999') returning id`, [jef]))[0].id
    const id = (await t.as('boss', 'select public.create_partner_company($1) as id', [other]))[0].id
    expect(await t.as('boss', 'select legal_name, ic_dph, ceo_name from public.company_profile where company_id = $1', [id])).toEqual([{ legal_name: 'Nová s.r.o.', ic_dph: 'SK1', ceo_name: 'Eva' }])
  })
})

describe('push trigger without vault', () => {
  it('keeps inserting notifications and reports missing setup', async () => {
    await t.rows(`insert into public.notifications (user_id, title) values ($1, 'Test')`, [t.users.boss])
    expect(await t.as('boss', 'select * from public.push_setup_status()')).toEqual([{ has_pg_net: false, has_url: false, has_secret: false }])
  })
})
