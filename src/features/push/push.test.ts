import { describe, expect, it } from 'vitest'
import { keyToBytes } from './push'

describe('push', () => {
  it('decodes a base64url VAPID key', () => {
    expect([...keyToBytes('AQID_-8')]).toEqual([1, 2, 3, 255, 239])
    expect(keyToBytes('BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U').length).toBe(65)
  })
})
