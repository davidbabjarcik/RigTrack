// Ktoré sekcie má používateľ zbalené. Pamätá si to prehliadač (len pohodlie, nie dôležitý stav).

const STORAGE_KEY = 'rigtrack:collapsed'

function load(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [])
  } catch {
    return new Set()
  }
}

let collapsed = load()
const listeners = new Set<() => void>()

export function isCollapsed(id: string) {
  return collapsed.has(id)
}

export function setCollapsed(id: string, value: boolean) {
  collapsed = new Set(collapsed)
  if (value) collapsed.add(id)
  else collapsed.delete(id)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]))
  } catch {
    // Bez úložiska to platí aspoň do zatvorenia stránky.
  }
  for (const listener of listeners) listener()
}

export function subscribeCollapsed(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
