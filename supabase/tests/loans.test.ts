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
const returnLoan = (user: string, loan: string, damaged: object[]) =>
  t.as(user, 'select public.return_loan($1, $2::jsonb)', [loan, JSON.stringify(damaged)])
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

  it('remembers the case an item left with and forgets it when the case is deleted', async () => {
    const box = (await t.as('admin', `insert into public.cases (company_id, name) values ($1, 'Audio case') returning id`, [companyA]))[0].id
    const [loan] = await createLoan('technik', companyA, '2027-03-01', '2027-03-02', [
      { equipment_id: mixer, quantity: 1, case_id: box },
      { equipment_id: cables, quantity: 2, case_id: '' },
    ])
    const items = () => t.as('viewer', 'select case_id from public.loan_items where loan_id = $1 order by quantity', [loan.id])
    expect(await items()).toEqual([{ case_id: box }, { case_id: null }])
    await t.as('admin', 'delete from public.cases where id = $1', [box])
    expect(await items()).toEqual([{ case_id: null }, { case_id: null }])
    await t.as('admin', 'delete from public.loans where id = $1', [loan.id])
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

describe('loans and events', () => {
  it('treats equipment planned on a live event as taken, but not on a cancelled one', async () => {
    const [lights] = await t.as('admin', `insert into public.equipment (company_id, name, quantity) values ($1, 'Svetlo', 4) returning id`, [companyA])
    const [event] = await t.as(
      'admin',
      `insert into public.events (company_id, name, starts_on, ends_on, status) values ($1, 'Festival', '2027-02-10', '2027-02-12', 'confirmed') returning id`,
      [companyA],
    )
    await t.as('admin', 'insert into public.event_equipment (company_id, event_id, equipment_id, quantity) values ($1, $2, $3, 3)', [
      companyA,
      event.id,
      lights.id,
    ])
    const lend = (quantity: number, starts = '2027-02-11', ends = '2027-02-11') =>
      createLoan('technik', companyA, starts, ends, [{ equipment_id: lights.id, quantity }])

    await expect(lend(2)).rejects.toThrow(/voľné 1 z 4/)
    // mimo termínu eventu sú voľné všetky štyri
    await lend(4, '2027-02-20', '2027-02-21')

    await t.as('admin', `update public.events set status = 'cancelled' where id = $1`, [event.id])
    await lend(4)
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
    await returnLoan('technik', loan, [{ equipment_id: speaker }, { equipment_id: stand, quantity: 2 }])
    expect(await t.as('viewer', 'select status from public.loans where id = $1', [loan])).toEqual([{ status: 'damaged' }])
    // poškodené kusy idú do servisu: jediný reproduktor celý, zo stojanov len dva z desiatich
    expect(await statusOf(speaker)).toBe('in_service')
    expect(await statusOf(stand)).toBe('available')
    expect(
      await t.as('viewer', `select quantity, status, problem from public.service_records where equipment_id = $1`, [stand]),
    ).toEqual([{ quantity: 2, status: 'open', problem: 'Vrátené poškodené z výpožičky: Klient s.r.o.' }])
    expect(
      await t.as('viewer', 'select damaged, damaged_quantity from public.loan_items where loan_id = $1 and equipment_id = $2', [loan, stand]),
    ).toEqual([{ damaged: true, damaged_quantity: 2 }])
    await expect(returnLoan('technik', loan, [])).rejects.toThrow(/nemožno vrátiť/)
    await t.as('admin', 'delete from public.service_records where equipment_id = $1', [stand])
  })

  it('returns a clean loan as returned and frees the equipment for the next one', async () => {
    const [next] = await createLoan('skladnik', companyA, '2026-10-23', '2026-10-24', [{ equipment_id: stand, quantity: 10 }])
    await t.as('skladnik', 'select public.issue_loan($1)', [next.id])
    expect(await statusOf(stand)).toBe('loaned')
    await returnLoan('skladnik', next.id, [])
    expect(await t.as('viewer', 'select status from public.loans where id = $1', [next.id])).toEqual([{ status: 'returned' }])
    expect(await statusOf(stand)).toBe('available')
    expect(await t.as('technik', 'delete from public.loans where id = $1 returning id', [next.id])).toEqual([])
    expect(await t.as('skladnik', 'delete from public.loans where id = $1 returning id', [next.id])).toHaveLength(1)
  })
})

describe('equipment tracked piece by piece', () => {
  let lights: string
  const lend = (starts: string, ends: string, units: number[] | undefined) =>
    createLoan('technik', companyA, starts, ends, [{ equipment_id: lights, quantity: 1, unit_numbers: units }])
  const itemOf = async (loan: string) =>
    (await t.as('viewer', 'select quantity, unit_numbers, damaged_units from public.loan_items where loan_id = $1', [loan]))[0]

  beforeAll(async () => {
    lights = (
      await t.as('admin', `insert into public.equipment (company_id, name, quantity, track_units) values ($1, 'Hlava', 4, true) returning id`, [companyA])
    )[0].id
  })

  it('records which pieces leave and derives the quantity from them', async () => {
    const [loan] = await lend('2027-05-01', '2027-05-03', [3, 1, 3])
    expect(await itemOf(loan.id)).toMatchObject({ quantity: 2, unit_numbers: [1, 3] })
  })

  it('requires existing pieces that are not on another loan in the term', async () => {
    await expect(lend('2027-05-02', '2027-05-02', undefined)).rejects.toThrow(/vyberte konkrétne kusy/)
    await expect(lend('2027-05-02', '2027-05-02', [5])).rejects.toThrow(/iba kusy 1, 2, 3, 4/)
    await expect(lend('2027-05-02', '2027-05-02', [2, 3])).rejects.toThrow(/Kus #3.*na inej výpožičke/)
    await lend('2027-05-02', '2027-05-02', [2, 4])
    await lend('2027-05-10', '2027-05-11', [1, 3])
  })

  it('sends only the damaged pieces to service on return', async () => {
    const [loan] = await lend('2027-06-01', '2027-06-02', [1, 2, 3, 4])
    await t.as('technik', 'select public.issue_loan($1)', [loan.id])
    expect(await statusOf(lights)).toBe('loaned')
    // kus #9 na výpožičke nebol, ignoruje sa
    await returnLoan('technik', loan.id, [{ equipment_id: lights, units: [2, 9] }])
    expect(await itemOf(loan.id)).toMatchObject({ damaged_units: [2] })
    expect(await statusOf(lights)).toBe('available')
    expect(
      await t.as('viewer', `select unit_numbers, quantity from public.service_records where equipment_id = $1 and status = 'open'`, [lights]),
    ).toEqual([{ unit_numbers: [2], quantity: 1 }])
  })
})

describe('priced loans', () => {
  it('stores billing details and item prices together with the reservation', async () => {
    const [{ id }] = await t.as('technik', 'select public.create_priced_loan($1, $2::jsonb, $3::jsonb) as id', [
      companyA,
      JSON.stringify({
        borrower: 'Agentúra', starts_on: '2028-01-10', ends_on: '2028-01-12',
        borrower_ico: ' 12345678 ', borrower_address: 'Hlavná 1, Prešov', billed_days: 2, price: null, deposit: 150,
      }),
      JSON.stringify([
        { equipment_id: mixer, quantity: 1, unit_price: 40 },
        { equipment_id: cables, quantity: 3, unit_price: null },
      ]),
    ])
    expect(
      await t.as('viewer', 'select borrower_ico, borrower_address, billed_days, price, deposit::float from public.loans where id = $1', [id]),
    ).toEqual([{ borrower_ico: '12345678', borrower_address: 'Hlavná 1, Prešov', billed_days: 2, price: null, deposit: 150 }])
    expect(await t.as('viewer', 'select unit_price::float from public.loan_items where loan_id = $1 order by quantity', [id])).toEqual([
      { unit_price: 40 },
      { unit_price: null },
    ])
  })

  it('keeps the availability checks and stays closed to viewers', async () => {
    const attempt = (user: string) =>
      t.as(user, 'select public.create_priced_loan($1, $2::jsonb, $3::jsonb)', [
        companyA,
        JSON.stringify({ borrower: 'Iný', starts_on: '2028-01-11', ends_on: '2028-01-11' }),
        JSON.stringify([{ equipment_id: mixer, quantity: 1, unit_price: 1 }]),
      ])
    await expect(attempt('technik')).rejects.toThrow(/nie je v tomto termíne voľná/)
    await expect(attempt('viewer')).rejects.toThrow(/row-level security/)
  })
})

describe('editing a reservation', () => {
  let loan: string
  let amp: string
  const update = (user: string, id: string, patch: object, items: object[]) =>
    t.as(user, 'select public.update_loan($1, $2::jsonb, $3::jsonb)', [
      id,
      JSON.stringify({ borrower: 'Klub', starts_on: '2029-03-01', ends_on: '2029-03-03', ...patch }),
      JSON.stringify(items),
    ])

  beforeAll(async () => {
    amp = (await t.as('admin', `insert into public.equipment (company_id, name, quantity) values ($1, 'Zosilňovač', 2) returning id`, [companyA]))[0].id
    loan = (await createLoan('technik', companyA, '2029-03-01', '2029-03-03', [{ equipment_id: amp, quantity: 2 }]))[0].id
  })

  it('replaces the details and items without colliding with itself', async () => {
    await update('technik', loan, { ends_on: '2029-03-05', deposit: 50 }, [
      { equipment_id: amp, quantity: 2, unit_price: 15 },
      { equipment_id: cables, quantity: 4 },
    ])
    expect(await t.as('viewer', 'select borrower, ends_on::text, deposit::float from public.loans where id = $1', [loan])).toEqual([
      { borrower: 'Klub', ends_on: '2029-03-05', deposit: 50 },
    ])
    expect(await t.as('viewer', 'select quantity, unit_price::float from public.loan_items where loan_id = $1 order by quantity', [loan])).toEqual([
      { quantity: 2, unit_price: 15 },
      { quantity: 4, unit_price: null },
    ])
  })

  it('keeps the old state when the new one collides with another loan', async () => {
    await createLoan('technik', companyA, '2029-03-10', '2029-03-11', [{ equipment_id: amp, quantity: 1 }])
    await expect(update('technik', loan, { starts_on: '2029-03-09', ends_on: '2029-03-10' }, [{ equipment_id: amp, quantity: 2 }])).rejects.toThrow(
      /voľné 1 z 2/,
    )
    await expect(update('technik', loan, {}, [])).rejects.toThrow(/aspoň jednu položku/)
    expect(await t.as('viewer', 'select starts_on::text from public.loans where id = $1', [loan])).toEqual([{ starts_on: '2029-03-01' }])
    expect(await t.as('viewer', 'select count(*)::int as n from public.loan_items where loan_id = $1', [loan])).toEqual([{ n: 2 }])
  })

  it('is closed to viewers and to loans that already left', async () => {
    await expect(update('viewer', loan, {}, [{ equipment_id: amp, quantity: 1 }])).rejects.toThrow(/Upraviť sa dá len rezervácia|row-level security/)
    await t.as('technik', 'select public.issue_loan($1)', [loan])
    await expect(update('technik', loan, {}, [{ equipment_id: amp, quantity: 1 }])).rejects.toThrow(/Upraviť sa dá len rezervácia/)
    expect(await t.as('technik', 'delete from public.loan_items where loan_id = $1 returning equipment_id', [loan])).toEqual([])
  })
})

describe('custom piece numbers', () => {
  let heads: string
  const state = async () => (await t.as('viewer', 'select quantity, unit_ids from public.equipment where id = $1', [heads]))[0]
  const lend = (units: number[]) => createLoan('technik', companyA, '2030-01-01', '2030-01-02', [{ equipment_id: heads, quantity: 1, unit_numbers: units }])

  beforeAll(async () => {
    heads = (
      await t.as('admin', `insert into public.equipment (company_id, name, quantity, track_units, unit_ids) values ($1, 'Wash', 9, true, '{8,1,4,4}') returning id`, [companyA])
    )[0].id
  })

  it('keeps the list tidy and derives the quantity from it', async () => {
    expect(await state()).toEqual({ quantity: 3, unit_ids: [1, 4, 8] })
    await expect(t.as('admin', `update public.equipment set unit_ids = '{0,2}' where id = $1`, [heads])).rejects.toThrow(/od 1 do 100000/)
  })

  it('accepts only the listed pieces in loans and service', async () => {
    await expect(lend([2])).rejects.toThrow(/iba kusy 1, 4, 8/)
    await lend([4, 8])
    const service = (units: string) =>
      t.as('technik', 'insert into public.service_records (company_id, equipment_id, unit_numbers) values ($1, $2, $3::int[])', [companyA, heads, units])
    await expect(service('{3}')).rejects.toThrow(/kus #3 neexistuje/)
    await service('{1}')
  })

  it('drops the numbers when the equipment is counted by quantity again', async () => {
    await t.as('admin', 'update public.equipment set track_units = false, quantity = 5 where id = $1', [heads])
    expect(await state()).toEqual({ quantity: 5, unit_ids: [] })
  })
})

describe('who handed the equipment over', () => {
  it('records the name at issue and at return, and keeps it on later changes', async () => {
    await t.rows(`update public.profiles set full_name = 'Jano Technik' where id = $1`, [t.users.technik])
    const [amp] = await t.as('admin', `insert into public.equipment (company_id, name) values ($1, 'Kombo') returning id`, [companyA])
    const [{ id }] = await createLoan('technik', companyA, '2031-01-01', '2031-01-02', [{ equipment_id: amp.id, quantity: 1 }])
    const names = async () => (await t.as('viewer', 'select issued_by_name, returned_by_name from public.loans where id = $1', [id]))[0]

    expect(await names()).toEqual({ issued_by_name: '', returned_by_name: '' })
    await t.as('technik', 'select public.issue_loan($1)', [id])
    expect(await names()).toEqual({ issued_by_name: 'Jano Technik', returned_by_name: '' })
    // vracia iný človek, bez mena v profile: použije sa e-mail; poškodenie meno neprepíše
    await returnLoan('skladnik', id, [{ equipment_id: amp.id }])
    expect(await names()).toEqual({ issued_by_name: 'Jano Technik', returned_by_name: 'skladnik@example.com' })
  })
})
