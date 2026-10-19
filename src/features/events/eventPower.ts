import type { Equipment } from '@/features/equipment/model'
import type { EventEquipment, PowerType } from './model'

/** Príkon jedného kusu techniky (W): výkon zo zvuku/svetla/DJ, pri LED paneli jeho maximum. */
export function unitWatts(item: Pick<Equipment, 'attributes'>) {
  return item.attributes.powerW ?? item.attributes.ledPanel?.maxW ?? 0
}

/** Prípojka eventu: koľko fáz a koľko ampérov na fázu (× počet prípojok). */
export function supplyOf(power: PowerType | '', count: number | null) {
  const amps: Partial<Record<PowerType, number>> = { schuko16: 16, cee16: 16, cee32: 32, cee63: 63, cee125: 125 }
  if (!power || power === 'none' || power === 'generator') return null
  return { phases: (power === 'schuko16' ? 1 : 3) as 1 | 3, amps: (amps[power] ?? 16) * Math.max(1, count ?? 1) }
}

export type PhaseLoad = { phase: number; watts: number; amps: number; items: { name: string; count: number; watts: number }[] }

/**
 * Rozdelí techniku eventu na fázy: každý kus na najmenej zaťaženú fázu (od najväčšieho príkonu).
 * `existing` = iné zaťaženie na fázach (W). Vráti aj techniku bez zadaného príkonu.
 */
export function eventPhases(lines: EventEquipment[], equipment: Equipment[], phaseCount: 1 | 2 | 3, existing: number[] = [0, 0, 0]) {
  const units: { name: string; watts: number }[] = []
  const unknown: string[] = []
  for (const line of lines) {
    const item = equipment.find((candidate) => candidate.id === line.equipmentId)
    if (!item) continue
    const watts = unitWatts(item)
    if (watts <= 0) {
      if (item.kind === 'light' || item.kind === 'audio' || item.kind === 'video' || item.kind === 'dj') unknown.push(item.name)
      continue
    }
    for (let n = 0; n < line.quantity; n++) units.push({ name: item.name, watts })
  }
  const phases: PhaseLoad[] = Array.from({ length: phaseCount }, (_, index) => ({ phase: index + 1, watts: existing[index] ?? 0, amps: 0, items: [] }))
  for (const unit of units.sort((a, b) => b.watts - a.watts)) {
    const target = phases.reduce((low, phase) => (phase.watts < low.watts ? phase : low), phases[0])
    target.watts += unit.watts
    const row = target.items.find((item) => item.name === unit.name)
    if (row) {
      row.count += 1
      row.watts += unit.watts
    } else target.items.push({ name: unit.name, count: 1, watts: unit.watts })
  }
  for (const phase of phases) phase.amps = Math.round((phase.watts / 230) * 10) / 10
  const high = Math.max(...phases.map((phase) => phase.watts))
  const low = Math.min(...phases.map((phase) => phase.watts))
  return {
    phases,
    totalWatts: units.reduce((sum, unit) => sum + unit.watts, 0),
    imbalance: high > 0 ? Math.round(((high - low) / high) * 100) : 0,
    unknown: [...new Set(unknown)],
  }
}
