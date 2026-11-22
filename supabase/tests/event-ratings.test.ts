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
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ukážková svadba', current_date - 2, current_date - 1) returning id`, [a]))[0].id
})

describe('hodnotenie od klienta', () => {
  it('odkazy na recenzie nastaví admin, von idú len bezpečné https', async () => {
    await t.as('boss', `update public.companies set review_links = '{"google":"https://g.page/r/ukazka/review","facebook":"javascript:alert(1)","web":"http://ukazka.sk"}' where id = $1`, [a])
    expect(await t.as('viewer', `update public.companies set review_links = '{}' where id = $1 returning id`, [a])).toEqual([])
  })

  it('odkaz vytvorí, kto upravuje eventy; klient raz ohodnotí', async () => {
    await expect(t.as('viewer', 'select public.create_event_rating($1)', [event])).rejects.toThrow(/oprávnenie/)
    await expect(t.as('outsider', 'select public.create_event_rating($1)', [event])).rejects.toThrow(/oprávnenie/)
    const token = (await t.as('boss', 'select public.create_event_rating($1) as token', [event]))[0].token
    expect((await t.as('boss', 'select public.create_event_rating($1) as token', [event]))[0].token).toBe(token)

    const data = (await t.as(null, 'select public.get_event_rating($1) as data', [token]))[0].data
    expect(data).toMatchObject({ event: 'Ukážková svadba', companyName: 'A', stars: null, links: { google: 'https://g.page/r/ukazka/review', facebook: '', web: '' } })

    await expect(t.as(null, `select public.rate_event($1, 6, '')`, [token])).rejects.toThrow(/hviezdičiek/)
    await t.as(null, `select public.rate_event($1, 5, ' Super zvuk ')`, [token])
    await expect(t.as(null, `select public.rate_event($1, 1, '')`, [token])).rejects.toThrow(/Už ste/)
    expect(await t.as('viewer', 'select stars, comment from public.event_ratings')).toEqual([{ stars: 5, comment: 'Super zvuk' }])
    expect(await t.as('outsider', 'select stars from public.event_ratings')).toEqual([])
    expect(await t.rows(`select title, body from public.notifications where title like 'Hodnotenie%'`)).toEqual([{ title: 'Hodnotenie ★★★★★: Ukážková svadba', body: 'Super zvuk' }])
  })

  it('tabuľku nikto nemení priamo', async () => {
    await expect(t.as('boss', 'update public.event_ratings set stars = 1')).rejects.toThrow(/permission/)
    await expect(t.as('boss', `insert into public.event_ratings (company_id, event_id) values ($1, $2)`, [a, event])).rejects.toThrow(/permission/)
  })

  it('logo firmy na stránke hodnotenia: len aktuálne logo firmy, ktorá hodnotenie používa', async () => {
    const b = (await t.as('outsider', `select id from public.companies where name = 'B'`))[0].id
    await t.rows(`update public.companies set logo_path = $2 where id = $1`, [a, `${a}/logo.png`])
    await t.rows(`update public.companies set logo_path = $2 where id = $1`, [b, `${b}/logo.png`])
    const token = (await t.as('boss', 'select public.create_event_rating($1) as token', [event]))[0].token
    const [{ data }] = await t.as(null, 'select public.get_event_rating($1) as data', [token])
    expect(data.logoPath).toBe(`${a}/logo.png`)
    const logo = async (path: string) => (await t.as(null, 'select public.is_rating_logo($1) as ok', [path]))[0].ok
    expect(await logo(`${a}/logo.png`)).toBe(true)
    // Iný súbor tej istej firmy ani logo firmy bez hodnotení nie.
    expect(await logo(`${a}/ine.png`)).toBe(false)
    expect(await logo(`${b}/logo.png`)).toBe(false)
    expect(await logo('')).toBe(false)
  })
})
