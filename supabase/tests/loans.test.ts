// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let mixer: string
let cables: string
let foreign: string

const createLoan = (user: string, company: string, starts: string, ends: string, items: object[]) =>
  t.as(user, 'select public.create_loan($1, $2::jsonb, $3::jsonb) as id', [
    company,
    JSON.stringify({ borrower: 'Klient s.r.o.', starts_on: starts, ends_on: ends }),
    JSON.stringify(items),
  ])
const statusOf = async (id: string) => (await t.as('viewer', 'select status from public.equipment where id = $1', [id]))[0].status

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik', 'technik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  const companyB = (await t.as('outsider', `select public.create_company('B') as id`))[0].id
  for (const role of ['skladnik', 'technik', 'viewer']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [
      companyA,
      t.users[role],
      role,
    ])
  }
  const add = async (user: string, company: string, name: string, quantity: number) =>
    (await t.as(user, 'insert into public.equipment (company_id, name, quantity) values ($1, $2, $3) returning id', [company, name, quantity]))[0].id
  mixer = await add('admin', companyA, 'Mixpult', 1)
  cables = await add('admin', companyA, 'XLR 5 m', 20)
  foreign = await add('outsider', companyB, 'Cudzí pult', 1)
})

describe('reservations', () => {
  it('creates a reservation with its items', async () => {
    const [loan] = await createLoan('technik', companyA, '2026-11-01', '2026-11-03', [
      { equipment_id: mixer, quantity: 1 },
      { equipment_id: cables, quantity: 15 },
    ])
    expect(await t.as('viewer', 'select status from public.loans where id = $1', [loan.id])).toEqual([{ status: 'reserved' }])
    expect(await t.as('viewer', 'select count(*)::int as n from public.loan_items where loan_id = $1', [loan.id])).toEqual([{ n: 2 }])
  })

  it('rejects an overlapping reservation and leaves nothing behind', async () => {
    await expect(createLoan('technik', companyA, '2026-11-03', '2026-11-05', [{ equipment_id: mixer, quantity: 1 }])).rejects.toThrow(
      /Mixpult.*nie je v tomto termíne voľná/,
    )
    // z 20 káblov je 15 rezervovaných: 5 sa zmestí, 6 nie
    await createLoan('technik', companyA, '2026-11-02', '2026-11-02', [{ equipment_id: cables, quantity: 5 }])
    await expect(createLoan('technik', companyA, '2026-11-02', '2026-11-02', [{ equipment_id: cables, quantity: 1 }])).rejects.toThrow(
      /voľné 0 z 20/,
    )
    expect(await t.rows('select count(*)::int as n from public.loans')).toEqual([{ n: 2 }])
  })

  it('allows the same equipment in a different term', async () => {
    await createLoan('technik', companyA, '2026-11-04', '2026-11-06', [{ equipment_id: mixer, quantity: 1 }])
  })

  it('rejects empty loans, reversed dates, retired and foreign equipment', async () => {
    await expect(createLoan('admin', companyA, '2026-12-01', '2026-12-02', [])).rejects.toThrow(/aspoň jednu položku/)
    await expect(createLoan('admin', companyA, '2026-12-05', '2026-12-01', [{ equipment_id: cables, quantity: 1 }])).rejects.toThrow(
      /check constraint/,
    )
    await expect(createLoan('admin', companyA, '2026-12-01', '2026-12-02', [{ equipment_id: foreign, quantity: 1 }])).rejects.toThrow(
      /neexistuje/,
    )
    await t.as('admin', `update public.equipment set status = 'retired' where id = $1`, [foreign]).catch(() => {})
    const [retired] = await t.as('admin', `insert into public.equipment (company_id, name, status) values ($1, 'Starý', 'retired') returning id`, [
      companyA,
    ])
    await expect(createLoan('admin', companyA, '2026-12-01', '2026-12-02', [{ equipment_id: retired.id, quantity: 1 }])).rejects.toThrow(
      /vyradená/,
    )
  })

  it('is closed to viewers and other companies', async () => {
    await expect(createLoan('viewer', companyA, '2027-01-01', '2027-01-02', [{ equipment_id: cables, quantity: 1 }])).rejects.toThrow(
      /row-level security/,
    )
    await expect(createLoan('outsider', companyA, '2027-01-01', '2027-01-02', [{ equipment_id: cables, quantity: 1 }])).rejects.toThrow(
      /row-level security/,
    )
    expect(await t.as('outsider', 'select 1 from public.loans')).toEqual([])
    await expect(t.as(null, 'select 1 from public.loans')).rejects.toThrow(/permission denied/)
  })
})

describe('issue and return', () => {
  let loan: string
  let speaker: string
  let stand: string

  beforeAll(async () => {
    const add = async (name: string, quantity: number) =>
      (await t.as('admin', 'insert into public.equipment (company_id, name, quantity) values ($1, $2, $3) returning id', [companyA, name, quantity]))[0].id
    speaker = await add('Reproduktor', 1)
    stand = await add('Stojan', 10)
    loan = (
      await createLoan('skladnik', companyA, '2026-10-20', '2026-10-22', [
        { equipment_id: speaker, quantity: 1 },
        { equipment_id: stand, quantity: 4 },
      ])
    )[0].id
  })

  it('marks fully lent equipment as loaned when issued, partial quantities stay available', async () => {
    await t.as('technik', 'select public.issue_loan($1)', [loan])
    expect(await t.as('viewer', 'select status from public.loans where id = $1', [loan])).toEqual([{ status: 'issued' }])
    expect(await statusOf(speaker)).toBe('loaned')
    expect(await statusOf(stand)).toBe('available')
    await expect(t.as('technik', 'select public.issue_loan($1)', [loan])).rejects.toThrow(/nemožno vydať/)
  })

  it('cannot be deleted while issued', async () => {
    expect(await t.as('admin', 'delete from public.loans where id = $1 returning id', [loan])).toEqual([])
  })

  it('returns equipment, flagging damaged pieces', async () => {
    await t.as('technik', 'select public.return_loan($1, $2)', [loan, `{${speaker}}`])
    expect(await t.as('viewer', 'select status from public.loans where id = $1', [loan])).toEqual([{ status: 'damaged' }])
    expect(await statusOf(speaker)).toBe('damaged')
    expect(await statusOf(stand)).toBe('available')
    await expect(t.as('technik', 'select public.return_loan($1, $2)', [loan, '{}'])).rejects.toThrow(/nemožno vrátiť/)
  })

  it('returns a clean loan as returned and frees the equipment for the next one', async () => {
    const [next] = await createLoan('skladnik', companyA, '2026-10-23', '2026-10-24', [{ equipment_id: stand, quantity: 10 }])
    await t.as('skladnik', 'select public.issue_loan($1)', [next.id])
    expect(await statusOf(stand)).toBe('loaned')
    await t.as('skladnik', 'select public.return_loan($1, $2)', [next.id, '{}'])
    expect(await t.as('viewer', 'select status from public.loans where id = $1', [next.id])).toEqual([{ status: 'returned' }])
    expect(await statusOf(stand)).toBe('available')
    expect(await t.as('technik', 'delete from public.loans where id = $1 returning id', [next.id])).toEqual([])
    expect(await t.as('skladnik', 'delete from public.loans where id = $1 returning id', [next.id])).toHaveLength(1)
  })
})
