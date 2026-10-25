// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { generateVapidKeys, projectRef } from './vapid'

const bytes = (value: string) => Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').length

describe('vapid keys', () => {
  it('generates keys in the web-push format', async () => {
    const keys = await generateVapidKeys()
    expect(bytes(keys.publicKey)).toBe(65)
    expect(bytes(keys.privateKey)).toBe(32)
    expect(keys.webhookSecret).toMatch(/^[A-Za-z0-9_-]{40,}$/)
    expect(keys.publicKey).not.toMatch(/[+/=]/)
  })

  it('reads the project ref from the Supabase URL', () => {
    expect(projectRef('https://abcdxyz.supabase.co')).toBe('abcdxyz')
    expect(projectRef('http://localhost:54321')).toBe('')
  })
})
