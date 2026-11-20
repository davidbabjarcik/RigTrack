import type { DmxMode, Equipment } from '@/features/equipment/model'
import type { EventEquipment } from '@/features/events/model'
import type { DmxLine } from './dmx'

/** Jedno svetlo (model) na ťaháku: aký mód, ktoré adresy a jeho farby a gobá. */
export type LightSheet = { item: Equipment; mode: DmxMode | null; addresses: string[] }

/**
 * Svetlá eventu na ťahák pre osvetľovača: podľa DMX patchu (mód a adresy po kusoch), inak podľa techniky eventu.
 * Zaradí sa len svetlo, o ktorom je čo povedať (DMX módy, farebné koliesko alebo gobá).
 */
export function lightSheets(patch: DmxLine[], lines: EventEquipment[], equipment: Equipment[]): LightSheet[] {
  const useful = (item: Equipment) => Boolean(item.attributes.dmxModes?.length || item.attributes.colorWheel?.colors.length || item.attributes.gobos?.length)
  const sheets = new Map<string, LightSheet>()
  const modeOf = (item: Equipment, name: string) =>
    item.attributes.dmxModes?.find((mode) => mode.name.trim().toLowerCase() === name.trim().toLowerCase()) ?? item.attributes.dmxModes?.[0] ?? null

  for (const line of patch) {
    const item = equipment.find((candidate) => candidate.id === line.equipmentId)
    if (!item || !useful(item)) continue
    const mode = modeOf(item, line.mode)
    const key = `${item.id}|${mode?.name ?? ''}`
    const sheet = sheets.get(key) ?? { item, mode, addresses: [] }
    if (line.address) sheet.addresses.push(`${line.universe}.${String(line.address).padStart(3, '0')}`)
    sheets.set(key, sheet)
  }
  // Bez patchu: svetlá, ktoré idú na event.
  if (sheets.size === 0) {
    for (const line of lines) {
      const item = equipment.find((candidate) => candidate.id === line.equipmentId)
      if (!item || !useful(item) || sheets.has(item.id)) continue
      sheets.set(item.id, { item, mode: item.attributes.dmxModes?.[0] ?? null, addresses: [] })
    }
  }
  return [...sheets.values()].sort((a, b) => a.item.name.localeCompare(b.item.name, 'sk'))
}
