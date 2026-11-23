import { describe, expect, it } from 'vitest'
import { passwordOk, passwordRules } from './passwordRules'

describe('pravidlá hesla (rovnaké ako v Supabase Auth)', () => {
  it('chýbajúce požiadavky', () => {
    const missing = (password: string) => passwordRules(password).filter((rule) => !rule.ok).map((rule) => rule.key)
    expect(missing('heslo')).toEqual(['length', 'upper', 'digit', 'symbol'])
    expect(missing('Heslo12345')).toEqual(['symbol'])
    expect(missing('HESLO-12345')).toEqual(['lower'])
    expect(passwordOk('Ukazka-heslo-7')).toBe(true)
    expect(passwordOk('Ukazka heslo 7')).toBe(false)
  })
})
