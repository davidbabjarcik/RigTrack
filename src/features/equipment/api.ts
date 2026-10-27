import type { CategoryColor } from './categoryColors'
import { getSupabase } from '@/lib/supabase/client'
import { isMissingColumn } from '@/lib/supabase/errors'
import { copyCompanyPhoto } from './photo'
import {
  attributesFor,
  cableName,
  isLighting,
  isSimpleKind,
  normalizeMac,
  parseUnitIds,
  unitInfoFromForm,
  unitRange,
  type CableSetValues,
  type CaptureMatch,
  type Equipment,
  type EquipmentAttributes,
  type EquipmentFormValues,
  type EquipmentKind,
  type EquipmentLink,
  type EquipmentStatus,
  type LabelRole,
  type Lookup,
  type UnitInfo,
} from './model'

export type LookupTable = 'equipment_categories' | 'locations'

export const equipmentKeys = {
  list: (companyId: string) => ['company', companyId, 'equipment'] as const,
  detail: (companyId: string, id: string) => ['company', companyId, 'equipment', id] as const,
  lookup: (companyId: string, table: LookupTable) => ['company', companyId, table] as const,
}

const COLUMNS =
  'id, name, kind, attributes, category_id, location_id, case_id, label_role, quantity, track_units, unit_ids, rental_price, min_quantity, manufacturer, model, serial_number, ' +
  'inventory_number, mac_address, ip_address, service_interval_months, last_service_on, hours_interval_months, operating_hours, hours_read_on, photo_path, status, note, updated_at'
// Novšie stĺpce: vlastník (0052), dátum nákupu, odkazy, Capture (0060) a údaje po kusoch (0078). Bez migrácie
// chýbajú – technika sa vtedy načíta bez nich (skúša sa od najnovšej sady), aby appka fungovala ďalej.
const EXTRA = ', owner_staff_id, purchased_on, unit_purchases, links, clone_of, capture_match, capture_note'
const OPTIONAL_COLUMNS = [EXTRA + ', unit_info', EXTRA, ', owner_staff_id', '']
let optionalLevel = 0
const optionalColumns = () => OPTIONAL_COLUMNS[optionalLevel]
const hasUnitInfo = () => optionalLevel === 0
const hasOwnerColumn = () => optionalLevel < 3
const hasExtraColumns = () => optionalLevel < 2
/** Pri chýbajúcom stĺpci skúsi staršiu sadu; vráti true, ak je čo skúsiť. */
function fallBack(error: { code?: string; message?: string } | null) {
  if (!error || optionalLevel >= OPTIONAL_COLUMNS.length - 1) return false
  const extra = ['purchased_on', 'unit_purchases', 'links', 'clone_of', 'capture_match', 'capture_note']
  const missing = hasUnitInfo() ? ['unit_info', ...extra] : hasExtraColumns() ? extra : ['owner_staff_id']
  if (!missing.some((column) => isMissingColumn(error, column))) return false
  optionalLevel += 1
  return true
}

type Row = {
  id: string
  name: string
  kind: EquipmentKind
  attributes: EquipmentAttributes | null
  category_id: string | null
  location_id: string | null
  case_id: string | null
  label_role: LabelRole | null
  min_quantity: number | null
  track_units: boolean
  unit_ids: number[] | null
  rental_price: number | string | null
  quantity: number
  manufacturer: string
  model: string
  serial_number: string
  inventory_number: string
  mac_address: string
  ip_address: string
  service_interval_months: number | null
  last_service_on: string | null
  hours_interval_months: number | null
  operating_hours: number | string | null
  hours_read_on: string | null
  photo_path: string
  status: EquipmentStatus
  note: string
  updated_at: string
  owner_staff_id?: string | null
  purchased_on?: string | null
  unit_purchases?: Record<string, string> | null
  unit_info?: Record<string, UnitInfo> | null
  links?: EquipmentLink[] | null
  clone_of?: string
  capture_match?: CaptureMatch | ''
  capture_note?: string
}

function fromRow(row: Row): Equipment {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    attributes: row.attributes ?? {},
    categoryId: row.category_id,
    locationId: row.location_id,
    caseId: row.case_id,
    labelRole: row.label_role,
    minQuantity: row.min_quantity,
    trackUnits: row.track_units,
    unitIds: row.unit_ids ?? [],
    rentalPrice: row.rental_price === null ? null : Number(row.rental_price),
    quantity: row.quantity,
    manufacturer: row.manufacturer,
    model: row.model,
    serialNumber: row.serial_number,
    inventoryNumber: row.inventory_number,
    macAddress: row.mac_address,
    ipAddress: row.ip_address,
    serviceIntervalMonths: row.service_interval_months,
    lastServiceOn: row.last_service_on,
    hoursIntervalMonths: row.hours_interval_months,
    operatingHours: row.operating_hours === null ? null : Number(row.operating_hours),
    hoursReadOn: row.hours_read_on,
    photoPath: row.photo_path,
    status: row.status,
    note: row.note,
    updatedAt: row.updated_at,
    ownerStaffId: row.owner_staff_id ?? null,
    purchasedOn: row.purchased_on ?? null,
    unitPurchases: row.unit_purchases ?? {},
    unitInfo: row.unit_info ?? {},
    links: row.links ?? [],
    cloneOf: row.clone_of ?? '',
    captureMatch: row.capture_match ?? '',
    captureNote: row.capture_note ?? '',
  }
}

// Supabase vracia najviac 1000 riadkov na dotaz, preto sa zoznam načíta po stranách.
const PAGE = 1000

// IP a MAC techniky sú od 0107 v equipment_addresses – databáza ich vráti len s oprávnením „Vidieť IP a MAC adresy“.
let addressTable = true

async function withAddresses(companyId: string, items: Equipment[]): Promise<Equipment[]> {
  if (!addressTable || items.length === 0) return items
  const { data, error } = await getSupabase().from('equipment_addresses').select('equipment_id, ip, mac').eq('company_id', companyId)
  if (error) {
    if (/equipment_addresses/.test(error.message ?? '')) addressTable = false
    return items
  }
  const byId = new Map((data as { equipment_id: string; ip: string; mac: string }[]).map((row) => [row.equipment_id, row]))
  return items.map((item) => {
    const address = byId.get(item.id)
    return address ? { ...item, ipAddress: address.ip, macAddress: address.mac } : item
  })
}

/** Uloží IP a MAC techniky (len s oprávnením; bez migrácie 0107 sa uložia priamo pri technike). */
async function saveAddresses(companyId: string, equipmentId: string, ip: string, mac: string) {
  const { error } = await getSupabase().from('equipment_addresses').upsert({ equipment_id: equipmentId, company_id: companyId, ip, mac }, { onConflict: 'equipment_id' })
  if (error) throw error
}

export async function fetchEquipmentList(companyId: string): Promise<Equipment[]> {
  return withAddresses(companyId, await fetchEquipmentRows(companyId))
}

async function fetchEquipmentRows(companyId: string): Promise<Equipment[]> {
  const all: Equipment[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await getSupabase()
      .from('equipment')
      .select(COLUMNS + optionalColumns())
      .eq('company_id', companyId)
      .order('name')
      .order('id')
      .range(from, from + PAGE - 1)
    if (fallBack(error)) return fetchEquipmentRows(companyId)
    if (error) throw error
    all.push(...(data as unknown as Row[]).map(fromRow))
    if (data.length < PAGE) return all
  }
}

export async function fetchEquipment(companyId: string, id: string): Promise<Equipment | null> {
  const { data, error } = await getSupabase()
    .from('equipment')
    .select(COLUMNS + optionalColumns())
    .eq('company_id', companyId)
    .eq('id', id)
    .maybeSingle()
  if (fallBack(error)) return fetchEquipment(companyId, id)
  if (error) throw error
  return data ? (await withAddresses(companyId, [fromRow(data as unknown as Row)]))[0] : null
}

export async function fetchLookup(companyId: string, table: LookupTable): Promise<Lookup[]> {
  const columns = table === 'equipment_categories' ? 'id, name, consumable, color' : 'id, name'
  const { data, error } = await getSupabase().from(table).select(columns).eq('company_id', companyId).order('name')
  if (error) throw error
  return data as unknown as Lookup[]
}

/** Nájde kategóriu/umiestnenie podľa názvu, alebo ho založí. Prázdny názov = bez priradenia. */
export async function resolveLookup(companyId: string, table: LookupTable, name: string, existing: Lookup[]) {
  if (!name) return null
  const match = existing.find((item) => item.name.toLowerCase() === name.toLowerCase())
  if (match) return match.id
  const { data, error } = await getSupabase().from(table).insert({ company_id: companyId, name }).select('id').single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function renameLookup(table: LookupTable, id: string, name: string) {
  const { data, error } = await getSupabase().from(table).update({ name: name.trim() }).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

export async function deleteLookup(table: LookupTable, id: string) {
  const { data, error } = await getSupabase().from(table).delete().eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}

export async function setCategoryColor(id: string, color: CategoryColor | null) {
  const { data, error } = await getSupabase().from('equipment_categories').update({ color }).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

export async function setCategoryConsumable(id: string, consumable: boolean) {
  const { data, error } = await getSupabase().from('equipment_categories').update({ consumable }).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

type SaveArgs = {
  /** Smie človek vidieť a meniť IP a MAC (networks.addresses)? Bez neho sa adresy neposielajú ani nemažú. */
  addresses?: boolean
  companyId: string
  id: string | null
  values: EquipmentFormValues
  categories: Lookup[]
  locations: Lookup[]
}

/** Kópia fotky inej techniky k novej (pri duplikovaní); keď sa nepodarí, technika ostane bez fotky. */
export async function copyEquipmentPhoto(companyId: string, equipmentId: string, sourcePath: string) {
  const path = await copyCompanyPhoto(companyId, sourcePath, `equipment-${equipmentId}`)
  const { error } = await getSupabase().from('equipment').update({ photo_path: path }).eq('company_id', companyId).eq('id', equipmentId)
  if (error) throw error
}

/** Údaje kusov (sériové čísla, DMX…) jednej položky – napr. DMX všetkým naraz z prehľadu skupiny. */
export async function saveUnitInfo(companyId: string, equipmentId: string, unitInfo: Record<string, UnitInfo>) {
  const { error } = await getSupabase().from('equipment').update({ unit_info: unitInfo }).eq('company_id', companyId).eq('id', equipmentId)
  if (error) throw error
}

/** Čo sa pri „Upraviť všetky naraz“ prenesie na ostatné časti rozdelenej techniky (nie počet, čísla kusov, case, stav). */
const GROUP_COLUMNS = ['name', 'kind', 'attributes', 'category_id', 'manufacturer', 'model', 'service_interval_months', 'hours_interval_months', 'rental_price', 'min_quantity', 'note', 'photo_path', 'owner_staff_id']

/** Prenesie spoločné údaje z jednej časti rozdelenej techniky na ostatné (napr. Beam 7R v 8 cases). */
export async function syncEquipmentGroup(companyId: string, sourceId: string, ids: string[]) {
  const others = ids.filter((id) => id !== sourceId)
  if (others.length === 0) return
  const db = getSupabase()
  const { data, error } = await db.from('equipment').select('*').eq('company_id', companyId).eq('id', sourceId).single()
  if (error) throw error
  const source = data as Record<string, unknown>
  // Len stĺpce, ktoré databáza má (staršie databázy nemusia mať všetky).
  const shared = Object.fromEntries(GROUP_COLUMNS.filter((column) => column in source).map((column) => [column, source[column]]))
  const { error: updateError } = await db.from('equipment').update(shared).eq('company_id', companyId).in('id', others)
  if (updateError) throw updateError
}

export async function saveEquipment({ companyId, id, values, categories, locations, addresses = true }: SaveArgs): Promise<string> {
  // Polia, na ktoré sa formulár pri danom druhu nepýta, sa vyprázdnia, aby po zmene druhu neostali staré hodnoty.
  const simple = isSimpleKind(values.kind, values.category)
  const fields = {
    name: values.name,
    kind: values.kind,
    attributes: attributesFor(values),
    category_id: await resolveLookup(companyId, 'equipment_categories', values.category, categories),
    location_id: await resolveLookup(companyId, 'locations', values.location, locations),
    manufacturer: values.manufacturer,
    model: values.model,
    serial_number: simple ? '' : values.serialNumber,
    inventory_number: values.inventoryNumber,
    // Bez tabuľky adries (pred 0107) sa adresy ukladajú pri technike; inak zvlášť nižšie.
    ...(!addressTable && addresses !== false ? { mac_address: simple ? '' : normalizeMac(values.macAddress), ip_address: simple ? '' : values.ipAddress } : {}),
    service_interval_months: simple ? null : (values.serviceIntervalMonths ?? null),
    last_service_on: simple ? null : values.lastServiceOn || null,
    // Interval odčítania sa ráta z úrovne kontroly (attributes); starý interval v mesiacoch sa nahrádza.
    hours_interval_months: simple || values.trackHours !== undefined ? null : (values.hoursIntervalMonths ?? null),
    case_id: values.caseId || null,
    quantity: values.quantity,
    min_quantity: values.minQuantity ?? null,
    track_units: values.trackUnits,
    // Vlastné čísla určujú aj počet kusov; databáza si ho z nich dopočíta.
    unit_ids: values.trackUnits ? parseUnitIds(values.unitIds) : [],
    rental_price: values.rentalPrice ?? null,
    status: values.status,
    note: values.note,
    // Vlastník sa posiela len keď je zadaný alebo sa mení, aby uloženie fungovalo aj bez migrácie 0052.
    ...(values.owner !== undefined && (values.owner !== '' || hasOwnerColumn()) ? { owner_staff_id: await resolveOwner(companyId, values.owner) } : {}),
    // Údaje z 0060 len keď ich databáza pozná alebo sú vyplnené (inak chyba povie, čo chýba).
    ...(hasExtraColumns() || extrasFilled(values) ? extraFields(values) : {}),
    // Údaje po kusoch (0078) len keď ich databáza pozná alebo sú vyplnené.
    ...(hasUnitInfo() || values.unitInfo?.some((unit) => unit.serial.trim() || unit.inv.trim() || (unit.from ?? '').trim() || (unit.dmxLine ?? '').trim() || unit.dmxAddress || (unit.dmxMode ?? '').trim()) ? { unit_info: unitInfoOf(values) } : {}),
  }
  const write = (row: Record<string, unknown>) => {
    const table = getSupabase().from('equipment')
    return id ? table.update(row).eq('company_id', companyId).eq('id', id).select('id').single() : table.insert({ ...row, company_id: companyId }).select('id').single()
  }
  let row: Record<string, unknown> = fields
  let { data, error } = await write(row)
  // Databáza bez migrácie 0060 / 0052 nepozná nové stĺpce – uloží sa bez nich.
  while (error && fallBack(error)) {
    row = { ...row }
    if (!hasUnitInfo()) delete row.unit_info
    if (!hasExtraColumns()) for (const column of EXTRA_COLUMNS) delete row[column]
    if (!hasOwnerColumn()) delete row.owner_staff_id
    ;({ data, error } = await write(row))
  }
  if (error) throw error
  const savedId = (data as { id: string }).id
  // IP a MAC do chránenej tabuľky (aj prázdne – tak sa adresa zmaže), len keď ich človek smie vidieť.
  if (addressTable && addresses) {
    const simple = isSimpleKind(values.kind, values.category)
    await saveAddresses(companyId, savedId, simple ? '' : values.ipAddress, simple ? '' : normalizeMac(values.macAddress)).catch((reason: { message?: string }) => {
      if (/equipment_addresses/.test(reason.message ?? '')) addressTable = false
      else throw reason
    })
  }
  return savedId
}

/** Čísla kusov podľa formulára (vlastné čísla alebo 1..počet); bez evidencie po kusoch žiadne. */
function formUnits(values: EquipmentFormValues) {
  return values.trackUnits ? new Set(values.unitIds ? parseUnitIds(values.unitIds) : unitRange(values.quantity)) : new Set<number>()
}

function unitInfoOf(values: EquipmentFormValues) {
  return unitInfoFromForm(values.unitInfo ?? [], formUnits(values))
}

const EXTRA_COLUMNS = ['purchased_on', 'unit_purchases', 'links', 'clone_of', 'capture_match', 'capture_note']

function extrasFilled(values: EquipmentFormValues) {
  return Boolean(values.purchasedOn || values.links?.length || values.cloneOf || values.captureMatch || values.unitPurchases?.some((unit) => unit.date))
}

/** Dátum nákupu, odkazy a Capture z formulára; Capture a kópia len pri svetlách. */
export function extraFields(values: EquipmentFormValues) {
  // Príslušenstvo (háky, klemy…) nie je fixtúra – bez Capture a „kópia čoho“.
  const lighting = isLighting(values.kind, values.category) && !values.lightType?.startsWith('acc_')
  const units = values.trackUnits ? new Set(values.unitIds ? parseUnitIds(values.unitIds) : unitRange(values.quantity)) : new Set<number>()
  return {
    purchased_on: values.purchasedOn || null,
    unit_purchases: Object.fromEntries((values.unitPurchases ?? []).filter((unit) => unit.date && units.has(unit.unit)).map((unit) => [String(unit.unit), unit.date])),
    links: (values.links ?? []).map((link) => ({ title: link.title.trim(), url: link.url.trim(), tag: link.tag })),
    clone_of: lighting ? (values.cloneOf ?? '').trim() : '',
    capture_match: lighting ? (values.captureMatch ?? '') : '',
    capture_note: lighting && values.captureMatch && values.captureMatch !== 'yes' ? (values.captureNote ?? '').trim() : '',
  }
}

/** „m-<id člena>“ = člen bez karty zamestnanca: kartu najprv založí. Prázdne = firma. */
export async function resolveOwner(companyId: string, owner: string) {
  if (!owner) return null
  if (!owner.startsWith('m-')) return owner
  const { saveStaff } = await import('@/features/staff/api')
  return saveStaff(companyId, null, owner.slice(2), { name: '', position: '', phone: '', email: '', skills: '', note: '', active: true })
}

type CableSetArgs = { companyId: string; values: CableSetValues; categories: Lookup[]; locations: Lookup[] }

/** Založí jednu položku techniky za každú dĺžku kábla. Všetko jedným zápisom: buď všetky, alebo žiadna. */
export async function createCableSet({ companyId, values, categories, locations }: CableSetArgs) {
  const categoryId = await resolveLookup(companyId, 'equipment_categories', values.category, categories)
  const locationId = await resolveLookup(companyId, 'locations', values.location, locations)
  const rows = values.rows.map((row) => ({
    company_id: companyId,
    name: cableName(values.namePrefix, row.lengthM),
    kind: 'cable',
    attributes: { ...(values.connector && { connector: values.connector }), lengthM: row.lengthM },
    category_id: categoryId,
    location_id: locationId,
    quantity: row.quantity,
  }))
  const { error } = await getSupabase().from('equipment').insert(rows)
  if (error) throw error
}

/** Presunie techniku do koša; admin ju odtiaľ 30 dní vie obnoviť. Fotka aj história ostávajú. */
export async function deleteEquipment(id: string) {
  const { error } = await getSupabase().rpc('trash_equipment', { _id: id })
  if (error) throw error
}

/** Vloží techniku do case, alebo ju z neho vyberie (caseId = null). */
export async function setEquipmentCase(companyId: string, equipmentId: string, caseId: string | null) {
  const { data, error } = await getSupabase()
    .from('equipment')
    .update({ case_id: caseId })
    .eq('company_id', companyId)
    .eq('id', equipmentId)
    .select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

/** Nastaví rolu techniky na štítku case. Nový hlavný prvok nahradí doterajší (rieši databáza). */
export async function setEquipmentLabelRole(companyId: string, equipmentId: string, role: LabelRole | null) {
  const { data, error } = await getSupabase()
    .from('equipment')
    .update({ label_role: role })
    .eq('company_id', companyId)
    .eq('id', equipmentId)
    .select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

/** Rýchla zmena počtu kusov (spotreba, doplnenie) bez otvárania formulára. */
export async function setEquipmentQuantity(companyId: string, equipmentId: string, quantity: number) {
  const { data, error } = await getSupabase()
    .from('equipment')
    .update({ quantity })
    .eq('company_id', companyId)
    .eq('id', equipmentId)
    .select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

export type HourReading = { id: string; readOn: string; hours: number; note: string; authorName: string; unit: number | null }

export const hourReadingKeys = {
  list: (companyId: string, equipmentId: string) => ['company', companyId, 'equipment', equipmentId, 'hours'] as const,
}

/** Odčítania počítadla prevádzkových hodín jedného zariadenia, najnovšie prvé. */
export async function fetchHourReadings(companyId: string, equipmentId: string): Promise<HourReading[]> {
  const query = (columns: string) =>
    getSupabase()
      .from('equipment_hour_readings')
      .select(columns)
      .eq('company_id', companyId)
      .eq('equipment_id', equipmentId)
      .order('read_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100)
  let { data, error } = await query('id, read_on, hours, note, author_name, unit')
  // Bez migrácie 0078 odčítania po kusoch nie sú.
  if (isMissingColumn(error, 'unit')) ({ data, error } = await query('id, read_on, hours, note, author_name'))
  if (error) throw error
  const rows = data as unknown as { id: string; read_on: string; hours: number | string; note: string; author_name: string; unit?: number | null }[]
  return rows.map((row) => ({ id: row.id, readOn: row.read_on, hours: Number(row.hours), note: row.note, authorName: row.author_name, unit: row.unit ?? null }))
}

/** Kto odčítal, doplní databáza; stav na technike prepíše trigger. */
export async function addHourReading(companyId: string, equipmentId: string, reading: { readOn: string; hours: number; note: string; unit?: number | null }) {
  const { error } = await getSupabase()
    .from('equipment_hour_readings')
    .insert({
      company_id: companyId,
      equipment_id: equipmentId,
      read_on: reading.readOn,
      hours: reading.hours,
      note: reading.note.trim(),
      ...(reading.unit ? { unit: reading.unit } : {}),
    })
  if (error) throw error
}

/** Dá časť kusov do case (napr. 2 zo 16 svetiel); ostatné ostanú v pôvodnej položke. Vráti id položky v case (0086). */
/** Vybrať z case: technika ide von a spojí sa s tou istou technikou mimo case (0110). Bez migrácie len vyberie. */
export async function takeOutOfCase(companyId: string, equipmentId: string) {
  const { error } = await getSupabase().rpc('take_out_of_case', { _id: equipmentId })
  if (error && /take_out_of_case/.test(error.message ?? '')) return setEquipmentCase(companyId, equipmentId, null)
  if (error) throw error
}

/** Spojí časť rozdelenej techniky do inej (kusy, čísla kusov aj história) – 0110. */
export async function mergeEquipment(fromId: string, intoId: string) {
  const { error } = await getSupabase().rpc('merge_equipment', { _from: fromId, _into: intoId })
  if (error) throw error
}

/** Do case idú vybrané čísla kusov (napr. #7 a #8), zvyšok ostane s pôvodnými číslami (0100). */
export async function splitEquipmentUnits(equipmentId: string, caseId: string | null, unitIds: number[]): Promise<string> {
  const { data, error } = await getSupabase().rpc('split_equipment_units', { _equipment_id: equipmentId, _case_id: caseId, _unit_ids: unitIds })
  if (error) throw error
  return data as string
}

export async function splitEquipmentIntoCase(equipmentId: string, caseId: string | null, count: number): Promise<string> {
  const { data, error } = await getSupabase().rpc('split_equipment_into_case', { _equipment_id: equipmentId, _case_id: caseId, _count: count })
  if (error) throw error
  return data as string
}
