// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let jef: string
let led: string
let other: string
let link: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['jefAdmin', 'jefTech', 'ledAdmin', 'stranger']) await t.signUp(name, `${name}@example.com`)
  jef = (await t.as('jefAdmin', `select public.create_company('JEF') as id`))[0].id
  led = (await t.as('ledAdmin', `select public.create_company('LED Rent') as id`))[0].id
  other = (await t.as('stranger', `select public.create_company('Cudzia') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik')`, [jef, t.users.jefTech])
  await t.as('ledAdmin', `insert into public.equipment (company_id, name, quantity, attributes, note) values ($1, 'Absen PL3.9', 120, '{"ledPanel": {"widthMm": 500}}', 'tajné')`, [led])
  await t.as('ledAdmin', `insert into public.partners (company_id, name, shared) values ($1, 'Mesto Košice', true), ($1, 'Interný klient', false)`, [led])
})

describe('company links', () => {
  it('links two companies by code after the other admin accepts', async () => {
    const code = (await t.as('ledAdmin', 'select public.my_link_code($1) as code', [led]))[0].code
    await expect(t.as('jefTech', 'select public.request_company_link($1, $2)', [jef, code])).rejects.toThrow(/admin/)
    expect(await t.as('jefAdmin', 'select public.request_company_link($1, $2) as name', [jef, code.toLowerCase()])).toEqual([{ name: 'LED Rent' }])
    const rows = await t.as('ledAdmin', 'select link_id, name, status, incoming from public.linked_companies($1)', [led])
    expect(rows).toMatchObject([{ name: 'JEF', status: 'pending', incoming: true }])
    link = rows[0].link_id
    await expect(t.as('jefAdmin', 'select public.accept_company_link($1)', [link])).rejects.toThrow(/potvrdiť/)
    await t.as('ledAdmin', 'select public.accept_company_link($1)', [link])
    expect(await t.as('jefTech', 'select name, status from public.linked_companies($1)', [jef])).toEqual([{ name: 'LED Rent', status: 'accepted' }])
  })

  it('shows equipment and shared contacts only when the other side shares them', async () => {
    expect(await t.as('jefTech', 'select name from public.linked_equipment($1)', [jef])).toEqual([])
    await t.as('ledAdmin', 'select public.set_link_sharing($1, $2, true, true)', [link, led])
    expect(await t.as('jefTech', 'select company_name, name, quantity from public.linked_equipment($1)', [jef])).toEqual([{ company_name: 'LED Rent', name: 'Absen PL3.9', quantity: 120 }])
    // LED nevidí techniku JEF, kým ju JEF nezdieľa.
    expect(await t.as('ledAdmin', 'select name from public.linked_equipment($1)', [led])).toEqual([])
    expect(await t.as('jefTech', 'select name from public.linked_partners($1)', [jef])).toEqual([{ name: 'Mesto Košice' }])
    expect(await t.as('stranger', 'select name from public.linked_equipment($1)', [other])).toEqual([])
  })

  it('shares an event with a linked company and each side writes its part', async () => {
    const event = (await t.as('jefTech', `insert into public.events (company_id, name, starts_on, ends_on, venue) values ($1, 'Festival', '2026-07-01', '2026-07-02', 'Námestie') returning id`, [jef]))[0].id
    await t.as('jefTech', `insert into public.event_shares (company_id, event_id, partner_company, owner_part) values ($1, $2, $3, 'zvuk a svetlo')`, [jef, event, led])
    await expect(t.as('jefTech', `insert into public.event_shares (company_id, event_id, partner_company) values ($1, $2, $3)`, [jef, event, other])).rejects.toThrow(/row-level security/)
    await t.as('ledAdmin', `select public.set_partner_part($1, $2, 'LED stena 6×3,5 m')`, [event, led])
    expect(await t.as('ledAdmin', 'select owner_name, name, owner_part, partner_part from public.shared_events($1)', [led])).toEqual([
      { owner_name: 'JEF', name: 'Festival', owner_part: 'zvuk a svetlo', partner_part: 'LED stena 6×3,5 m' },
    ])
    expect(await t.as('stranger', 'select * from public.shared_events($1)', [other])).toEqual([])
  })
})
