// @vitest-environment node
// Test Edge funkcie weekly-digest bez Deno: text e-mailu a overenie tajomstva (Deno.serve si handler odloží).
import { beforeAll, describe, expect, it } from 'vitest'

type Handler = (request: Request) => Promise<Response>
let handler: Handler
let digestText: (digest: never, appUrl: string) => string
const env: Record<string, string> = { PUSH_WEBHOOK_SECRET: 'tajne', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service' }

beforeAll(async () => {
  ;(globalThis as unknown as { Deno: unknown }).Deno = {
    env: { get: (name: string) => env[name] },
    serve: (fn: Handler) => {
      handler = fn
    },
  }
  ;({ digestText } = (await import('../functions/weekly-digest/index.ts')) as unknown as { digestText: typeof digestText })
})

describe('weekly-digest edge function', () => {
  it('bez správneho tajomstva nič nepošle', async () => {
    const response = await handler(new Request('https://example.supabase.co/functions/v1/weekly-digest', { method: 'POST', headers: { 'x-webhook-secret': 'zle' } }))
    expect(response.status).toBe(401)
    expect((await handler(new Request('https://example.supabase.co/functions/v1/weekly-digest'))).status).toBe(405)
  })

  it('text e-mailu: akcie, úlohy, faktúry, servis a odkazy', () => {
    const text = digestText(
      {
        email: 'a@example.com',
        name: 'Ukážkový Človek',
        company: 'Ukážková firma',
        companyId: 'c',
        today: '2026-11-23',
        events: [{ id: 'e1', name: 'Ukážkový festival', startsOn: '2026-11-25', endsOn: '2026-11-26', venue: 'Amfiteáter' }],
        invoices: [{ id: 'i1', number: '20260001', client: 'Ukážkový klient', total: 123.5, dueOn: '2026-11-01' }],
        maintenance: [{ equipmentId: 'q', name: 'Ukážkový beam', rule: 'Revízia', unit: 2, state: 'overdue', dueOn: '2026-11-10' }],
        tasks: [{ id: 't1', title: 'Ukážková úloha', dueOn: '2026-11-20', priority: 'normal' }],
      } as never,
      'https://app.example',
    )
    expect(text).toContain('Dobrý deň, Ukážkový Človek,')
    expect(text).toContain('- 25. 11. 2026 – 26. 11. 2026: Ukážkový festival (Amfiteáter)')
    expect(text).toContain('https://app.example/events/e1')
    expect(text).toContain('- po termíne 20. 11. 2026: Ukážková úloha')
    expect(text).toContain('- 20260001 · Ukážkový klient · 123,50 € · splatná 1. 11. 2026')
    expect(text).toContain('- Ukážkový beam #2 – Revízia (po termíne, 10. 11. 2026)')
    expect(text).toContain('Nastavenia → Účet')
  })
})
