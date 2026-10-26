// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

describe('supabase/update-all.sql', () => {
  it('is up to date with the migrations', () => {
    const before = readFileSync('supabase/update-all.sql', 'utf8')
    execFileSync('node', ['scripts/build-db-update.mjs'])
    expect(readFileSync('supabase/update-all.sql', 'utf8')).toBe(before)
  })

  it('can be run again on an up-to-date database without errors', async () => {
    const t = await createTestDb()
    await t.signUp('boss', 'boss@example.com')
    await t.as('boss', `select public.create_company('A')`)
    await t.as('boss', `select public.create_demo_company()`)
    await expect(t.exec(readFileSync('supabase/update-all.sql', 'utf8'))).resolves.toBeDefined()
    // A ešte raz – napr. keď ho niekto spustí po ďalšej verzii.
    await expect(t.exec(readFileSync('supabase/update-all.sql', 'utf8'))).resolves.toBeDefined()
    // Po aktualizácii ostáva heslo a adresy Wi-Fi skryté (opravné migrácie ich znova neotvoria).
    await expect(t.as('boss', 'select password from public.wifi_networks')).rejects.toThrow()
    await expect(t.as('boss', 'select subnet from public.wifi_networks')).rejects.toThrow()
  }, 120_000)
})
