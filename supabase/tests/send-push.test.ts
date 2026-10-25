// @vitest-environment node
// Test Edge funkcie send-push bez Deno: knižnice sú nahradené (vite.config test.alias), Deno.serve si handler odloží.
import { beforeAll, describe, expect, it } from 'vitest'
import { deletes, tables, updates } from './stubs/supabase-js'
import { gone, sent, vapid } from './stubs/web-push'

type Handler = (request: Request) => Promise<Response>
let handler: Handler
const env: Record<string, string> = {
  VAPID_PUBLIC_KEY: 'public-key',
  VAPID_PRIVATE_KEY: 'private-key',
  VAPID_SUBJECT: 'mailto:test@example.com',
  PUSH_WEBHOOK_SECRET: 'tajne',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
}

beforeAll(async () => {
  ;(globalThis as unknown as { Deno: unknown }).Deno = {
    env: { get: (name: string) => env[name] },
    serve: (fn: Handler) => {
      handler = fn
    },
  }
  await import('../functions/send-push/index.ts')
})

const post = (body: unknown, secret = 'tajne') =>
  handler(
    new Request('https://example.supabase.co/functions/v1/send-push', {
      method: 'POST',
      headers: {
        'x-webhook-secret': secret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }),
  )

describe('send-push edge function', () => {
  it('returns the public VAPID key on GET', async () => {
    const response = await handler(new Request('https://example.supabase.co/functions/v1/send-push'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ publicKey: 'public-key' })
  })

  it('refuses a POST without the shared secret', async () => {
    const response = await post({ record: { id: 'n1', user_id: 'u1', title: 'T', body: '', url: '' } }, 'zle')
    expect(response.status).toBe(401)
    expect(sent).toHaveLength(0)
  })

  it('sends to all devices of the user, removes gone ones and marks the notification sent', async () => {
    tables.push_subscriptions.push(
      {
        id: 's1',
        user_id: 'u1',
        endpoint: 'https://push/a',
        p256dh: 'p',
        auth: 'a',
      },
      {
        id: 's2',
        user_id: 'u1',
        endpoint: 'https://push/b',
        p256dh: 'p',
        auth: 'a',
      },
      {
        id: 's3',
        user_id: 'u2',
        endpoint: 'https://push/c',
        p256dh: 'p',
        auth: 'a',
      },
    )
    gone.add('https://push/b')
    const response = await post({
      record: {
        id: 'n1',
        user_id: 'u1',
        title: 'Si v posádke: Festival',
        body: '10. 11. 2026',
        url: '/events/1',
      },
    })
    expect(await response.json()).toEqual({ sent: 1, removed: 1 })
    expect(sent).toEqual([
      {
        endpoint: 'https://push/a',
        payload: JSON.stringify({
          title: 'Si v posádke: Festival',
          body: '10. 11. 2026',
          url: '/events/1',
          tag: 'n1',
        }),
      },
    ])
    expect(vapid).toEqual({
      subject: 'mailto:test@example.com',
      publicKey: 'public-key',
      privateKey: 'private-key',
    })
    expect(deletes).toEqual([{ table: 'push_subscriptions', ids: ['s2'] }])
    expect(updates).toEqual([expect.objectContaining({ table: 'notifications', id: 'n1' })])
  })

  it('rejects a body without a record', async () => {
    expect((await post({})).status).toBe(400)
  })
})
