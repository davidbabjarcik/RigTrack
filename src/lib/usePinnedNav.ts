import { useSyncExternalStore } from 'react'
import { DEFAULT_PINNED, loadPinned, resetPinned, savePinned } from './navigation'

// Spoločný stav pre spodnú lištu aj obrazovku prispôsobenia.
let current = loadPinned()
const listeners = new Set<() => void>()

function set(next: string[]) {
  current = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePinnedNav() {
  const pinned = useSyncExternalStore(subscribe, () => current)
  return {
    pinned,
    setPinned(ids: string[]) {
      savePinned(ids)
      set(ids)
    },
    reset() {
      resetPinned()
      set(DEFAULT_PINNED)
    },
  }
}
