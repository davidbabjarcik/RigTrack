import { resolveLookup, resolveOwner } from '@/features/equipment/api'
import { copyCompanyPhoto, storeCompanyPhoto } from '@/features/equipment/photo'
import type { Lookup } from '@/features/equipment/model'
import { getSupabase } from '@/lib/supabase/client'
import { isMissingColumn } from '@/lib/supabase/errors'
import { duplicateName, type Case, type CaseCheck, type CaseFormValues, type CheckPriority } from './model'

export const caseKeys = {
  list: (companyId: string) => ['company', companyId, 'cases'] as const,
  checks: (companyId: string, caseId: string) => ['company', companyId, 'cases', caseId, 'checks'] as const,
}

type Row = {
  id: string
  name: string
  inventory_number: string
  location_id: string | null
  label_number: string
  label_category: string
  label_title: string
  label_photo_path: string
  photo_path: string
  weight_kg: number | null
  width_cm: number | null
  length_cm: number | null
  depth_cm: number | null
  spot_id: string | null
  spot_level: number | null
  note: string
  updated_at: string
  owner_staff_id?: string | null
  check_priority?: CheckPriority
  old_numbers?: string
  kind?: 'case' | 'rack'
  rack_units?: number | null
}

const COLUMNS = 'id, name, inventory_number, location_id, label_number, label_category, label_title, label_photo_path, photo_path, weight_kg, width_cm, length_cm, depth_cm, spot_id, spot_level, note, updated_at'
// Vlastník (0052), priorita kontroly (0060) a staré čísla (0078); bez migrácie sa cases načítajú bez nich.
const OPTIONAL_COLUMNS = [', owner_staff_id, check_priority, old_numbers', ', owner_staff_id, check_priority', ', owner_staff_id', '']
let optionalLevel = 0
// Case / rack a výška v U (0099).
let rackColumns = ', kind, rack_units'
const missingRack = (error: { code?: string; message?: string } | null) => Boolean(rackColumns) && (isMissingColumn(error, 'kind') || isMissingColumn(error, 'rack_units'))
const hasOldNumbers = () => optionalLevel === 0
const hasOwnerColumn = () => optionalLevel < 3
const hasPriorityColumn = () => optionalLevel < 2
function fallBack(error: { code?: string; message?: string } | null) {
  if (!error || optionalLevel >= OPTIONAL_COLUMNS.length - 1) return false
  const missing = hasOldNumbers() ? ['old_numbers', 'check_priority'] : hasPriorityColumn() ? ['check_priority'] : ['owner_staff_id']
  if (!missing.some((column) => isMissingColumn(error, column))) return false
  optionalLevel += 1
  return true
}

// PostgREST môže numeric vrátiť ako číslo aj ako text.
const toNumber = (value: number | string | null) => (value === null ? null : Number(value))

type CheckRow = { case_id: string; checked_at: string; checked_by_name: string; note: string }

function toCheck(row: CheckRow): CaseCheck {
  return { checkedAt: row.checked_at, checkedByName: row.checked_by_name, note: row.note }
}

export async function fetchCases(companyId: string): Promise<Case[]> {
  const db = getSupabase()
  const [cases, checks] = await Promise.all([
    db.from('cases').select(COLUMNS + OPTIONAL_COLUMNS[optionalLevel] + rackColumns).eq('company_id', companyId).order('name'),
    db.from('case_last_checks').select('case_id, checked_at, checked_by_name, note').eq('company_id', companyId),
  ])
  if (missingRack(cases.error)) {
    rackColumns = ''
    return fetchCases(companyId)
  }
  if (fallBack(cases.error)) return fetchCases(companyId)
  const error = cases.error ?? checks.error
  if (error) throw error

  const lastChecks = new Map((checks.data as CheckRow[]).map((row) => [row.case_id, toCheck(row)]))
  return (cases.data as unknown as Row[]).map((row) => ({
    id: row.id,
    name: row.name,
    inventoryNumber: row.inventory_number,
    locationId: row.location_id,
    labelNumber: row.label_number,
    labelCategory: row.label_category,
    labelTitle: row.label_title,
    labelPhotoPath: row.label_photo_path,
    photoPath: row.photo_path,
    weightKg: toNumber(row.weight_kg),
    widthCm: toNumber(row.width_cm),
    lengthCm: toNumber(row.length_cm),
    depthCm: toNumber(row.depth_cm),
    spotId: row.spot_id,
    spotLevel: row.spot_level,
    note: row.note,
    updatedAt: row.updated_at,
    lastCheck: lastChecks.get(row.id) ?? null,
    ownerStaffId: row.owner_staff_id ?? null,
    checkPriority: row.check_priority ?? 'normal',
    oldNumbers: row.old_numbers ?? '',
    kind: row.kind ?? 'case',
    rackUnits: row.rack_units ?? null,
  }))
}

/** Posledné kontroly jedného case, najnovšia prvá. */
export async function fetchCaseChecks(companyId: string, caseId: string): Promise<CaseCheck[]> {
  const { data, error } = await getSupabase()
    .from('case_checks')
    .select('case_id, checked_at, checked_by_name, note')
    .eq('company_id', companyId)
    .eq('case_id', caseId)
    .order('checked_at', { ascending: false })
    .limit(10)
  if (error) throw error
  return (data as CheckRow[]).map(toCheck)
}

/** Kto a kedy kontroloval doplní databáza podľa prihláseného používateľa. */
export async function addCaseCheck(companyId: string, caseId: string, note: string) {
  const { error } = await getSupabase().from('case_checks').insert({ company_id: companyId, case_id: caseId, note: note.trim() })
  if (error) throw error
}

type SaveArgs = { companyId: string; id: string | null; values: CaseFormValues; locations: Lookup[] }

export async function saveCase({ companyId, id, values, locations }: SaveArgs): Promise<string> {
  const fields = {
    name: values.name,
    inventory_number: values.inventoryNumber,
    location_id: await resolveLookup(companyId, 'locations', values.location, locations),
    label_number: values.labelNumber,
    label_category: values.labelCategory,
    weight_kg: values.weightKg ?? null,
    width_cm: values.widthCm ?? null,
    length_cm: values.lengthCm ?? null,
    depth_cm: values.depthCm ?? null,
    note: values.note,
    ...(values.owner !== undefined && (values.owner !== '' || hasOwnerColumn()) ? { owner_staff_id: await resolveOwner(companyId, values.owner) } : {}),
    ...(values.checkPriority && (values.checkPriority !== 'normal' || hasPriorityColumn()) ? { check_priority: values.checkPriority } : {}),
    ...(hasOldNumbers() || values.oldNumbers?.trim() ? { old_numbers: (values.oldNumbers ?? '').trim() } : {}),
    ...(rackColumns || (values.kind && values.kind !== 'case') ? { kind: values.kind ?? 'case', rack_units: values.kind === 'rack' ? (values.rackUnits ?? null) : null } : {}),
  }
  const write = (row: Record<string, unknown>) => {
    const table = getSupabase().from('cases')
    return id ? table.update(row).eq('company_id', companyId).eq('id', id).select('id').single() : table.insert({ ...row, company_id: companyId }).select('id').single()
  }
  let row: Record<string, unknown> = fields
  let { data, error } = await write(row)
  // Databáza bez migrácie 0060 / 0052 nepozná prioritu / vlastníka – uloží sa bez nich.
  while (error && (missingRack(error) || fallBack(error))) {
    row = { ...row }
    if (missingRack(error)) rackColumns = ''
    if (!rackColumns) {
      delete row.kind
      delete row.rack_units
    }
    if (!hasOldNumbers()) delete row.old_numbers
    if (!hasPriorityColumn()) delete row.check_priority
    if (!hasOwnerColumn()) delete row.owner_staff_id
    ;({ data, error } = await write(row))
  }
  if (error) throw error
  return (data as { id: string }).id
}

/** Presunie case do koša. Technika z neho ostane v evidencii bez case; pri obnove sa doň vráti. */
export async function deleteCase(id: string) {
  const { error } = await getSupabase().rpc('trash_case', { _id: id })
  if (error) throw error
}

/** Vlastný obsah štítku: názov a/alebo fotka namiesto hlavného prvku z evidencie. */
export async function saveCaseLabelCustom(companyId: string, id: string, fields: { labelTitle?: string; labelPhotoPath?: string }) {
  const { data, error } = await getSupabase()
    .from('cases')
    .update({
      ...(fields.labelTitle !== undefined && { label_title: fields.labelTitle.trim() }),
      ...(fields.labelPhotoPath !== undefined && { label_photo_path: fields.labelPhotoPath }),
    })
    .eq('company_id', companyId)
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

/** Rovnaká fotka pre celú sadu cases; každý case dostane vlastnú kópiu (zmazanie pri jednom nepokazí ostatné). */
export async function setCaseGroupPhoto(companyId: string, caseIds: string[], file: File) {
  const [first, ...rest] = caseIds
  const path = await storeCompanyPhoto(companyId, `case-${first}`, file, { thumb: true })
  const db = getSupabase()
  const { error } = await db.from('cases').update({ photo_path: path }).eq('company_id', companyId).eq('id', first)
  if (error) throw error
  for (const id of rest) {
    const copy = await copyCompanyPhoto(companyId, path, `case-${id}`)
    const result = await db.from('cases').update({ photo_path: copy }).eq('company_id', companyId).eq('id', id)
    if (result.error) throw result.error
  }
}

/** Fotka case (nie štítku): uloží súbor aj s náhľadom a zapíše ho k case. */
export async function setCasePhoto(companyId: string, caseId: string, file: File) {
  const path = await storeCompanyPhoto(companyId, `case-${caseId}`, file, { thumb: true })
  const { data, error } = await getSupabase().from('cases').update({ photo_path: path }).eq('company_id', companyId).eq('id', caseId).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

/**
 * Kópia case: ďalšie číslo v sade („Beam case 3“ → „Beam case 4“), rovnaké rozmery, hmotnosť, kategória,
 * case / rack, umiestnenie, vlastník, priorita kontroly, poznámka a fotky. Technika vnútri sa nekopíruje.
 */
export async function duplicateCase(companyId: string, source: Case, all: Case[]): Promise<string> {
  const { name, labelNumber } = duplicateName(source, all)
  const row: Record<string, unknown> = {
    company_id: companyId,
    name,
    location_id: source.locationId,
    label_number: labelNumber,
    label_category: source.labelCategory,
    label_title: source.labelTitle,
    weight_kg: source.weightKg,
    width_cm: source.widthCm,
    length_cm: source.lengthCm,
    depth_cm: source.depthCm,
    note: source.note,
    ...(hasOwnerColumn() ? { owner_staff_id: source.ownerStaffId ?? null } : {}),
    ...(hasPriorityColumn() ? { check_priority: source.checkPriority ?? 'normal' } : {}),
    ...(rackColumns ? { kind: source.kind ?? 'case', rack_units: source.rackUnits ?? null } : {}),
  }
  const { data, error } = await getSupabase().from('cases').insert(row).select('id').single()
  if (error) throw error
  const id = (data as { id: string }).id
  // Fotky sa skopírujú ako samostatné súbory (zmazanie jednej neodstráni druhú); keď sa to nepodarí, case ostane bez nich.
  const photos: Record<string, string> = {}
  for (const [column, path] of [['photo_path', source.photoPath], ['label_photo_path', source.labelPhotoPath]] as const) {
    if (path) photos[column] = await copyCompanyPhoto(companyId, path, `case-${id}`).catch(() => '')
  }
  const filled = Object.fromEntries(Object.entries(photos).filter(([, path]) => path))
  if (Object.keys(filled).length > 0) await getSupabase().from('cases').update(filled).eq('company_id', companyId).eq('id', id)
  return id
}

/** Čo sa pri „Upraviť všetky naraz“ prenesie na ostatné cases v sade (nie názov, číslo, umiestnenie, fotky). */
const GROUP_COLUMNS = ['label_category', 'weight_kg', 'width_cm', 'length_cm', 'depth_cm', 'note', 'owner_staff_id', 'check_priority', 'kind', 'rack_units']

/** Prenesie spoločné údaje z jedného case na ostatné v sade (napr. 8× Beam case). */
export async function syncCaseGroup(companyId: string, sourceId: string, ids: string[]) {
  const others = ids.filter((id) => id !== sourceId)
  if (others.length === 0) return
  const db = getSupabase()
  const { data, error } = await db.from('cases').select('*').eq('company_id', companyId).eq('id', sourceId).single()
  if (error) throw error
  const source = data as Record<string, unknown>
  const shared = Object.fromEntries(GROUP_COLUMNS.filter((column) => column in source).map((column) => [column, source[column]]))
  const { error: updateError } = await db.from('cases').update(shared).eq('company_id', companyId).in('id', others)
  if (updateError) throw updateError
}
