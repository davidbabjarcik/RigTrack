import { resolveLookup } from '@/features/equipment/api'
import type { Lookup } from '@/features/equipment/model'
import { getSupabase } from '@/lib/supabase/client'
import type { Case, CaseCheck, CaseFormValues } from './model'

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
  weight_kg: number | null
  width_cm: number | null
  length_cm: number | null
  depth_cm: number | null
  note: string
  updated_at: string
}

const COLUMNS = 'id, name, inventory_number, location_id, label_number, label_category, label_title, label_photo_path, weight_kg, width_cm, length_cm, depth_cm, note, updated_at'

// PostgREST môže numeric vrátiť ako číslo aj ako text.
const toNumber = (value: number | string | null) => (value === null ? null : Number(value))

type CheckRow = { case_id: string; checked_at: string; checked_by_name: string; note: string }

function toCheck(row: CheckRow): CaseCheck {
  return { checkedAt: row.checked_at, checkedByName: row.checked_by_name, note: row.note }
}

export async function fetchCases(companyId: string): Promise<Case[]> {
  const db = getSupabase()
  const [cases, checks] = await Promise.all([
    db.from('cases').select(COLUMNS).eq('company_id', companyId).order('name'),
    db.from('case_last_checks').select('case_id, checked_at, checked_by_name, note').eq('company_id', companyId),
  ])
  const error = cases.error ?? checks.error
  if (error) throw error

  const lastChecks = new Map((checks.data as CheckRow[]).map((row) => [row.case_id, toCheck(row)]))
  return (cases.data as Row[]).map((row) => ({
    id: row.id,
    name: row.name,
    inventoryNumber: row.inventory_number,
    locationId: row.location_id,
    labelNumber: row.label_number,
    labelCategory: row.label_category,
    labelTitle: row.label_title,
    labelPhotoPath: row.label_photo_path,
    weightKg: toNumber(row.weight_kg),
    widthCm: toNumber(row.width_cm),
    lengthCm: toNumber(row.length_cm),
    depthCm: toNumber(row.depth_cm),
    note: row.note,
    updatedAt: row.updated_at,
    lastCheck: lastChecks.get(row.id) ?? null,
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
  }
  const table = getSupabase().from('cases')
  const { data, error } = id
    ? await table.update(fields).eq('company_id', companyId).eq('id', id).select('id').single()
    : await table.insert({ ...fields, company_id: companyId }).select('id').single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function deleteCase(companyId: string, id: string) {
  const { data, error } = await getSupabase().from('cases').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
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
