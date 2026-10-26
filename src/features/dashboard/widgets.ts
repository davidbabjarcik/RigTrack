// Bloky v stĺpci na kraji Prehľadu.
export const WIDGETS = {
  responsibilities: 'Moje zodpovednosti',
  tasks: 'Moje úlohy',
  calendar: 'Kalendár',
  stats: 'Čísla (štatistiky)',
} as const
export type WidgetId = keyof typeof WIDGETS

export const DEFAULT_WIDGETS: WidgetId[] = ['responsibilities', 'tasks', 'calendar']

/** Poradie na úpravu: zapnuté v ich poradí, za nimi vypnuté. Neznáme (staré) id sa vynechajú. */
export function widgetOrder(shown: string[]): WidgetId[] {
  const known = shown.filter((id): id is WidgetId => id in WIDGETS)
  return [...known, ...(Object.keys(WIDGETS) as WidgetId[]).filter((id) => !known.includes(id))]
}

/** Čísla, ktoré si človek môže zapnúť v bloku Čísla. */
export const STAT_TILES = {
  pieces: 'Kusov techniky',
  inService: 'V servise',
  unpacked: 'Kusov mimo case',
  emptyCases: 'Prázdne cases',
  events30: 'Eventy do 30 dní',
  loans: 'Otvorené výpožičky',
  myTasks: 'Moje otvorené úlohy',
  overdue: 'Moje úlohy po termíne',
  fill: 'Na doplnenie (@todo)',
} as const
export type StatTileId = keyof typeof STAT_TILES
export const DEFAULT_STAT_TILES: StatTileId[] = ['pieces', 'inService', 'events30', 'loans', 'myTasks']
