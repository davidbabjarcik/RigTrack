import { AUDIO_TYPE_LABELS, AUDIO_TYPES, EQUIPMENT_KINDS, EQUIPMENT_STATUSES, isValidIp, KIND_LABELS, normalizeMac, STATUS_LABELS } from './model'
import type { AudioType, Equipment, EquipmentAttributes, EquipmentKind, EquipmentStatus, Lookup } from './model'

// Export a import techniky v Exceli. Stĺpce majú slovenské hlavičky; druh, stav a typ zvuku sa píšu
// slovom (napr. „Svetlo“, „Dostupná“), pri importe sa berú aj bez diakritiky a bez ohľadu na veľkosť písmen.
// Stĺpec ID vypĺňa appka: riadok s ID upraví existujúcu techniku, riadok bez ID založí novú.

export const COLUMNS = [
  { key: 'name', title: 'Názov *', width: 32, hint: 'Povinné. Napr. Mixpult X32' },
  { key: 'kind', title: 'Druh', width: 18, hint: Object.values(KIND_LABELS).join(' / ') },
  { key: 'category', title: 'Kategória', width: 18, hint: 'Nová kategória sa založí sama' },
  { key: 'location', title: 'Umiestnenie', width: 18, hint: 'Nové umiestnenie sa založí samo' },
  { key: 'case', title: 'Case', width: 18, hint: 'Názov existujúceho case' },
  { key: 'quantity', title: 'Počet kusov', width: 12, hint: 'Číslo, prázdne = 1' },
  { key: 'manufacturer', title: 'Výrobca', width: 16, hint: '' },
  { key: 'model', title: 'Model', width: 16, hint: '' },
  { key: 'serialNumber', title: 'Sériové číslo', width: 16, hint: '' },
  { key: 'inventoryNumber', title: 'Inventárne číslo', width: 16, hint: 'Nesmie sa opakovať' },
  { key: 'macAddress', title: 'MAC adresa', width: 18, hint: '00:1A:2B:3C:4D:5E' },
  { key: 'ipAddress', title: 'IP adresa', width: 15, hint: '192.168.1.10' },
  { key: 'rentalPrice', title: 'Cena prenájmu €/deň', width: 14, hint: 'Číslo' },
  { key: 'status', title: 'Stav', width: 14, hint: Object.values(STATUS_LABELS).join(' / ') },
  { key: 'lengthM', title: 'Dĺžka (m)', width: 10, hint: 'Kábel, truss' },
  { key: 'connector', title: 'Konektor', width: 16, hint: 'Kábel, napr. XLR' },
  { key: 'powerW', title: 'Výkon (W)', width: 10, hint: 'Svetlo, zvuk' },
  { key: 'audioType', title: 'Typ zvuku', width: 16, hint: Object.values(AUDIO_TYPE_LABELS).join(' / ') },
  { key: 'note', title: 'Poznámka', width: 30, hint: '' },
  { key: 'id', title: 'ID (nemeniť)', width: 38, hint: 'Vypĺňa appka; prázdne = nová technika' },
] as const

export type ColumnKey = (typeof COLUMNS)[number]['key']
export type ExcelCell = string | number | null

const plain = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/** Riadok tabuľky z jednej techniky (poradie podľa COLUMNS). */
export function toExcelRow(item: Equipment, categories: Lookup[], locations: Lookup[], cases: { id: string; name: string }[]): ExcelCell[] {
  const a = item.attributes
  const values: Record<ColumnKey, ExcelCell> = {
    name: item.name,
    kind: KIND_LABELS[item.kind],
    category: categories.find((c) => c.id === item.categoryId)?.name ?? '',
    location: locations.find((l) => l.id === item.locationId)?.name ?? '',
    case: cases.find((c) => c.id === item.caseId)?.name ?? '',
    quantity: item.quantity,
    manufacturer: item.manufacturer,
    model: item.model,
    serialNumber: item.serialNumber,
    inventoryNumber: item.inventoryNumber,
    macAddress: item.macAddress,
    ipAddress: item.ipAddress,
    rentalPrice: item.rentalPrice,
    status: STATUS_LABELS[item.status],
    lengthM: a.lengthM ?? null,
    connector: a.connector ?? '',
    powerW: a.powerW ?? null,
    audioType: a.audioType ? AUDIO_TYPE_LABELS[a.audioType] : '',
    note: item.note,
    id: item.id,
  }
  return COLUMNS.map((column) => values[column.key])
}

/** Technika z riadku Excelu pripravená na zápis. */
export type ImportedItem = {
  row: number
  id: string | null
  name: string
  kind: EquipmentKind
  category: string
  location: string
  caseName: string
  quantity: number
  manufacturer: string
  model: string
  serialNumber: string
  inventoryNumber: string
  macAddress: string
  ipAddress: string
  rentalPrice: number | null
  status: EquipmentStatus
  attributes: EquipmentAttributes
  note: string
}

export type ImportResult = { items: ImportedItem[]; errors: string[] }

const byLabel = <T extends string>(codes: readonly T[], labels: Record<T, string>, text: string) => {
  const wanted = plain(text)
  return codes.find((code) => plain(labels[code]) === wanted || plain(code) === wanted) ?? null
}

const toText = (value: unknown, max: number) => (value === null || value === undefined ? '' : String(value).trim().slice(0, max))

function toNumber(value: unknown): number | null | 'bad' {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 'bad'
}

/**
 * Prečíta tabuľku: prvý riadok sú hlavičky (podľa nich sa nájdu stĺpce, poradie nevadí),
 * prázdne riadky a riadok s vysvetlivkami sa preskočia. Chyby sa hlásia s číslom riadku v Exceli.
 */
export function parseExcelRows(
  rows: unknown[][],
  existingIds: Set<string>,
  options: { sheet?: string; defaultCategory?: string; checkDuplicates?: boolean } = {},
): ImportResult {
  const where = (row: number) => (options.sheet ? `Hárok ${options.sheet}, riadok ${row}` : `Riadok ${row}`)
  const errors: string[] = []
  const items: ImportedItem[] = []
  if (rows.length === 0) return { items, errors: options.sheet ? [] : ['Súbor je prázdny.'] }
  const header = rows[0].map((cell) => plain(toText(cell, 80)))
  const index = new Map<ColumnKey, number>()
  for (const column of COLUMNS) {
    const position = header.findIndex((title) => title === plain(column.title) || title === plain(column.title.replace(' *', '')))
    if (position >= 0) index.set(column.key, position)
  }
  if (!index.has('name')) {
    return { items, errors: [`${options.sheet ? `Hárok ${options.sheet}: c` : 'C'}hýba stĺpec „Názov“. Použite tabuľku z exportu.`] }
  }

  rows.slice(1).forEach((cells, offset) => {
    const row = offset + 2
    const get = (key: ColumnKey) => (index.has(key) ? cells[index.get(key)!] : null)
    const text = (key: ColumnKey, max = 200) => toText(get(key), max)
    if (cells.every((cell) => toText(cell, 1) === '')) return
    // Riadok s vysvetlivkami z exportu.
    if (text('name') === COLUMNS[0].hint) return
    const problems: string[] = []

    const name = text('name', 120)
    if (!name) problems.push('chýba názov')
    const kindText = text('kind')
    const kind = kindText ? byLabel(EQUIPMENT_KINDS, KIND_LABELS, kindText) : 'general'
    if (!kind) problems.push(`neznámy druh „${kindText}“`)
    const statusText = text('status')
    const status = statusText ? byLabel(EQUIPMENT_STATUSES, STATUS_LABELS, statusText) : 'available'
    if (!status) problems.push(`neznámy stav „${statusText}“`)
    const audioText = text('audioType')
    const audioType = audioText ? byLabel<AudioType>(AUDIO_TYPES, AUDIO_TYPE_LABELS, audioText) : null
    if (audioText && !audioType) problems.push(`neznámy typ zvuku „${audioText}“`)

    const quantity = toNumber(get('quantity'))
    if (quantity === 'bad' || (quantity !== null && (!Number.isInteger(quantity) || quantity < 0 || quantity > 100000))) problems.push('počet kusov musí byť celé číslo')
    const rentalPrice = toNumber(get('rentalPrice'))
    if (rentalPrice === 'bad' || (rentalPrice !== null && rentalPrice < 0)) problems.push('cena musí byť číslo')
    const lengthM = toNumber(get('lengthM'))
    if (lengthM === 'bad' || (lengthM !== null && lengthM <= 0)) problems.push('dĺžka musí byť kladné číslo')
    const powerW = toNumber(get('powerW'))
    if (powerW === 'bad' || (powerW !== null && powerW <= 0)) problems.push('výkon musí byť kladné číslo')

    const mac = text('macAddress', 40)
    const macAddress = mac ? normalizeMac(mac) : ''
    if (mac && !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(macAddress)) problems.push(`neplatná MAC „${mac}“`)
    const ipAddress = text('ipAddress', 40)
    if (ipAddress && !isValidIp(ipAddress)) problems.push(`neplatná IP „${ipAddress}“`)

    const idText = text('id', 60)
    const id = idText && existingIds.has(idText) ? idText : null
    if (idText && !id) problems.push('ID nepatrí žiadnej technike tejto firmy (pre novú techniku ho nechajte prázdne)')

    if (problems.length > 0) {
      errors.push(`${where(row)}: ${problems.join(', ')}.`)
      return
    }
    const attributes: EquipmentAttributes = {}
    const connector = text('connector', 60)
    if (connector) attributes.connector = connector
    if (typeof lengthM === 'number') attributes.lengthM = lengthM
    if (typeof powerW === 'number') attributes.powerW = powerW
    if (audioType) attributes.audioType = audioType
    items.push({
      row,
      id,
      name,
      kind: kind!,
      category: text('category', 80) || (options.defaultCategory ?? ''),
      location: text('location', 80),
      caseName: text('case', 120),
      quantity: typeof quantity === 'number' ? quantity : 1,
      manufacturer: text('manufacturer', 80),
      model: text('model', 80),
      serialNumber: text('serialNumber', 80),
      inventoryNumber: text('inventoryNumber', 40),
      macAddress,
      ipAddress,
      rentalPrice: typeof rentalPrice === 'number' ? Math.round(rentalPrice * 100) / 100 : null,
      status: status!,
      attributes,
      note: text('note', 2000),
    })
  })

  if (options.checkDuplicates !== false) errors.push(...duplicateNumbers(items.map((item) => ({ inventoryNumber: item.inventoryNumber, where: where(item.row) }))))
  return { items, errors }
}

/** Rovnaké inventárne číslo dvakrát v súbore by databáza odmietla celé naraz. */
function duplicateNumbers(items: { inventoryNumber: string; where: string }[]) {
  const errors: string[] = []
  const seen = new Map<string, string>()
  for (const item of items) {
    const key = item.inventoryNumber.toLowerCase()
    if (!key) continue
    const first = seen.get(key)
    if (first) errors.push(`${item.where}: inventárne číslo „${item.inventoryNumber}“ sa opakuje (prvýkrát: ${first.charAt(0).toLowerCase()}${first.slice(1)}).`)
    else seen.set(key, item.where)
  }
  return errors
}

// ---------------------------------------------------------------------------
// Cases a celý zošit
// ---------------------------------------------------------------------------

export const CASES_SHEET = 'Cases'
/** Hárky techniky pre prázdnu šablónu, keď firma ešte nemá kategórie. */
export const TEMPLATE_SHEETS = ['Zvuk', 'Svetlo', 'Pódium', 'Truss', 'Káble', 'Spotrebný materiál']
export const NO_CATEGORY_SHEET = 'Bez kategórie'

export const CASE_COLUMNS = [
  { key: 'name', title: 'Názov *', width: 28, hint: 'Povinné. Napr. Audio case 1' },
  { key: 'inventoryNumber', title: 'Označenie / číslo', width: 16, hint: 'Nesmie sa opakovať' },
  { key: 'location', title: 'Umiestnenie', width: 18, hint: 'Nové umiestnenie sa založí samo' },
  { key: 'weightKg', title: 'Hmotnosť (kg)', width: 12, hint: 'Číslo' },
  { key: 'widthCm', title: 'Šírka (cm)', width: 11, hint: 'Číslo' },
  { key: 'lengthCm', title: 'Dĺžka (cm)', width: 11, hint: 'Číslo' },
  { key: 'depthCm', title: 'Hĺbka (cm)', width: 11, hint: 'Číslo' },
  { key: 'note', title: 'Poznámka', width: 30, hint: '' },
  { key: 'id', title: 'ID (nemeniť)', width: 38, hint: 'Vypĺňa appka; prázdne = nový case' },
] as const

export type CaseKey = (typeof CASE_COLUMNS)[number]['key']
export type CaseLike = {
  id: string
  name: string
  inventoryNumber: string
  locationId: string | null
  weightKg: number | null
  widthCm: number | null
  lengthCm: number | null
  depthCm: number | null
  note: string
}

export function toCaseRow(item: CaseLike, locations: Lookup[]): ExcelCell[] {
  const values: Record<CaseKey, ExcelCell> = {
    name: item.name,
    inventoryNumber: item.inventoryNumber,
    location: locations.find((l) => l.id === item.locationId)?.name ?? '',
    weightKg: item.weightKg,
    widthCm: item.widthCm,
    lengthCm: item.lengthCm,
    depthCm: item.depthCm,
    note: item.note,
    id: item.id,
  }
  return CASE_COLUMNS.map((column) => values[column.key])
}

export type ImportedCase = {
  row: number
  id: string | null
  name: string
  inventoryNumber: string
  location: string
  weightKg: number | null
  widthCm: number | null
  lengthCm: number | null
  depthCm: number | null
  note: string
}

export function parseCaseRows(rows: unknown[][], existingIds: Set<string>): { cases: ImportedCase[]; errors: string[] } {
  const cases: ImportedCase[] = []
  const errors: string[] = []
  if (rows.length === 0) return { cases, errors }
  const header = rows[0].map((cell) => plain(toText(cell, 80)))
  const index = new Map<CaseKey, number>()
  for (const column of CASE_COLUMNS) {
    const position = header.findIndex((title) => title === plain(column.title) || title === plain(column.title.replace(' *', '')))
    if (position >= 0) index.set(column.key, position)
  }
  if (!index.has('name')) return { cases, errors: [`Hárok ${CASES_SHEET}: chýba stĺpec „Názov“.`] }
  rows.slice(1).forEach((cells, offset) => {
    const row = offset + 2
    const get = (key: CaseKey) => (index.has(key) ? cells[index.get(key)!] : null)
    const text = (key: CaseKey, max = 200) => toText(get(key), max)
    if (cells.every((cell) => toText(cell, 1) === '')) return
    if (text('name') === CASE_COLUMNS[0].hint) return
    const problems: string[] = []
    const name = text('name', 120)
    if (!name) problems.push('chýba názov')
    const numbers = (['weightKg', 'widthCm', 'lengthCm', 'depthCm'] as const).map((key) => {
      const value = toNumber(get(key))
      if (value === 'bad' || (value !== null && value <= 0)) {
        problems.push(`${CASE_COLUMNS.find((c) => c.key === key)!.title.toLowerCase()} musí byť kladné číslo`)
      }
      return typeof value === 'number' && value > 0 ? value : null
    })
    const idText = text('id', 60)
    const id = idText && existingIds.has(idText) ? idText : null
    if (idText && !id) problems.push('ID nepatrí žiadnemu case tejto firmy (pre nový ho nechajte prázdne)')
    if (problems.length > 0) {
      errors.push(`Hárok ${CASES_SHEET}, riadok ${row}: ${problems.join(', ')}.`)
      return
    }
    const [weightKg, widthCm, lengthCm, depthCm] = numbers
    cases.push({
      row,
      id,
      name,
      inventoryNumber: text('inventoryNumber', 40),
      location: text('location', 80),
      weightKg,
      widthCm,
      lengthCm,
      depthCm,
      note: text('note', 2000),
    })
  })
  errors.push(...duplicateNumbers(cases.map((item) => ({ inventoryNumber: item.inventoryNumber, where: `Hárok ${CASES_SHEET}, riadok ${item.row}` }))))
  return { cases, errors }
}

/** Názov hárku pre Excel: bez zakázaných znakov, najviac 31 znakov, jedinečný. */
export function sheetName(name: string, taken: Set<string>) {
  const base = (name.replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim() || NO_CATEGORY_SHEET).slice(0, 31)
  let candidate = base
  for (let n = 2; [...taken].some((other) => other.toLowerCase() === candidate.toLowerCase()); n++) candidate = `${base.slice(0, 26)} (${n})`
  taken.add(candidate)
  return candidate
}

export type WorkbookResult = { items: (ImportedItem & { sheet: string })[]; cases: ImportedCase[]; errors: string[] }

/**
 * Celý zošit: hárok Cases sú cases, ostatné hárky technika. Názov hárku je kategória techniky,
 * ak ju riadok nemá vyplnenú (okrem hárku „Bez kategórie“ a starého jednohárkového exportu „Technika“).
 */
export function parseWorkbook(sheets: { sheet: string; data: unknown[][] }[], equipmentIds: Set<string>, caseIds: Set<string>): WorkbookResult {
  const items: (ImportedItem & { sheet: string })[] = []
  const errors: string[] = []
  let cases: ImportedCase[] = []
  for (const { sheet, data } of sheets) {
    if (plain(sheet) === plain(CASES_SHEET)) {
      const parsed = parseCaseRows(data, caseIds)
      cases = parsed.cases
      errors.push(...parsed.errors)
      continue
    }
    const neutral = [NO_CATEGORY_SHEET, 'Technika'].some((name) => plain(name) === plain(sheet))
    const parsed = parseExcelRows(data, equipmentIds, { sheet, defaultCategory: neutral ? '' : sheet, checkDuplicates: false })
    items.push(...parsed.items.map((item) => ({ ...item, sheet })))
    errors.push(...parsed.errors)
  }
  errors.push(...duplicateNumbers(items.map((item) => ({ inventoryNumber: item.inventoryNumber, where: `Hárok ${item.sheet}, riadok ${item.row}` }))))
  return { items, cases, errors }
}

