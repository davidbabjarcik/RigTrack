/** DMX adresa ↔ dip prepínače (binárne: prepínač 1 = 1, 2 = 2, 3 = 4 … 9 = 256, 10 = 512 / funkcia). */

export const MAX_ADDRESS = 512

/** Ktoré prepínače sú zapnuté pre adresu (1 = prvý prepínač). */
export function dipSwitches(address: number, switches = 9) {
  return Array.from({ length: switches }, (_, index) => Boolean(address & (1 << index)))
}

/** Adresa zo zapnutých prepínačov. */
export function addressFromSwitches(on: boolean[]) {
  return on.reduce((sum, value, index) => sum + (value ? 1 << index : 0), 0)
}

/** Hodnoty zapnutých prepínačov, napr. „1 + 4 + 32“. */
export function describeSwitches(on: boolean[]) {
  const values = on.flatMap((value, index) => (value ? [1 << index] : []))
  return values.length > 0 ? values.join(' + ') : '—'
}

export type Patched = { fixture: number; address: number; universe: number; last: number }

/**
 * Adresy pre rad svetiel: od štartovacej adresy, každé svetlo zaberie `channels` kanálov.
 * Keď sa svetlo nezmestí do univerza (512), ide na začiatok ďalšieho.
 */
export function patchFixtures(start: number, channels: number, count: number, universe = 1): Patched[] {
  const result: Patched[] = []
  let address = Math.max(1, start)
  let current = universe
  for (let fixture = 1; fixture <= count; fixture++) {
    if (address + channels - 1 > MAX_ADDRESS) {
      current += 1
      address = 1
    }
    result.push({ fixture, address, universe: current, last: address + channels - 1 })
    address += channels
  }
  return result
}
