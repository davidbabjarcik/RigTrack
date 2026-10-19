// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let company: string
let loan: string
const PNG = 'data:image/png;base64,iVBORw0KGgo='

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'viewer']) await t.signUp(name, `${name}@example.com`)
  company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [company, t.users.viewer])
  const mixer = (await t.as('admin', `insert into public.equipment (company_id, name) values ($1, 'Pult') returning id`, [company]))[0].id
  loan = (
    await t.as('admin', 'select public.create_loan($1, $2::jsonb, $3::jsonb) as id', [
      company,
      JSON.stringify({ borrower: 'Klient', starts_on: '2026-11-01', ends_on: '2026-11-02' }),
      JSON.stringify([{ equipment_id: mixer, quantity: 1 }]),
    ])
  )[0].id
})

describe('loan signatures', () => {
  it('stores one signature per slot, readable by viewers, writable by editors', async () => {
    const insert = (user: string, role: string, image = PNG) =>
      t.as(user, `insert into public.loan_signatures (company_id, loan_id, phase, role, signer_name, image) values ($1, $2, 'issue', $3, 'Ján', $4) returning signed_by`, [company, loan, role, image])
    expect((await insert('admin', 'borrower'))[0].signed_by).toBe(t.users.admin)
    await expect(insert('admin', 'borrower')).rejects.toThrow(/duplicate key/)
    await expect(insert('admin', 'lender', 'javascript:alert(1)')).rejects.toThrow(/check constraint/)
    await expect(insert('viewer', 'lender')).rejects.toThrow(/row-level security/)
    expect(await t.as('viewer', 'select role, signer_name from public.loan_signatures')).toEqual([{ role: 'borrower', signer_name: 'Ján' }])
  })
})
