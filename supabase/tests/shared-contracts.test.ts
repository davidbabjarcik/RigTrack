// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let contract: string
const png = 'data:image/png;base64,iVBORw0KGgo='

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
  const event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ukážkový event', '2026-12-01', '2026-12-01') returning id`, [a]))[0].id
  contract = (await t.as('boss', `insert into public.event_contracts (company_id, event_id, data) values ($1, $2, '{"price": 100}') returning id`, [a, event]))[0].id
})

describe('shared contracts (0179)', () => {
  it('lets the client read and sign once through the link, and notifies the author', async () => {
    await expect(t.as('viewer', `select public.share_contract($1)`, [contract])).rejects.toThrow()
    const token = (await t.as('boss', `select public.share_contract($1) as token`, [contract]))[0].token
    expect((await t.as('boss', `select public.share_contract($1) as token`, [contract]))[0].token).toBe(token)

    const shared = (await t.as(null, `select public.get_shared_contract($1) as c`, [token]))[0].c
    expect(shared).toMatchObject({ data: { price: 100 }, companyName: 'A', clientSignature: null })
    expect((await t.as(null, `select public.get_shared_contract(gen_random_uuid()) as c`))[0].c).toBeNull()

    await expect(t.as(null, `select public.sign_shared_contract($1, '', $2)`, [token, png])).rejects.toThrow()
    await expect(t.as(null, `select public.sign_shared_contract($1, 'Klient', 'nie obrázok')`, [token])).rejects.toThrow()
    await t.as(null, `select public.sign_shared_contract($1, 'Ukážkový klient', $2)`, [token, png])
    await expect(t.as(null, `select public.sign_shared_contract($1, 'Iný', $2)`, [token, png])).rejects.toThrow(/podpísaná/)
    expect(await t.as('boss', `select client_signer from public.event_contracts`)).toEqual([{ client_signer: 'Ukážkový klient' }])
    expect(await t.as('boss', `select title from public.notifications`)).toEqual([{ title: expect.stringMatching(/^Klient podpísal zmluvu/) }])
  })
})
