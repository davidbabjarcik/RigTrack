import {
  Bell,
  Briefcase,
  CalendarDays,
  ArrowLeftRight,
  LayoutDashboard,
  Lightbulb,
  ListTodo,
  Settings,
  Speaker,
  Ticket,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  id: string
  label: string
  to: string
  icon: LucideIcon
  description: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Prehľad', to: '/', icon: LayoutDashboard, description: 'Súhrn stavu techniky a najbližších akcií' },
  { id: 'equipment', label: 'Technika', to: '/equipment', icon: Speaker, description: 'Evidencia kusov techniky' },
  { id: 'cases', label: 'Kufre', to: '/cases', icon: Briefcase, description: 'Kufre a ich obsah' },
  { id: 'loans', label: 'Výpožičky', to: '/loans', icon: ArrowLeftRight, description: 'Vydaná a vrátená technika' },
  { id: 'events', label: 'Eventy', to: '/events', icon: Ticket, description: 'Akcie, technika, posádka a dokumenty' },
  { id: 'service', label: 'Servis', to: '/service', icon: Wrench, description: 'Servisné záznamy' },
  { id: 'calendar', label: 'Kalendár', to: '/calendar', icon: CalendarDays, description: 'Kalendárový prehľad' },
  { id: 'todos', label: 'Úlohy', to: '/todos', icon: ListTodo, description: 'Zoznam úloh' },
  { id: 'notifications', label: 'Notifikácie', to: '/notifications', icon: Bell, description: 'Upozornenia' },
  { id: 'suggestions', label: 'Návrhy', to: '/suggestions', icon: Lightbulb, description: 'Návrhy na zlepšenie' },
  { id: 'settings', label: 'Nastavenia', to: '/settings', icon: Settings, description: 'Firma a používatelia' },
]

/** Počet položiek v spodnej lište na mobile (piata je vždy „Viac“). */
export const PINNED_COUNT = 4
export const DEFAULT_PINNED = ['dashboard', 'equipment', 'events', 'loans']

const STORAGE_KEY = 'rigtrack:pinned-nav'

function isValidPinned(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length === PINNED_COUNT &&
    new Set(value).size === PINNED_COUNT &&
    value.every((id) => NAV_ITEMS.some((item) => item.id === id))
  )
}

/** Poškodené alebo zastarané nastavenie sa ticho nahradí predvoleným. */
export function loadPinned(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return isValidPinned(parsed) ? parsed : DEFAULT_PINNED
  } catch {
    return DEFAULT_PINNED
  }
}

export function savePinned(ids: string[]) {
  if (!isValidPinned(ids)) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // Úložisko nedostupné (súkromné okno) — preferencia platí len do zatvorenia.
  }
}

export function resetPinned() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // nič
  }
}
