import { todayIso } from '@/lib/format'
import { getSupabase } from '@/lib/supabase/client'
import { downloadText } from '@/lib/download'
import { createZip, readZip, type ZipEntry } from '@/lib/zip'

// Záloha celej firmy: ZIP s jedným Excelom na modul, v každom hárky s tabuľkami databázy tak,
// ako sú uložené (stĺpce podľa databázy). Fotky a dokumenty sa nebalia, len ich zoznam a cesty.

export const BACKUP_FILES: { file: string; tables: { table: string; sheet: string }[] }[] = [
  {
    file: 'Technika.xlsx',
    tables: [
      { table: 'equipment', sheet: 'Technika' },
      { table: 'equipment_categories', sheet: 'Kategórie' },
      { table: 'locations', sheet: 'Umiestnenia' },
      { table: 'cable_colors', sheet: 'Farby káblov' },
      { table: 'equipment_hour_readings', sheet: 'Prevádzkové hodiny' },
      { table: 'equipment_aliases', sheet: 'Zapamätané názvy' },
      { table: 'equipment_packages', sheet: 'Balíky' },
      { table: 'mic_capsules', sheet: 'Kapsule' },
    ],
  },
  {
    file: 'Cases.xlsx',
    tables: [
      { table: 'cases', sheet: 'Cases' },
      { table: 'case_checks', sheet: 'Kontroly' },
      { table: 'case_templates', sheet: 'Šablóny' },
    ],
  },
  {
    file: 'Sklad.xlsx',
    tables: [
      { table: 'warehouses', sheet: 'Sklad' },
      { table: 'warehouse_spots', sheet: 'Miesta' },
    ],
  },
  {
    file: 'Objednávky.xlsx',
    tables: [
      { table: 'orders', sheet: 'Objednávky' },
      { table: 'order_items', sheet: 'Položky' },
      { table: 'order_item_equipment', sheet: 'Technika z položiek' },
    ],
  },
  { file: 'Wantlist.xlsx', tables: [{ table: 'shopping_items', sheet: 'Wantlist' }] },
  {
    file: 'Vozidlá.xlsx',
    tables: [
      { table: 'vehicles', sheet: 'Vozidlá' },
      { table: 'vehicle_records', sheet: 'Prevádzka' },
    ],
  },
  {
    file: 'Výpožičky.xlsx',
    tables: [
      { table: 'loans', sheet: 'Výpožičky' },
      { table: 'loan_items', sheet: 'Položky' },
    ],
  },
  {
    file: 'Eventy.xlsx',
    tables: [
      { table: 'events', sheet: 'Eventy' },
      { table: 'event_equipment', sheet: 'Technika' },
      { table: 'event_crew', sheet: 'Posádka' },
      { table: 'event_payments', sheet: 'Príjmy' },
      { table: 'event_documents', sheet: 'Dokumenty a fotky' },
      { table: 'event_days', sheet: 'Program po dňoch' },
      { table: 'event_links', sheet: 'Odkazy' },
      { table: 'event_partners', sheet: 'Organizátori a firmy' },
      { table: 'event_travel', sheet: 'Doprava' },
      { table: 'event_work_logs', sheet: 'Výkazy času' },
      { table: 'event_expenses', sheet: 'Výdavky' },
      { table: 'event_pack_checks', sheet: 'Pack list' },
      { table: 'event_meetings', sheet: 'Stretávky' },
      { table: 'event_attendance', sheet: 'Dochádzka' },
      { table: 'event_duties', sheet: 'Kto čo robil' },
      { table: 'event_capsules', sheet: 'Kapsule' },
      { table: 'event_patch', sheet: 'Patch list' },
    ],
  },
  {
    file: 'Firmy a kontakty.xlsx',
    tables: [
      { table: 'partners', sheet: 'Firmy' },
      { table: 'partner_contacts', sheet: 'Kontakty' },
      { table: 'company_profile', sheet: 'Údaje o našej firme' },
    ],
  },
  {
    file: 'Servis.xlsx',
    tables: [
      { table: 'service_records', sheet: 'Servis' },
      { table: 'service_technicians', sheet: 'Servisní technici' },
      { table: 'service_requests', sheet: 'Žiadosti o servis' },
    ],
  },
  {
    file: 'Úlohy.xlsx',
    tables: [
      { table: 'task_templates', sheet: 'Úlohy po evente' },
      { table: 'tasks', sheet: 'Úlohy' },
    ],
  },
  {
    file: 'Kancelária.xlsx',
    tables: [
      { table: 'office_items', sheet: 'Položky' },
      { table: 'office_purchases', sheet: 'Nákupy' },
    ],
  },
  { file: 'Škody a úrazy.xlsx', tables: [{ table: 'incidents', sheet: 'Škody a úrazy' }] },
  { file: 'Odmeny.xlsx', tables: [{ table: 'member_payments', sheet: 'Odmeny' }] },
  {
    file: 'Zamestnanci.xlsx',
    tables: [
      { table: 'staff', sheet: 'Zamestnanci' },
      { table: 'staff_unavailability', sheet: 'Kedy nemôžu' },
      { table: 'work_sessions', sheet: 'Dochádzka mimo eventov' },
      { table: 'member_devices', sheet: 'Zariadenia členov' },
      { table: 'wifi_networks', sheet: 'Wi-Fi siete' },
    ],
  },
  {
    file: 'Návrhy.xlsx',
    tables: [
      { table: 'suggestions', sheet: 'Návrhy' },
      { table: 'suggestion_comments', sheet: 'Komentáre' },
    ],
  },
  {
    file: 'Ostatné.xlsx',
    tables: [
      { table: 'attachments', sheet: 'Prílohy' },
      { table: 'stage_settings', sheet: 'Nastavenie Nivtec' },
      { table: 'event_rules', sheet: 'Pripomienky' },
      { table: 'company_duty_types', sheet: 'Činnosti' },
    ],
  },
]

export type Cell = string | number | boolean | null
/** Najdlhší text v bunke Excelu. */
const MAX_CELL = 32767

/** Hodnota z databázy do bunky: JSON a zoznamy ako text, ostatné tak, ako sú. */
export function toCell(value: unknown): Cell {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' || typeof value === 'boolean') return value
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return text.length > MAX_CELL ? text.slice(0, MAX_CELL) : text
}

/** Riadky tabuľky na hárok: hlavička je zjednotenie stĺpcov; prázdna tabuľka dostane len poznámku. */
export function rowsToSheet(rows: Record<string, unknown>[]): Cell[][] {
  if (rows.length === 0) return [['Žiadne záznamy']]
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
  return [columns, ...rows.map((row) => columns.map((column) => toCell(row[column])))]
}

const PAGE = 1000

/** Všetky riadky tabuľky firmy, po stránkach (server vracia najviac 1000 naraz). */
async function fetchAll(table: string, companyId: string) {
  const rows: Record<string, unknown>[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await getSupabase()
      .from(table)
      .select('*')
      .eq('company_id', companyId)
      .range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...(data as Record<string, unknown>[]))
    if (data.length < PAGE) return rows
  }
}

const README = (companyName: string, skipped: string[]) =>
  [
    `Záloha RigTrack – ${companyName}`,
    `Vytvorené: ${new Date().toLocaleString('sk-SK')}`,
    '',
    'Každý Excel je jeden modul; hárky sú tabuľky tak, ako sú uložené v databáze.',
    'Fotky a dokumenty (ridery, prílohy) v zálohe nie sú, len ich zoznam a cesty v úložisku.',
    'Zmazané záznamy v koši sa nezálohujú.',
    ...(skipped.length > 0 ? ['', 'Tieto tabuľky sa nepodarilo načítať (napr. chýba migrácia alebo oprávnenie):', ...skipped.map((name) => `- ${name}`)] : []),
  ].join('\r\n')

/**
 * Pripraví ZIP so zálohou celej firmy a stiahne ho. `onProgress` dostáva názov práve spracovaného súboru.
 * S `only` stiahne len jeden modul ako samostatný Excel.
 */
export async function downloadBackup(companyId: string, companyName: string, onProgress: (file: string) => void, only?: string) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const entries: ZipEntry[] = []
  const skipped: string[] = []
  for (const { file, tables } of BACKUP_FILES.filter((item) => !only || item.file === only)) {
    onProgress(file)
    const sheets = []
    for (const { table, sheet } of tables) {
      try {
        sheets.push({ sheet, data: rowsToSheet(await fetchAll(table, companyId)), stickyRowsCount: 1 })
      } catch {
        skipped.push(`${file} / ${sheet}`)
      }
    }
    if (sheets.length === 0) continue
    const blob = await writeXlsxFile(sheets).toBlob()
    entries.push({ name: file, data: new Uint8Array(await blob.arrayBuffer()) })
  }
  if (only) {
    const entry = entries[0]
    if (!entry) throw new Error('Modul sa nepodarilo načítať')
    const blob = new Blob([entry.data.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${entry.name.replace(/\.xlsx$/, '')} ${todayIso()}.xlsx`
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return { files: 1, skipped }
  }
  entries.push({ name: 'ČÍTAJ.txt', data: new TextEncoder().encode(README(companyName, skipped)) })

  const zip = createZip(entries)
  const url = URL.createObjectURL(new Blob([zip.buffer as ArrayBuffer], { type: 'application/zip' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `rigtrack-zaloha-${todayIso()}.zip`
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return { files: entries.length - 1, skipped }
}

// ---------------------------------------------------------------------------
// Obnova zo zálohy
// ---------------------------------------------------------------------------

/** Tabuľky, na ktoré sa iné odkazujú, sa obnovujú skôr. */
const RESTORE_FIRST = [
  'equipment_categories',
  'locations',
  'warehouses',
  'warehouse_spots',
  'case_templates',
  'cases',
  'equipment',
  'vehicles',
  'partners',
  'events',
  'loans',
  'orders',
  'order_items',
  'mic_capsules',
  'office_items',
  'staff',
  'task_templates',
  'company_duty_types',
]

export function restoreOrder() {
  const all = BACKUP_FILES.flatMap((item) => item.tables.map((table) => table.table))
  return [...RESTORE_FIRST.filter((table) => all.includes(table)), ...all.filter((table) => !RESTORE_FIRST.includes(table))]
}

/** Bunka z Excelu späť do databázy: text, ktorý vyzerá ako JSON (objekt, zoznam), sa rozparsuje. */
export function fromCell(value: unknown): unknown {
  if (value === undefined || value === '') return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string' && /^[[{]/.test(value.trim())) {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value
}

/** Hárok zálohy na riadky tabuľky; prázdny hárok („Žiadne záznamy“) = žiadne riadky. */
export function sheetToRows(data: unknown[][]): Record<string, unknown>[] {
  const [header, ...rest] = data
  if (!header || header.length === 0 || header[0] === 'Žiadne záznamy') return []
  const columns = header.map(String)
  return rest
    .filter((row) => row.some((cell) => cell !== null && cell !== undefined && cell !== ''))
    .map((row) => Object.fromEntries(columns.map((column, index) => [column, fromCell(row[index])])))
}

export type RestoreResult = { table: string; label: string; rows: number; inserted: number; error?: string }

/**
 * Obnoví zo zálohy (ZIP alebo jeden Excel z nej) záznamy, ktoré vo firme chýbajú (napr. omylom zmazané).
 * Existujúce záznamy sa nemenia. Záloha musí byť z tejto firmy – cudziu odmietne.
 */
export async function restoreBackup(companyId: string, file: File, onProgress: (label: string) => void): Promise<RestoreResult[]> {
  const { default: readXlsxFile } = await import('read-excel-file/browser')
  const bytes = new Uint8Array(await file.arrayBuffer())
  const workbooks = /\.zip$/i.test(file.name) ? (await readZip(bytes)).filter((entry) => entry.name.endsWith('.xlsx')) : [{ name: file.name, data: bytes }]
  const tables = new Map<string, { label: string; rows: Record<string, unknown>[] }>()
  for (const workbook of workbooks) {
    const module = BACKUP_FILES.find((item) => workbook.name.endsWith(item.file) || workbook.name.startsWith(item.file.replace(/\.xlsx$/, '')))
    if (!module) continue
    const sheets = (await readXlsxFile(new Blob([workbook.data.buffer as ArrayBuffer]))) as { sheet: string; data: unknown[][] }[]
    for (const { sheet, data } of sheets) {
      const target = module.tables.find((item) => item.sheet === sheet)
      if (target) tables.set(target.table, { label: `${module.file.replace(/\.xlsx$/, '')} / ${sheet}`, rows: sheetToRows(data) })
    }
  }
  if (tables.size === 0) throw new Error('V súbore nie je záloha RigTrack')
  const foreign = [...tables.values()].some(({ rows }) => rows.some((row) => 'company_id' in row && row.company_id !== companyId))
  if (foreign) throw new Error('Záloha je z inej firmy – obnoviť sa dá len do firmy, z ktorej je.')

  const results: RestoreResult[] = []
  for (const table of restoreOrder()) {
    const entry = tables.get(table)
    if (!entry || entry.rows.length === 0) continue
    onProgress(entry.label)
    let inserted = 0
    let error: string | undefined
    for (let from = 0; from < entry.rows.length && !error; from += 500) {
      const chunk = entry.rows.slice(from, from + 500)
      const response = await getSupabase().from(table).upsert(chunk, { ignoreDuplicates: true, count: 'exact' })
      if (response.error) error = [response.error.code, response.error.message].filter(Boolean).join(': ')
      else inserted += response.count ?? 0
    }
    results.push({ table, label: entry.label, rows: entry.rows.length, inserted, error })
  }
  return results
}

/** Výsledok obnovy ako text (na stiahnutie). */
export function downloadRestoreReport(results: RestoreResult[]) {
  const lines = results.map((item) => `${item.label}: v zálohe ${item.rows}, doplnené ${item.inserted}${item.error ? ` – chyba: ${item.error}` : ''}`)
  downloadText(`rigtrack-obnova-${todayIso()}.txt`, lines.join('\r\n'), 'text/plain;charset=utf-8')
}
