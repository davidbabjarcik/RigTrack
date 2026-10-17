import {
  Bell,
  Briefcase,
  CalendarDays,
  ChartColumn,
  Car,
  ArrowLeftRight,
  LayoutDashboard,
  Lightbulb,
  LayoutGrid,
  Receipt,
  ListTodo,
  Settings,
  ShoppingCart,
  Users,
  Speaker,
  Ticket,
  Wallet,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { PermissionKey } from '@/features/permissions/catalog'
import { can, type Permitted } from './permissions'

export type NavItem = {
  id: string
  /** Oprávnenie, bez ktorého sa položka v menu neukáže. */
  permission?: PermissionKey
  label: string
  to: string
  icon: LucideIcon
  description: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Prehľad', to: '/', icon: LayoutDashboard, description: 'Súhrn stavu techniky a najbližších akcií' },
  { id: 'equipment', permission: 'equipment.view', label: 'Technika', to: '/equipment', icon: Speaker, description: 'Evidencia kusov techniky' },
  { id: 'cases', permission: 'cases.view', label: 'Cases', to: '/cases', icon: Briefcase, description: 'Cases a ich obsah' },
  { id: 'warehouse', permission: 'cases.view', label: 'Sklad', to: '/warehouse', icon: Warehouse, description: 'Plán skladu a kde ktorý case leží' },
  { id: 'orders', permission: 'orders.view', label: 'Objednávky', to: '/orders', icon: Receipt, description: 'Nákupy a ich položky' },
  { id: 'shopping', permission: 'shopping.view', label: 'Nákupy', to: '/shopping', icon: ShoppingCart, description: 'Čo kúpiť a čo chceme časom' },
  { id: 'vehicles', permission: 'vehicles.view', label: 'Vozidlá', to: '/vehicles', icon: Car, description: 'Autá, STK, známky a poistky' },
  { id: 'loans', permission: 'loans.view', label: 'Výpožičky', to: '/loans', icon: ArrowLeftRight, description: 'Vydaná a vrátená technika' },
  { id: 'events', permission: 'events.view', label: 'Eventy', to: '/events', icon: Ticket, description: 'Akcie, technika, posádka a dokumenty' },
  { id: 'stage', permission: 'events.view', label: 'Pódium', to: '/stage', icon: LayoutGrid, description: 'Kalkulačka pódia: dosky, nohy, plachty, zábradlie' },
  { id: 'service', permission: 'service.view', label: 'Servis', to: '/service', icon: Wrench, description: 'Servisné záznamy' },
  { id: 'calendar', label: 'Kalendár', to: '/calendar', icon: CalendarDays, description: 'Kalendárový prehľad' },
  { id: 'todos', permission: 'tasks.view', label: 'Úlohy', to: '/todos', icon: ListTodo, description: 'Zoznam úloh' },
  { id: 'notifications', label: 'Upozornenia', to: '/notifications', icon: Bell, description: 'Čo potrebuje pozornosť' },
  { id: 'suggestions', permission: 'suggestions.view', label: 'Návrhy', to: '/suggestions', icon: Lightbulb, description: 'Návrhy na zlepšenie' },
  { id: 'staff', permission: 'staff.view', label: 'Zamestnanci', to: '/staff', icon: Users, description: 'Tím, kontakty a kto kedy môže' },
  { id: 'payouts', label: 'Odmeny', to: '/payouts', icon: Wallet, description: 'Odmeny a zálohy za akcie' },
  { id: 'stats', label: 'Štatistiky', to: '/stats', icon: ChartColumn, description: 'Dostupnosť, vyťaženie a náklady' },
  { id: 'settings', label: 'Nastavenia', to: '/settings', icon: Settings, description: 'Firma a používatelia' },
]

/** Položky menu, ktoré člen smie vidieť. Bez vybranej firmy (vývoj bez backendu) všetky. */
export function visibleNavItems(member: Permitted | null) {
  return NAV_ITEMS.filter((item) => !member || !item.permission || can(member, item.permission))
}

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
