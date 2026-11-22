import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>

beforeAll(async () => {
  t = await createTestDb()
  await t.signUp('boss', 'boss@example.com')
})

describe('naposledy aktívny', () => {
  it('berie neskoršie z prihlásenia a obnovenia relácie', async () => {
    await t.rows(`update auth.users set last_sign_in_at = '2026-10-27T10:00:00Z' where id = $1`, [t.users.boss])
    await t.rows(`create table if not exists auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid, updated_at timestamptz, refreshed_at timestamp)`)
    expect((await t.rows('select public.last_seen($1) as at', [t.users.boss]))[0].at).toEqual(new Date('2026-10-27T10:00:00Z'))
    await t.rows(`insert into auth.sessions (user_id, updated_at, refreshed_at) values ($1, '2026-10-28T09:00:00Z', '2026-10-28 12:00:00')`, [t.users.boss])
    expect((await t.rows('select public.last_seen($1) as at', [t.users.boss]))[0].at).toEqual(new Date('2026-10-28T12:00:00Z'))
  })

  it('prihlásený používateľ ju priamo nevolá', async () => {
    await expect(t.as('boss', 'select public.last_seen($1)', [t.users.boss])).rejects.toThrow(/permission/)
  })
})
