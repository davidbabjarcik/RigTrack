import { describe, expect, it } from 'vitest'
import { scanOutcome } from './scanFeedback'

describe('scanOutcome', () => {
  const notOurs = 'Tento QR kód nie je z RigTracku.'
  it('✓ je v poriadku, ✗ a cudzí QR chyba, ostatné informácia', () => {
    expect(scanOutcome('✓ Ukážkový case', notOurs)).toBe('ok')
    expect(scanOutcome(undefined, notOurs)).toBe('ok')
    expect(scanOutcome('✗ Toto nie je v pack liste eventu.', notOurs)).toBe('error')
    expect(scanOutcome(notOurs, notOurs)).toBe('error')
    expect(scanOutcome('ℹ Kus je v case – naskenujte QR case.', notOurs)).toBe('info')
  })
})
