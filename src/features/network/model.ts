import type { Equipment } from '@/features/equipment/model'

export type NetworkRow = Pick<Equipment, 'id' | 'name' | 'manufacturer' | 'model' | 'ipAddress' | 'macAddress' | 'caseId' | 'locationId' | 'status'> & {
  /** Rovnakú IP má aj iné zariadenie: v sieti by sa bili. */
  duplicateIp: boolean
  /** Rovnakú MAC má aj iné zariadenie: pravdepodobne preklep. */
  duplicateMac: boolean
}

/** IP ako číslo na zoradenie: 192.168.1.9 pred 192.168.1.10. */
export function ipValue(ip: string) {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return Number.POSITIVE_INFINITY
  return ((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]
}

/** MAC bez oddeľovačov a veľkými písmenami, aby sa dala hľadať v akomkoľvek zápise. */
const macKey = (mac: string) => mac.toUpperCase().replace(/[^0-9A-F]/g, '')

/** Technika s IP alebo MAC adresou, zoradená podľa IP (bez IP na konci), s označením duplicít. */
export function networkRows(items: Equipment[]): NetworkRow[] {
  const count = (values: string[]) => {
    const counts = new Map<string, number>()
    for (const value of values) if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
    return counts
  }
  const withAddress = items.filter((item) => item.status !== 'retired' && (item.ipAddress || item.macAddress))
  const ips = count(withAddress.map((item) => item.ipAddress))
  const macs = count(withAddress.map((item) => macKey(item.macAddress)))
  return withAddress
    .map((item) => ({
      id: item.id,
      name: item.name,
      manufacturer: item.manufacturer,
      model: item.model,
      ipAddress: item.ipAddress,
      macAddress: item.macAddress,
      caseId: item.caseId,
      locationId: item.locationId,
      status: item.status,
      duplicateIp: Boolean(item.ipAddress) && (ips.get(item.ipAddress) ?? 0) > 1,
      duplicateMac: Boolean(item.macAddress) && (macs.get(macKey(item.macAddress)) ?? 0) > 1,
    }))
    .sort((a, b) => ipValue(a.ipAddress) - ipValue(b.ipAddress) || a.name.localeCompare(b.name, 'sk'))
}

/**
 * Hľadanie podľa IP (aj začiatku, napr. „192.168.1.“), MAC v ľubovoľnom zápise
 * (aj časti, napr. „4d5e“ alebo „4D-5E“) alebo podľa názvu zariadenia.
 */
export function matchesNetwork(row: NetworkRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (row.ipAddress.startsWith(q) || row.ipAddress === q) return true
  const mac = macKey(q)
  if (mac.length >= 2 && /^[0-9a-f:\-.\s]+$/i.test(q) && macKey(row.macAddress).includes(mac)) return true
  return [row.name, row.manufacturer, row.model].join(' ').toLowerCase().includes(q)
}
