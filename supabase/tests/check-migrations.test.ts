// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

describe('check-migrations.sql', () => {
  it('reports every migration as present on a complete database', async () => {
    const t = await createTestDb()
    const rows = await t.rows(readFileSync('supabase/check-migrations.sql', 'utf8'))
    expect(rows.length).toBeGreaterThan(30)
    expect(rows.filter((row) => row.stav !== 'OK')).toEqual([])
  })
})
