import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
})

const invoice = (who: string, extra = '') =>
  t.as(
    who,
    `insert into public.invoices (company_id, kind, issuer, client, lines, issued_on, delivered_on, due_on, total_net, total_vat, total${extra ? ', note' : ''})
     values ($1, 'final', '{"name":"Ukážková s.r.o."}', '{"name":"Ukážkový klient"}', '[{"label":"Ozvučenie","quantity":1,"unitPrice":100,"vatRate":23}]', '2026-11-21', '2026-11-20', '2026-12-05', 100, 23, 123${extra ? ", $2" : ''})
     returning id, number, created_by`,
    extra ? [a, extra] : [a],
  )

describe('faktúry', () => {
  it('číslo v poradí za rok, vystavuje kto upravuje ponuky', async () => {
    const [first] = await invoice('boss')
    const [second] = await invoice('boss')
    expect(first.number).toBe('20260001')
    expect(second.number).toBe('20260002')
    expect(first.created_by).toBe(t.users.boss)
    await expect(invoice('viewer')).rejects.toThrow(/row-level/)
    await expect(t.as('outsider', `insert into public.invoices (company_id, issuer, client, lines, due_on, total_net, total_vat, total) values ($1, '{}', '{}', '[{}]', current_date, 0, 0, 0)`, [a])).rejects.toThrow(/row-level/)
    expect(await t.as('boss', 'select number from public.invoices order by number')).toEqual([{ number: '20260001' }, { number: '20260002' }])
    // Kto nevidí ponuky, nevidí ani faktúry.
    expect(await t.as('viewer', 'select number from public.invoices')).toEqual([])
    expect(await t.as('outsider', 'select number from public.invoices')).toEqual([])
  })

  it('vystavená sa nemení ani nemaže, len zaplatí alebo stornuje', async () => {
    const [row] = await invoice('boss')
    await expect(t.as('boss', 'update public.invoices set total = 1 where id = $1', [row.id])).rejects.toThrow(/permission/)
    await expect(t.as('boss', 'update public.invoices set number = $2 where id = $1', [row.id, 'X'])).rejects.toThrow(/permission/)
    await expect(t.as('boss', 'delete from public.invoices where id = $1', [row.id])).rejects.toThrow(/permission/)
    expect(await t.as('boss', `update public.invoices set paid_on = '2026-11-25' where id = $1 returning paid_on`, [row.id])).toHaveLength(1)
    expect(await t.as('viewer', `update public.invoices set paid_on = null where id = $1 returning id`, [row.id])).toEqual([])
    // Pri vystavení sa zaplatenie ani číslo nedá podstrčiť.
    await expect(t.as('boss', `insert into public.invoices (company_id, number, issuer, client, lines, due_on, total_net, total_vat, total) values ($1, '1', '{}', '{}', '[{}]', current_date, 0, 0, 0)`, [a])).rejects.toThrow(/permission/)
  })

  it('pripomienka po splatnosti raz', async () => {
    await t.rows(`update public.invoices set due_on = current_date - 1, issued_on = current_date - 20 where paid_on is null`)
    const first = Number((await t.rows('select public.remind_overdue_invoices() as n'))[0].n)
    expect(first).toBeGreaterThan(0)
    expect(Number((await t.rows('select public.remind_overdue_invoices() as n'))[0].n)).toBe(0)
    await expect(t.as('boss', 'select public.remind_overdue_invoices()')).rejects.toThrow(/permission/)
  })
})
