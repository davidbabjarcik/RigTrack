import { todayIso } from '@/lib/format'
import { getSupabase } from '@/lib/supabase/client'
import { createZip, type ZipEntry } from '@/lib/zip'

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
  { file: 'Nákupy.xlsx', tables: [{ table: 'shopping_items', sheet: 'Nákupy' }] },
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
    ],
  },
  { file: 'Servis.xlsx', tables: [{ table: 'service_records', sheet: 'Servis' }] },
  { file: 'Úlohy.xlsx', tables: [{ table: 'tasks', sheet: 'Úlohy' }] },
  { file: 'Odmeny.xlsx', tables: [{ table: 'member_payments', sheet: 'Odmeny' }] },
  {
    file: 'Zamestnanci.xlsx',
    tables: [
      { table: 'staff', sheet: 'Zamestnanci' },
      { table: 'staff_unavailability', sheet: 'Kedy nemôžu' },
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

/** Pripraví ZIP so zálohou celej firmy a stiahne ho. `onProgress` dostáva názov práve spracovaného súboru. */
export async function downloadBackup(companyId: string, companyName: string, onProgress: (file: string) => void) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const entries: ZipEntry[] = []
  const skipped: string[] = []
  for (const { file, tables } of BACKUP_FILES) {
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
