// História zmien: čítanie záznamov z audit_log a ich preklad do zrozumiteľnej podoby.

export type AuditAction = 'insert' | 'update' | 'delete'

export type AuditEntry = {
  id: number
  actorName: string
  action: AuditAction
  entity: string
  entityId: string | null
  label: string
  changed: string[]
  createdAt: string
}

export const ACTION_LABELS: Record<AuditAction, string> = {
  insert: 'pridal(a)',
  update: 'upravil(a)',
  delete: 'odstránil(a)',
}

/** Tabuľka → čo to je a kde sa na to dá pozrieť. */
export const ENTITIES: Record<string, { label: string; path?: string }> = {
  equipment: { label: 'techniku', path: '/equipment' },
  cases: { label: 'case', path: '/cases' },
  loans: { label: 'výpožičku', path: '/loans' },
  orders: { label: 'objednávku', path: '/orders' },
  vehicles: { label: 'vozidlo', path: '/vehicles' },
  service_records: { label: 'servisný záznam', path: '/service' },
  events: { label: 'event', path: '/events' },
  service_technicians: { label: 'servisného technika' },
  wifi_networks: { label: 'Wi-Fi sieť' },
}

// Stĺpce, ktoré sa menia najčastejšie; ostatné sa vypíšu technickým názvom.
const COLUMN_LABELS: Record<string, string> = {
  name: 'názov',
  status: 'stav',
  quantity: 'počet kusov',
  min_quantity: 'hranica zásoby',
  note: 'poznámka',
  case_id: 'case',
  category_id: 'kategória',
  location_id: 'umiestnenie',
  label_role: 'rola na štítku',
  photo_path: 'fotka',
  last_service_on: 'posledný servis',
  service_interval_months: 'servisný interval',
  serial_number: 'sériové číslo',
  inventory_number: 'inventárne číslo',
  mac_address: 'MAC adresa',
  ip_address: 'IP adresa',
  starts_on: 'začiatok',
  ends_on: 'koniec',
  issued_at: 'vydanie',
  returned_at: 'vrátenie',
  borrower: 'komu',
  odometer_km: 'tachometer',
  stk_until: 'STK',
  ek_until: 'emisná kontrola',
  vignette_until: 'diaľničná známka',
  pzp_until: 'PZP',
  casco_until: 'havarijné poistenie',
  leasing_until: 'leasing',
  weight_kg: 'hmotnosť',
  label_number: 'číslo na štítku',
  label_category: 'kategória na štítku',
  problem: 'popis problému',
  work_done: 'vykonané úkony',
  hours: 'čas práce',
  cost: 'náklady',
  technician: 'technik',
  client: 'klient',
  venue: 'miesto',
}

export function describeChanges(changed: string[]) {
  return changed.map((column) => COLUMN_LABELS[column] ?? column).join(', ')
}

/** Odkaz na záznam, ak ešte existuje (zmazané záznamy odkaz nemajú). */
export function entryLink(entry: Pick<AuditEntry, 'action' | 'entity' | 'entityId'>) {
  const path = ENTITIES[entry.entity]?.path
  if (!path || !entry.entityId || entry.action === 'delete') return null
  return `${path}/${entry.entityId}`
}

export const AUDIT_EXPORT_COLUMNS = [
  { title: 'Kedy', width: 20 },
  { title: 'Kto', width: 26 },
  { title: 'Čo urobil', width: 14 },
  { title: 'Čo', width: 18 },
  { title: 'Názov', width: 32 },
  { title: 'Zmenené polia', width: 40 },
  { title: 'ID záznamu', width: 38 },
]

/** Riadok histórie zmien do Excelu. `when` formátuje čas (v aplikácii podľa slovenského zápisu). */
export function auditExportRow(entry: AuditEntry, when: (iso: string) => string) {
  return [
    when(entry.createdAt),
    entry.actorName,
    ACTION_LABELS[entry.action],
    ENTITIES[entry.entity]?.label ?? entry.entity,
    entry.label,
    entry.action === 'update' ? describeChanges(entry.changed) : '',
    entry.entityId ?? '',
  ]
}
