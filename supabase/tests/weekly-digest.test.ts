import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string

type Digest = { email: string; company: string; events: { name: string }[]; invoices: { number: string }[]; tasks: { title: string }[] }
const digest = async () => (await t.rows('select public.weekly_digest() as d'))[0].d as Digest[]
const of = (rows: Digest[], email: string) => rows.find((row) => row.email === email)

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer', 'quiet', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('Ukážková firma') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const name of ['viewer', 'quiet']) await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users[name]])
  await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ukážkový festival', current_date + 3, current_date + 4), ($1, 'O mesiac', current_date + 30, current_date + 30)`, [a])
  await t.as(
    'boss',
    `insert into public.invoices (company_id, kind, issuer, client, lines, issued_on, delivered_on, due_on, total_net, total_vat, total)
     values ($1, 'final', '{"name":"Ukážková s.r.o."}', '{"name":"Ukážkový klient"}', '[{"label":"Ozvučenie","quantity":1,"unitPrice":100,"vatRate":0}]', current_date - 30, current_date - 30, current_date - 30, 100, 0, 100)`,
    [a],
  )
  await t.as('boss', `insert into public.tasks (company_id, title, due_on, assignee_ids) values ($1, 'Ukážková úloha', current_date + 2, array[$2::uuid])`, [a, t.users.viewer])
})

describe('týždenný e-mail', () => {
  it('len kto si ho zapol, obsah podľa oprávnení', async () => {
    expect(await digest()).toEqual([])
    for (const name of ['boss', 'viewer', 'outsider']) {
      await t.as(name, `insert into public.notification_prefs (company_id, email_weekly) select company_id, true from public.company_members where user_id = auth.uid()`)
    }
    const rows = await digest()
    const boss = of(rows, 'boss@example.com')!
    expect(boss.company).toBe('Ukážková firma')
    expect(boss.events.map((event) => event.name)).toEqual(['Ukážkový festival'])
    expect(boss.invoices).toHaveLength(1)
    // Viewer nevidí faktúry, ale má svoju úlohu a akcie.
    const viewer = of(rows, 'viewer@example.com')!
    expect(viewer.invoices).toEqual([])
    expect(viewer.tasks.map((task) => task.title)).toEqual(['Ukážková úloha'])
    // Kto si e-mail nezapol alebo nemá čo čítať, nedostane nič.
    expect(of(rows, 'quiet@example.com')).toBeUndefined()
    expect(of(rows, 'outsider@example.com')).toBeUndefined()
  })

  it('prihlásený ani anonym podklady nezíska', async () => {
    await expect(t.as('boss', 'select public.weekly_digest()')).rejects.toThrow(/permission/)
    await expect(t.as(null, 'select public.weekly_digest()')).rejects.toThrow(/permission/)
    await expect(t.as('boss', 'select public.send_weekly_digest()')).rejects.toThrow(/permission/)
  })

  it('e-mail ide len vlastnou voľbou (cudziu nikto nezapne)', async () => {
    await t.as('viewer', `update public.notification_prefs set email_weekly = true where user_id = $1`, [t.users.quiet])
    expect(of(await digest(), 'quiet@example.com')).toBeUndefined()
  })
})
