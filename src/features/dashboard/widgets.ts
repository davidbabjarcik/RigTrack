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
