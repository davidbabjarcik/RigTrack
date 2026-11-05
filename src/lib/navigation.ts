import { ArrowLeftRight, Briefcase, Building2, Cable, Calculator, CalendarDays, Car, ChartColumn, ClipboardCheck, Coffee, FileText, LayoutDashboard, Lightbulb, ListTodo, Printer, Receipt, Settings, ShieldAlert, Speaker, StickyNote, Ticket, Timer, Users, Wallet, Warehouse, Wifi, Wrench, type LucideIcon } from 'lucide-react'
import type { PermissionKey } from '@/features/permissions/catalog'
import { can, type Permitted } from './permissions'
import type { Lang } from './i18n'
import type { Role } from './roles'

export type NavItem = {
  id: string
  /** Oprávnenie, bez ktorého sa položka v menu neukáže. */
  permission?: PermissionKey
  label: string
  to: string
  icon: LucideIcon
  description: string
  /** Roly, ktorým sa položka nezobrazí (napr. helper nepotrebuje kalkulačky ani siete). */
  hiddenFor?: Role[]
  /** Bez hlavného oprávnenia sa položka ukáže s inou adresou (napr. Servis → len Žiadosti o servis). */
  fallback?: { to: string; permission?: PermissionKey }
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Prehľad', to: '/', icon: LayoutDashboard, description: 'Súhrn stavu techniky a najbližších akcií' },
  { id: 'equipment', permission: 'equipment.view', label: 'Technika', to: '/equipment', icon: Speaker, description: 'Evidencia kusov techniky' },
  { id: 'cases', permission: 'cases.view', label: 'Cases a racks', to: '/cases', icon: Briefcase, description: 'Cases, racky a ich obsah' },
  { id: 'warehouse', permission: 'cases.view', label: 'Sklad', to: '/warehouse', icon: Warehouse, description: 'Plán skladu a kde ktorý case leží' },
  {
    id: 'orders',
    permission: 'orders.view',
    label: 'Objednávky',
    to: '/orders',
    icon: Receipt,
    description: 'Nákupy, ich položky a wantlist',
    fallback: { to: '/shopping', permission: 'shopping.view' },
  },
  { id: 'vehicles', permission: 'vehicles.view', label: 'Vozidlá', to: '/vehicles', icon: Car, description: 'Autá, STK, známky a poistky' },
  { id: 'loans', permission: 'loans.view', label: 'Výpožičky', to: '/loans', icon: ArrowLeftRight, description: 'Vydaná a vrátená technika' },
  { id: 'events', permission: 'events.view', label: 'Eventy', to: '/events', icon: Ticket, description: 'Akcie, technika, posádka a dokumenty' },
  { id: 'offers', permission: 'offers.view', label: 'Cenové ponuky', to: '/offers', icon: FileText, description: 'Ponuky pre klientov s časťami, cenami a rozpočtom', hiddenFor: ['helper'] },
  { id: 'partners', permission: 'events.view', label: 'Firmy a kontakty', to: '/partners', icon: Building2, description: 'Organizátori, partneri a ich ľudia' },
  { id: 'calculators', label: 'Kalkulačky', to: '/calculators', icon: Calculator, description: 'Pódium Nivtec, delay subov, LED stena, DMX dip switch', hiddenFor: ['helper'] },
  {
    id: 'service',
    permission: 'service.view',
    label: 'Servis',
    to: '/service',
    icon: Wrench,
    description: 'Servisné záznamy, žiadosti o servis a servisní technici',
    fallback: { to: '/service/requests' },
  },
  { id: 'networks', permission: 'networks.view', label: 'Siete', to: '/networks', icon: Wifi, description: 'Wi-Fi siete, routery, IP a MAC adresy', hiddenFor: ['helper'] },
  { id: 'calendar', label: 'Kalendár', to: '/calendar', icon: CalendarDays, description: 'Kalendárový prehľad' },
  { id: 'todos', permission: 'tasks.view', label: 'Úlohy', to: '/todos', icon: ListTodo, description: 'Úlohy pre viac ľudí, kategórie, úlohy po evente' },
  { id: 'patch', permission: 'events.view', label: 'Patch listy', to: '/patch', icon: Cable, description: 'Šablóny patch listov zvuku a DMX pre eventy', hiddenFor: ['helper'] },
  { id: 'checks', permission: 'equipment.view', label: 'Kontroly', to: '/checks', icon: ClipboardCheck, description: 'Cases na kontrolu, odčítanie hodín a servis – moje alebo všetky' },
  { id: 'print', label: 'Tlač', to: '/print', icon: Printer, description: 'Štítky na tlač naraz – QR na A4 alebo na pásku, adresy a módy' },
  { id: 'notes', label: 'Poznámky', to: '/notes', icon: StickyNote, description: 'Zdieľané firemné poznámky, označení ľudia dostanú upozornenie' },
  { id: 'office', label: 'Kancelária', to: '/office', icon: Coffee, description: 'Voda, káva, poháre… – kto čo kúpil', hiddenFor: ['helper'] },
  { id: 'incidents', label: 'Škody a úrazy', to: '/incidents', icon: ShieldAlert, description: 'Rozbitá technika a úrazy, štatistiky' },
  { id: 'suggestions', permission: 'suggestions.view', label: 'Návrhy', to: '/suggestions', icon: Lightbulb, description: 'Návrhy na zlepšenie' },
  { id: 'staff', permission: 'staff.view', label: 'Zamestnanci', to: '/staff', icon: Users, description: 'Tím, kontakty a kto kedy môže' },
  { id: 'attendance', label: 'Dochádzka', to: '/attendance', icon: Timer, description: 'Práca na firme a doma, odpracované hodiny' },
  { id: 'payouts', label: 'Odmeny', to: '/payouts', icon: Wallet, description: 'Odmeny a zálohy za akcie' },
  { id: 'stats', label: 'Štatistiky', to: '/stats', icon: ChartColumn, description: 'Dostupnosť, vyťaženie a náklady', hiddenFor: ['helper'] },
  { id: 'settings', label: 'Nastavenia', to: '/settings', icon: Settings, description: 'Firma a používatelia' },
]

/** Anglické názvy a popisy modulov (jazyk EN). */
const NAV_EN: Record<string, [string, string]> = {
  dashboard: ['Overview', 'Summary of equipment and upcoming events'],
  equipment: ['Equipment', 'Inventory of every piece of gear'],
  cases: ['Cases & racks', 'Cases, racks and what is inside'],
  warehouse: ['Warehouse', 'Warehouse plan and where each case lies'],
  orders: ['Orders', 'Purchases, their items and the wantlist'],
  vehicles: ['Vehicles', 'Vans, inspections, vignettes and insurance'],
  loans: ['Loans', 'Equipment lent out and returned'],
  events: ['Events', 'Shows, gear, crew and documents'],
  offers: ['Quotes', 'Client quotes with sections, prices and budget'],
  partners: ['Companies & contacts', 'Organisers, partners and their people'],
  calculators: ['Calculators', 'Stage, sub delay, LED wall, DMX dip switch'],
  service: ['Service', 'Service records, requests and technicians'],
  networks: ['Networks', 'Wi-Fi networks, routers, IP and MAC addresses'],
  calendar: ['Calendar', 'Calendar overview'],
  todos: ['Tasks', 'Tasks for more people, categories, post-event tasks'],
  patch: ['Patch lists', 'Audio and DMX patch list templates for events'],
  checks: ['Checks', 'Cases to check, hour readings and service – mine or all'],
  print: ['Print', 'Labels to print at once – QR on A4 or tape, addresses and modes'],
  notes: ['Notes', 'Shared company notes, tagged people get notified'],
  office: ['Office', 'Water, coffee, cups… – who bought what'],
  incidents: ['Damage & injuries', 'Broken gear, losses and injuries, statistics'],
  suggestions: ['Suggestions', 'Ideas for improvement'],
  staff: ['Staff', 'Team, contacts and who is available when'],
  attendance: ['Attendance', 'Work at the company and from home, hours worked'],
  payouts: ['Payouts', 'Rewards and advances for events'],
  stats: ['Statistics', 'Availability, utilisation and costs'],
  settings: ['Settings', 'Company and users'],
}

/** Názov a popis položky menu v danom jazyku. */
export function localizeNav<T extends Pick<NavItem, 'id' | 'label' | 'description'>>(item: T, lang: Lang): T {
  const en = lang === 'en' ? NAV_EN[item.id] : undefined
  return en ? { ...item, label: en[0], description: en[1] } : item
}

/** Položky menu, ktoré člen smie vidieť. Bez vybranej firmy (vývoj bez backendu) všetky. */
export function visibleNavItems(member: Permitted | null, lang: Lang = 'sk') {
  return NAV_ITEMS.map((item) => localizeNav(item, lang)).flatMap((item) => {
    if (member && item.hiddenFor?.includes(member.role)) return []
    if (!member || !item.permission || can(member, item.permission)) return [item]
    if (item.fallback && (!item.fallback.permission || can(member, item.fallback.permission))) return [{ ...item, to: item.fallback.to }]
    return []
  })
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
