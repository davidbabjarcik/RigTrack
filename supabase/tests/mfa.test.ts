import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'plain']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('Ukážková firma') as id`))[0].id
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'technik')`, [a, t.users.plain])
  await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'Ukážková svadba', current_date, current_date)`, [a])
})

const events = (who: string, aal?: string) => t.as(who, 'select name from public.events', [], aal ? { aal } : {})

describe('dvojfaktorové prihlásenie', () => {
  it('bez 2FA sa nič nemení', async () => {
    expect(await events('boss')).toHaveLength(1)
    expect(await events('plain')).toHaveLength(1)
  })

  it('so zapnutým 2FA len po zadaní kódu (aal2)', async () => {
    await t.rows(`insert into auth.mfa_factors (user_id, status, factor_type) values ($1, 'verified', 'totp')`, [t.users.boss])
    // Len heslom: žiadne dáta, žiadne oprávnenia ani zápis.
    expect(await events('boss', 'aal1')).toEqual([])
    expect((await t.as('boss', `select public.can($1, 'events.edit') as ok`, [a], { aal: 'aal1' }))[0].ok).toBe(false)
    await expect(t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on) values ($1, 'X', current_date, current_date)`, [a], { aal: 'aal1' })).rejects.toThrow(/row-level/)
    expect(await t.as('boss', 'select id from public.profiles', [], { aal: 'aal1' })).toEqual([])
    // S kódom ako doteraz.
    expect(await events('boss', 'aal2')).toHaveLength(1)
    expect((await t.as('boss', `select public.can($1, 'events.edit') as ok`, [a], { aal: 'aal2' }))[0].ok).toBe(true)
    // Ostatných sa to netýka.
    expect(await events('plain', 'aal1')).toHaveLength(1)
  })

  it('nedokončené zapínanie (neoverený faktor) prístup neblokuje', async () => {
    await t.rows(`insert into auth.mfa_factors (user_id, status, factor_type) values ($1, 'unverified', 'totp')`, [t.users.plain])
    expect(await events('plain', 'aal1')).toHaveLength(1)
  })
})
