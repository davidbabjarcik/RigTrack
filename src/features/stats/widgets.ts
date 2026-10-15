// Čo všetko vie stránka Štatistiky ukázať. Každý si vyberie, čo chce vidieť;
// výber sa pamätá v prehliadači zvlášť pre každú firmu.

import type { PermissionKey } from '@/features/permissions/catalog'

export const STAT_SECTIONS = [
  { id: 'money', label: 'Peniaze' },
  { id: 'equipment', label: 'Technika' },
  { id: 'service', label: 'Servis' },
  { id: 'vehicles', label: 'Vozidlá' },
] as const
export type StatSectionId = (typeof STAT_SECTIONS)[number]['id']

/** `needs` = oprávnenia, bez ktorých sa widget neponúka (údaje by aj tak neprišli). */
export const STAT_WIDGETS = [
  { id: 'money.income', section: 'money', kind: 'tile', label: 'Príjmy firmy z akcií', needs: ['payouts.manage'] },
  { id: 'money.payouts', section: 'money', kind: 'tile', label: 'Odmeny členom', needs: ['payouts.view_all'] },
  { id: 'money.balance', section: 'money', kind: 'tile', label: 'Zostáva po odmenách', needs: ['payouts.manage', 'payouts.view_all'] },
  { id: 'money.mine', section: 'money', kind: 'tile', label: 'Moje zárobky' },
  { id: 'money.incomeByMonth', section: 'money', kind: 'ranking', label: 'Príjmy firmy podľa mesiacov', needs: ['payouts.manage'] },
  { id: 'money.incomeByMethod', section: 'money', kind: 'chart', label: 'Príjmy podľa spôsobu platby', needs: ['payouts.manage'] },
  { id: 'money.payoutsByMember', section: 'money', kind: 'chart', label: 'Odmeny podľa členov', needs: ['payouts.view_all'] },
  { id: 'money.payoutsByRole', section: 'money', kind: 'chart', label: 'Odmeny podľa role na evente', needs: ['payouts.view_all'] },
  { id: 'money.mineByRole', section: 'money', kind: 'chart', label: 'Moje zárobky podľa role' },
  { id: 'money.mineByMonth', section: 'money', kind: 'ranking', label: 'Moje najlepšie mesiace' },
  { id: 'money.mineByYear', section: 'money', kind: 'ranking', label: 'Moje zárobky podľa rokov' },
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
] as const satisfies readonly { id: string; section: StatSectionId; kind: 'tile' | 'ranking' | 'chart'; label: string; needs?: readonly PermissionKey[] }[]

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

// ---------------------------------------------------------------------------
// Poradie: kde ktorá sekcia a ktorý widget je. Pamätá sa v prehliadači pre každú firmu.
// ---------------------------------------------------------------------------

export type StatsOrder = { sections: StatSectionId[]; widgets: StatWidgetId[] }

export const DEFAULT_ORDER: StatsOrder = {
  sections: STAT_SECTIONS.map((section) => section.id),
  widgets: STAT_WIDGETS.map((widget) => widget.id),
}

/** Zachová uložené poradie známych položiek a nové (pribudnuté vo verzii) pridá na koniec. */
function mergeOrder<T extends string>(stored: unknown, known: readonly T[]): T[] {
  const kept = Array.isArray(stored) ? (stored.filter((id, index) => known.includes(id as T) && stored.indexOf(id) === index) as T[]) : []
  return [...kept, ...known.filter((id) => !kept.includes(id))]
}

export function parseOrder(raw: string | null): StatsOrder {
  try {
    const parsed = JSON.parse(raw ?? 'null') as { sections?: unknown; widgets?: unknown } | null
    return {
      sections: mergeOrder(parsed?.sections, DEFAULT_ORDER.sections),
      widgets: mergeOrder(parsed?.widgets, DEFAULT_ORDER.widgets),
    }
  } catch {
    return DEFAULT_ORDER
  }
}

const orderKey = (companyId: string) => `rigtrack:stats-order:${companyId}`

export function loadOrder(companyId: string): StatsOrder {
  try {
    return parseOrder(localStorage.getItem(orderKey(companyId)))
  } catch {
    return DEFAULT_ORDER
  }
}

export function saveOrder(companyId: string, order: StatsOrder) {
  try {
    localStorage.setItem(orderKey(companyId), JSON.stringify(order))
  } catch {
    // bez úložiska platí poradie len do zatvorenia karty
  }
}

/** Posunie položku o jedno miesto hore (-1) alebo dole (+1) medzi položkami, ktoré spĺňajú `among`. */
export function move<T>(list: T[], item: T, direction: -1 | 1, among: (other: T) => boolean = () => true): T[] {
  const peers = list.filter(among)
  const index = peers.indexOf(item)
  const neighbour = peers[index + direction]
  if (index < 0 || neighbour === undefined) return list
  const result = [...list]
  const a = result.indexOf(item)
  const b = result.indexOf(neighbour)
  ;[result[a], result[b]] = [result[b], result[a]]
  return result
}
