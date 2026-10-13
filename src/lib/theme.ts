import { useSyncExternalStore } from 'react'

// Svetlý / tmavý režim. Predvolene sa riadi zariadením (prefers-color-scheme);
// prepínač v hlavičke to prebije a voľba sa pamätá v prehliadači.
// Rovnakú logiku má krátky skript v index.html, aby stránka pri načítaní nebliklo.

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'rigtrack:theme'
const THEME_COLORS: Record<Theme, string> = { light: '#f8fafc', dark: '#0b1120' }

/** Uložená voľba používateľa; null = riadiť sa zariadením. Čokoľvek iné v úložisku sa ignoruje. */
export function parseStoredTheme(value: string | null): Theme | null {
  return value === 'light' || value === 'dark' ? value : null
}

/** Režim, ktorý sa má použiť: voľba používateľa, inak zariadenie. */
export function resolveTheme(stored: Theme | null, systemDark: boolean): Theme {
  return stored ?? (systemDark ? 'dark' : 'light')
}

const system = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null
const listeners = new Set<() => void>()

function readStored(): Theme | null {
  try {
    return parseStoredTheme(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return null
  }
}

let current: Theme = resolveTheme(readStored(), system?.matches ?? false)

function apply(theme: Theme) {
  current = theme
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
  }
  listeners.forEach((listener) => listener())
}

apply(current)
// Zmena režimu zariadenia sa prejaví hneď, ale len kým si používateľ nevybral sám.
system?.addEventListener('change', (event) => {
  if (readStored() === null) apply(event.matches ? 'dark' : 'light')
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current)
  return {
    theme,
    /** Prepne režim a zapamätá si voľbu. */
    toggle() {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        // Úložisko nedostupné (súkromné okno) — voľba platí len do zatvorenia karty.
      }
      apply(next)
    },
  }
}
