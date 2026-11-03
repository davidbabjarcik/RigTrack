// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>

beforeAll(async () => {
  t = await createTestDb()
  await t.signUp('anna', 'anna@example.com')
  await t.signUp('boris', 'boris@example.com')
})

describe('consent records', () => {
  it('keeps each person only their own consent history', async () => {
    await t.as('anna', `insert into public.consent_records (version, functional, given_at) values ('2026-11-03', true, now())`)
    expect(await t.as('anna', 'select functional from public.consent_records')).toEqual([{ functional: true }])
    expect(await t.as('boris', 'select * from public.consent_records')).toEqual([])
    await expect(t.as('boris', `insert into public.consent_records (user_id, version, functional, given_at) values ($1, 'x', true, now())`, [t.users.anna])).rejects.toThrow(/row-level/)
    await expect(t.as('anna', `update public.consent_records set functional = false returning 1`)).rejects.toThrow(/permission/)
  })
})
