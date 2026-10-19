import {
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  Coffee,
  FileChartColumn,
  ChartColumn,
  HardHat,
  Car,
  ArrowLeftRight,
  AudioWaveform,
  LayoutDashboard,
  Lightbulb,
  LayoutGrid,
  Receipt,
  ListTodo,
  MessageSquareWarning,
  MonitorPlay,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Users,
  Speaker,
  Ticket,
  Wallet,
  Warehouse,
  Wifi,
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
  { id: 'cases', permission: 'cases.view', label: 'Cases a racks', to: '/cases', icon: Briefcase, description: 'Cases, racky a ich obsah' },
  { id: 'warehouse', permission: 'cases.view', label: 'Sklad', to: '/warehouse', icon: Warehouse, description: 'Plán skladu a kde ktorý case leží' },
  { id: 'orders', permission: 'orders.view', label: 'Objednávky', to: '/orders', icon: Receipt, description: 'Nákupy a ich položky' },
  { id: 'shopping', permission: 'shopping.view', label: 'Wantlist', to: '/shopping', icon: ShoppingCart, description: 'Čo kúpiť a čo chceme časom' },
  { id: 'vehicles', permission: 'vehicles.view', label: 'Vozidlá', to: '/vehicles', icon: Car, description: 'Autá, STK, známky a poistky' },
  { id: 'loans', permission: 'loans.view', label: 'Výpožičky', to: '/loans', icon: ArrowLeftRight, description: 'Vydaná a vrátená technika' },
  { id: 'events', permission: 'events.view', label: 'Eventy', to: '/events', icon: Ticket, description: 'Akcie, technika, posádka a dokumenty' },
  { id: 'partners', permission: 'events.view', label: 'Firmy a kontakty', to: '/partners', icon: Building2, description: 'Organizátori, partneri a ich ľudia' },
  { id: 'stage', permission: 'events.view', label: 'Pódium', to: '/stage', icon: LayoutGrid, description: 'Kalkulačka pódia: dosky, nohy, plachty, zábradlie' },
  { id: 'led', label: 'LED kalkulačka', to: '/led', icon: MonitorPlay, description: 'Panely, m², prúd, hliník a rigging na LED stenu' },
  { id: 'delay', label: 'Delay kalkulačka', to: '/delay', icon: AudioWaveform, description: 'Suby: cardioid, end-fire, rad, arc, delay veža' },
  { id: 'service', permission: 'service.view', label: 'Servis', to: '/service', icon: Wrench, description: 'Servisné záznamy' },
  { id: 'requests', label: 'Žiadosti o servis', to: '/service/requests', icon: MessageSquareWarning, description: 'Nahlásiť poruchu a čo sa s ňou deje' },
  { id: 'networks', label: 'Siete', to: '/networks', icon: Wifi, description: 'Wi-Fi siete, routery, IP a MAC adresy' },
  { id: 'technicians', permission: 'service.view', label: 'Servisní technici', to: '/technicians', icon: HardHat, description: 'Kto opravuje techniku a autá' },
  { id: 'calendar', label: 'Kalendár', to: '/calendar', icon: CalendarDays, description: 'Kalendárový prehľad' },
  { id: 'todos', permission: 'tasks.view', label: 'Úlohy', to: '/todos', icon: ListTodo, description: 'Úlohy pre viac ľudí, kategórie, úlohy po evente' },
  { id: 'office', label: 'Kancelária', to: '/office', icon: Coffee, description: 'Voda, káva, poháre… – kto čo kúpil' },
  { id: 'incidents', label: 'Škody a úrazy', to: '/incidents', icon: ShieldAlert, description: 'Rozbitá technika a úrazy, štatistiky' },
  { id: 'notifications', label: 'Upozornenia', to: '/notifications', icon: Bell, description: 'Čo potrebuje pozornosť' },
  { id: 'suggestions', permission: 'suggestions.view', label: 'Návrhy', to: '/suggestions', icon: Lightbulb, description: 'Návrhy na zlepšenie' },
  { id: 'staff', permission: 'staff.view', label: 'Zamestnanci', to: '/staff', icon: Users, description: 'Tím, kontakty a kto kedy môže' },
  { id: 'payouts', label: 'Odmeny', to: '/payouts', icon: Wallet, description: 'Odmeny a zálohy za akcie' },
  { id: 'report', permission: 'report.view', label: 'Ročná správa', to: '/report', icon: FileChartColumn, description: 'Čo sa za rok udialo – eventy, ľudia, technika, peniaze' },
  { id: 'stats', label: 'Štatistiky', to: '/stats', icon: ChartColumn, description: 'Dostupnosť, vyťaženie a náklady' },
  { id: 'settings', label: 'Nastavenia', to: '/settings', icon: Settings, description: 'Firma a používatelia' },
]

/** Položky menu, ktoré člen smie vidieť. Bez vybranej firmy (vývoj bez backendu) všetky. */
export function visibleNavItems(member: Permitted | null) {
  return NAV_ITEMS.filter((item) => !member || !item.permission || can(member, item.permission))
}

/** Spodná lišta na mobile: Prehľad je vždy prvý, potom PINNED_COUNT vybraných modulov a nakoniec „Viac“. */
export const FIXED_PINNED = 'dashboard'
export const PINNED_COUNT = 3
export const DEFAULT_PINNED = ['equipment', 'events', 'loans']

const STORAGE_KEY = 'rigtrack:pinned-nav'

function isValidPinned(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length === PINNED_COUNT &&
    new Set(value).size === PINNED_COUNT &&
    value.every((id) => id !== FIXED_PINNED && NAV_ITEMS.some((item) => item.id === id))
  )
}

/** Poškodené alebo zastarané nastavenie sa ticho nahradí predvoleným. */
export function loadPinned(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (isValidPinned(parsed)) return parsed
    // Staré nastavenie (4 položky, Prehľad medzi nimi): Prehľad je teraz pevný, ostatné sa ponechajú.
    if (Array.isArray(parsed) && parsed.length === 4) {
      const kept = parsed.filter((id) => id !== FIXED_PINNED).slice(0, PINNED_COUNT)
      if (isValidPinned(kept)) return kept
    }
    return DEFAULT_PINNED
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
