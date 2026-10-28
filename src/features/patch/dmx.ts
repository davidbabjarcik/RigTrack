// DMX patch list eventu (0104): linka, adresa, počet kanálov a mód každého svetla / kusu.
import { isLighting, unitIdsOf, type Equipment } from '@/features/equipment/model'
import type { EventEquipment } from '@/features/events/model'

export type DmxLine = {
  id: string
  universe: string
  address: number | null
  channels: number
  name: string
  equipmentId: string | null
  unit: number | null
  mode: string
  note: string
}
export type DmxFields = Omit<DmxLine, 'id'>

export const EMPTY_DMX: DmxFields = { universe: '1', address: null, channels: 1, name: '', equipmentId: null, unit: null, mode: '', note: '' }

/** Posledná adresa riadku (napr. 17 + 16 kanálov → 32). */
export const lastAddress = (line: Pick<DmxLine, 'address' | 'channels'>) => (line.address ? line.address + Math.max(line.channels, 1) - 1 : null)

/** Zoradenie: linka (prirodzene 1, 2, 10), potom adresa; bez adresy na konci. */
export function sortDmx<T extends Pick<DmxLine, 'universe' | 'address' | 'name'>>(lines: T[]) {
  return [...lines].sort(
    (a, b) => a.universe.localeCompare(b.universe, 'sk', { numeric: true }) || (a.address ?? 9999) - (b.address ?? 9999) || a.name.localeCompare(b.name, 'sk', { numeric: true }),
  )
}

/** Riadky, ktorých adresy sa na tej istej linke prekrývajú, alebo presahujú 512. */
export function dmxConflicts(lines: DmxLine[]) {
  const bad = new Set<string>()
  for (const line of lines) {
    const end = lastAddress(line)
    if (end !== null && end > 512) bad.add(line.id)
  }
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const a = lines[i]
      const b = lines[j]
      if (a.universe !== b.universe || !a.address || !b.address) continue
      if (a.address <= lastAddress(b)! && b.address <= lastAddress(a)!) {
        bad.add(a.id)
        bad.add(b.id)
      }
    }
  }
  return bad
}

/** Prvá voľná adresa na linke za poslednou použitou. */
export function nextDmxAddress(lines: Pick<DmxLine, 'universe' | 'address' | 'channels'>[], universe: string) {
  const ends = lines.filter((line) => line.universe === universe).map((line) => lastAddress(line) ?? 0)
  return Math.min(512, Math.max(0, ...ends) + 1)
}

const channelsOf = (item: Pick<Equipment, 'attributes'>, mode: string) => {
  const modes = item.attributes.dmxModes ?? []
  return modes.find((value) => (value.name || `${value.channels} ch`) === mode)?.channels ?? modes[0]?.channels ?? (Number(/(\d+)\s*ch/i.exec(mode)?.[1]) || 1)
}

/**
 * Riadky DMX patch listu zo svetiel na evente: pri evidencii po kusoch každý kus s jeho predvolenou linkou,
 * adresou a módom (z techniky), inak toľko riadkov, koľko kusov je na evente.
 */
export function dmxFromEquipment(onEvent: EventEquipment[], equipment: Equipment[]): DmxFields[] {
  const lines: DmxFields[] = []
  for (const entry of onEvent) {
    const item = equipment.find((candidate) => candidate.id === entry.equipmentId)
    if (!item || !(isLighting(item.kind, '') || item.attributes.dmxModes?.length)) continue
    const firstMode = item.attributes.dmxModes?.[0]
    const defaultMode = firstMode ? firstMode.name || `${firstMode.channels} ch` : ''
    const units = item.trackUnits ? unitIdsOf(item).slice(0, entry.quantity) : Array.from({ length: entry.quantity }, () => null)
    for (const unit of units) {
      const info = unit !== null ? item.unitInfo?.[String(unit)] : undefined
      const mode = info?.dmxMode ?? defaultMode
      lines.push({
        universe: info?.dmxLine ?? '1',
        address: info?.dmxAddress ?? null,
        channels: channelsOf(item, mode),
        name: unit !== null ? `${item.name} #${unit}` : item.name,
        equipmentId: item.id,
        unit,
        mode,
        note: '',
      })
    }
  }
  return lines
}

/** Všetky kusy techniky so zapísanou DMX adresou (prehľad „DMX adresy z techniky“), zoradené podľa linky a adresy. */
export function dmxFromAllEquipment(equipment: Pick<Equipment, 'id' | 'name' | 'status' | 'unitInfo' | 'attributes'>[]): DmxFields[] {
  const lines: DmxFields[] = []
  for (const item of equipment) {
    if (item.status === 'retired') continue
    for (const [unit, info] of Object.entries(item.unitInfo ?? {})) {
      if (!info?.dmxAddress) continue
      const mode = info.dmxMode ?? ''
      lines.push({
        universe: info.dmxLine || '1',
        address: info.dmxAddress,
        channels: channelsOf(item, mode),
        name: `${item.name} #${unit}`,
        equipmentId: item.id,
        unit: Number(unit),
        mode,
        note: '',
      })
    }
  }
  return sortDmx(lines)
}

/**
 * Linka, adresa a mód z techniky (zapísané pri kuse svetla) do riadkov patch listu – napr. keď sa adresy zapísali
 * až po vytvorení patch listu. Vráti nové riadky a počet zmenených.
 */
export function addressesFromEquipment<T extends DmxFields>(lines: T[], equipment: Pick<Equipment, 'id' | 'unitInfo' | 'attributes'>[]): { lines: T[]; changed: number } {
  let changed = 0
  const next = lines.map((line) => {
    if (!line.equipmentId || line.unit === null) return line
    const item = equipment.find((candidate) => candidate.id === line.equipmentId)
    const info = item?.unitInfo?.[String(line.unit)]
    if (!item || !info?.dmxAddress) return line
    const mode = info.dmxMode || line.mode
    const updated = { ...line, address: info.dmxAddress, universe: info.dmxLine || line.universe, mode, channels: mode ? channelsOf(item, mode) : line.channels }
    if (updated.address === line.address && updated.universe === line.universe && updated.mode === line.mode && updated.channels === line.channels) return line
    changed++
    return updated
  })
  return { lines: next, changed }
}

/** Riadkom bez adresy priradí adresy za sebou na ich linke (za už obsadené). */
export function fillAddresses(lines: DmxFields[]): DmxFields[] {
  const placed: DmxFields[] = lines.filter((line) => line.address)
  return lines.map((line) => {
    if (line.address) return line
    const filled = { ...line, address: nextDmxAddress(placed, line.universe) }
    placed.push(filled)
    return filled
  })
}
