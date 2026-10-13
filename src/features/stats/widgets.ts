// Čo všetko vie stránka Štatistiky ukázať. Každý si vyberie, čo chce vidieť;
// výber sa pamätá v prehliadači zvlášť pre každú firmu.

export const STAT_SECTIONS = [
  { id: 'equipment', label: 'Technika' },
  { id: 'service', label: 'Servis' },
  { id: 'vehicles', label: 'Vozidlá' },
] as const
export type StatSectionId = (typeof STAT_SECTIONS)[number]['id']

export const STAT_WIDGETS = [
  { id: 'equipment.items', section: 'equipment', kind: 'tile', label: 'Počet položiek a kusov' },
  { id: 'equipment.availability', section: 'equipment', kind: 'tile', label: 'Dostupnosť' },
  { id: 'equipment.packed', section: 'equipment', kind: 'tile', label: 'V cases a mimo nich' },
  { id: 'loans.open', section: 'equipment', kind: 'tile', label: 'Otvorené výpožičky' },
  { id: 'equipment.byStatus', section: 'equipment', kind: 'ranking', label: 'Technika podľa stavu' },
  { id: 'loans.mostLent', section: 'equipment', kind: 'ranking', label: 'Najviac požičiavaná technika' },
  { id: 'service.records', section: 'service', kind: 'tile', label: 'Servisné záznamy' },
  { id: 'service.hours', section: 'service', kind: 'tile', label: 'Odpracované hodiny' },
  { id: 'service.cost', section: 'service', kind: 'tile', label: 'Servisné náklady' },
  { id: 'service.byKind', section: 'service', kind: 'ranking', label: 'Záznamy podľa typu' },
  { id: 'service.costliest', section: 'service', kind: 'ranking', label: 'Najdrahšia technika na servis' },
  { id: 'vehicles.count', section: 'vehicles', kind: 'tile', label: 'Aktívne vozidlá' },
  { id: 'vehicles.due', section: 'vehicles', kind: 'tile', label: 'Termíny na vybavenie' },
  { id: 'vehicles.costs', section: 'vehicles', kind: 'ranking', label: 'Náklady na prevádzku podľa vozidla' },
] as const satisfies readonly { id: string; section: StatSectionId; kind: 'tile' | 'ranking'; label: string }[]

export type StatWidgetId = (typeof STAT_WIDGETS)[number]['id']

const storageKey = (companyId: string) => `rigtrack:stats-hidden:${companyId}`

/** Z uloženej hodnoty nechá len známe widgety; poškodené nastavenie znamená „ukáž všetko“. */
export function parseHidden(raw: string | null): StatWidgetId[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? '[]')
    if (!Array.isArray(parsed)) return []
    return STAT_WIDGETS.map((widget) => widget.id).filter((id) => parsed.includes(id))
  } catch {
    return []
  }
}

export function loadHidden(companyId: string): StatWidgetId[] {
  try {
    return parseHidden(localStorage.getItem(storageKey(companyId)))
  } catch {
    return []
  }
}

export function saveHidden(companyId: string, hidden: StatWidgetId[]) {
  try {
    if (hidden.length === 0) localStorage.removeItem(storageKey(companyId))
    else localStorage.setItem(storageKey(companyId), JSON.stringify(hidden))
  } catch {
    // Úložisko nedostupné (súkromné okno) — výber platí len do zatvorenia karty.
  }
}
