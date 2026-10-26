// Kto kábel vyrobil: režim (nikto / jeden / rozdelené) a riadky po dĺžkach.

export type Maker = { name: string; count: number }
export type MakerMode = 'none' | 'one' | 'split'
/** Jedna dĺžka kábla (alebo celá položka) a kto z jej kusov koľko vyrobil. */
export type MakerRow = { key: string; title: string; quantity: number; makers: Maker[] }

/** Počiatočný režim podľa uložených údajov: nič, jeden človek na všetko, alebo rozdelené. */
export function makerModeOf(makers: Maker[], quantity: number): MakerMode {
  if (makers.length === 0) return 'none'
  return makers.length === 1 && makers[0].count >= quantity ? 'one' : 'split'
}

/** Výrobcovia do uloženia: jeden človek dostane všetky kusy, rozdelené len vyplnené riadky. */
export function makersToSave(mode: MakerMode, oneName: string, quantity: number, makers: Maker[]): Maker[] {
  if (mode === 'one') return oneName.trim() && quantity > 0 ? [{ name: oneName.trim(), count: quantity }] : []
  if (mode === 'split') return makers.filter((maker) => maker.name.trim() && maker.count > 0).map((maker) => ({ name: maker.name.trim(), count: maker.count }))
  return []
}

/** Súčet kusov s výrobcom nesmie prekročiť počet kusov dĺžky. */
export const makersOver = (row: Pick<MakerRow, 'quantity' | 'makers'>) => row.makers.reduce((sum, maker) => sum + (Number.isFinite(maker.count) ? maker.count : 0), 0) > row.quantity
