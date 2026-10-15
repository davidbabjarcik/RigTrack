import type { Row, SheetData } from 'write-excel-file/browser'
import { getSupabase } from '@/lib/supabase/client'
import { todayIso } from '@/lib/format'
import { resolveLookup } from './api'
import {
  CASE_COLUMNS,
  CASES_SHEET,
  COLUMNS,
  NO_CATEGORY_SHEET,
  sheetName,
  TEMPLATE_SHEETS,
  toCaseRow,
  toExcelRow,
  type CaseLike,
  type ImportedCase,
  type ImportedItem,
} from './excel'
import type { Equipment, Lookup } from './model'

// Knižnice na Excel sú veľké; načítajú sa až pri exporte či importe.

const headerRow = (columns: readonly { title: string }[]): Row => columns.map((column) => ({ value: column.title, fontWeight: 'bold', backgroundColor: '#FDE68A' }))
const hintRow = (columns: readonly { hint: string }[]): Row => columns.map((column) => ({ value: column.hint, fontStyle: 'italic', color: '#6B7280' }))
const cells = (values: (string | number | null)[]): Row => values.map((value) => (value === '' ? null : value))

/**
 * Stiahne techniku a cases ako jeden .xlsx: každá kategória techniky na vlastnom hárku, cases na hárku „Cases“.
 * Každý hárok má hlavičku a riadok s vysvetlivkami; prázdna firma dostane prázdne hárky na vyplnenie.
 */
export async function exportEquipment(items: Equipment[], categories: Lookup[], locations: Lookup[], cases: CaseLike[]) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const taken = new Set<string>([CASES_SHEET])
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name, 'sk'))
  const groups = new Map<string, Equipment[]>()
  for (const category of [...categories].sort((a, b) => a.name.localeCompare(b.name, 'sk'))) groups.set(category.id, [])
  for (const item of sorted) {
    const key = item.categoryId && groups.has(item.categoryId) ? item.categoryId : ''
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  const sheets: { sheet: string; data: SheetData }[] = []
  const equipmentSheet = (title: string, list: Equipment[]) => ({
    sheet: sheetName(title, taken),
    data: [headerRow(COLUMNS), hintRow(COLUMNS), ...list.map((item) => cells(toExcelRow(item, categories, locations, cases)))],
  })
  if (categories.length === 0 && items.length === 0) {
    for (const title of TEMPLATE_SHEETS) sheets.push(equipmentSheet(title, []))
  } else {
    for (const [key, list] of groups) {
      if (key === '') continue
      sheets.push(equipmentSheet(categories.find((category) => category.id === key)!.name, list))
    }
  }
  sheets.push(equipmentSheet(NO_CATEGORY_SHEET, groups.get('') ?? []))
  sheets.push({
    sheet: CASES_SHEET,
    data: [
      headerRow(CASE_COLUMNS),
      hintRow(CASE_COLUMNS),
      ...[...cases].sort((a, b) => a.name.localeCompare(b.name, 'sk')).map((item) => cells(toCaseRow(item, locations))),
    ],
  })
  const widths = (columns: readonly { width: number }[]) => columns.map((column) => ({ width: column.width }))
  await writeXlsxFile(
    sheets.map((sheet) => ({ ...sheet, columns: widths(sheet.sheet === CASES_SHEET ? CASE_COLUMNS : COLUMNS), stickyRowsCount: 1 })),
  ).toFile(`technika-a-cases-${todayIso()}.xlsx`)
}

/** Všetky hárky súboru. */
export async function readWorkbookFile(file: File): Promise<{ sheet: string; data: unknown[][] }[]> {
  const { default: readXlsxFile } = await import('read-excel-file/browser')
  return (await readXlsxFile(file)) as { sheet: string; data: unknown[][] }[]
}

/**
 * Zapíše import: najprv cases (aby sa na ne technika mohla odvolať aj keď sú nové), potom techniku.
 * Kategórie a umiestnenia podľa názvu (chýbajúce založí). Nové záznamy jedným zápisom, existujúce (podľa ID) po jednom.
 * Pri technike evidovanej po kusoch sa počet nemení – určujú ho čísla kusov.
 */
export async function writeImport(
  companyId: string,
  imported: { items: ImportedItem[]; cases: ImportedCase[] },
  context: { equipment: Equipment[]; categories: Lookup[]; locations: Lookup[]; cases: { id: string; name: string }[] },
) {
  const db = getSupabase()
  const categories = [...context.categories]
  const locations = [...context.locations]
  const knownCases = [...context.cases]
  const lookup = async (table: 'equipment_categories' | 'locations', name: string, known: Lookup[]) => {
    const id = await resolveLookup(companyId, table, name, known)
    if (id && !known.some((item) => item.id === id)) known.push({ id, name })
    return id
  }

  const caseFields = async (item: ImportedCase) => ({
    name: item.name,
    inventory_number: item.inventoryNumber,
    location_id: await lookup('locations', item.location, locations),
    weight_kg: item.weightKg,
    width_cm: item.widthCm,
    length_cm: item.lengthCm,
    depth_cm: item.depthCm,
    note: item.note,
  })
  const newCases = []
  for (const item of imported.cases.filter((candidate) => !candidate.id)) newCases.push({ ...(await caseFields(item)), company_id: companyId })
  if (newCases.length > 0) {
    const { data, error } = await db.from('cases').insert(newCases).select('id, name')
    if (error) throw error
    knownCases.push(...(data as { id: string; name: string }[]))
  }
  for (const item of imported.cases.filter((candidate) => candidate.id)) {
    const { error } = await db.from('cases').update(await caseFields(item)).eq('company_id', companyId).eq('id', item.id!)
    if (error) throw error
    const known = knownCases.find((box) => box.id === item.id)
    if (known) known.name = item.name
  }

  const caseId = (name: string) => knownCases.find((item) => item.name.toLowerCase() === name.toLowerCase())?.id ?? null
  const toFields = async (item: ImportedItem) => ({
    name: item.name,
    kind: item.kind,
    attributes: item.attributes,
    category_id: await lookup('equipment_categories', item.category, categories),
    location_id: await lookup('locations', item.location, locations),
    case_id: item.caseName ? caseId(item.caseName) : null,
    manufacturer: item.manufacturer,
    model: item.model,
    serial_number: item.serialNumber,
    inventory_number: item.inventoryNumber,
    mac_address: item.macAddress,
    ip_address: item.ipAddress,
    rental_price: item.rentalPrice,
    status: item.status,
    note: item.note,
  })

  const inserts = []
  for (const item of imported.items.filter((candidate) => !candidate.id)) inserts.push({ ...(await toFields(item)), quantity: item.quantity, company_id: companyId })
  if (inserts.length > 0) {
    const { error } = await db.from('equipment').insert(inserts)
    if (error) throw error
  }
  for (const item of imported.items.filter((candidate) => candidate.id)) {
    const current = context.equipment.find((equipment) => equipment.id === item.id)
    const fields = await toFields(item)
    const { error } = await db
      .from('equipment')
      .update(current?.trackUnits ? fields : { ...fields, quantity: item.quantity })
      .eq('company_id', companyId)
      .eq('id', item.id!)
    if (error) throw error
  }
}
