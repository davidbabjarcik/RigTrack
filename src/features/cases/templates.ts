import { getSupabase } from '@/lib/supabase/client'

// Šablóny cases (0034_case_templates.sql): typ case s rozmermi, z ktorého sa zakladajú nové.

export type CaseTemplate = {
  id: string
  name: string
  labelCategory: string
  weightKg: number | null
  widthCm: number | null
  lengthCm: number | null
  depthCm: number | null
}
export type CaseTemplateFields = Omit<CaseTemplate, 'id'>

export const caseTemplateKeys = {
  list: (companyId: string) => ['company', companyId, 'case-templates'] as const,
}

type Row = {
  id: string
  name: string
  label_category: string
  weight_kg: number | string | null
  width_cm: number | string | null
  length_cm: number | string | null
  depth_cm: number | string | null
}

// PostgREST môže numeric vrátiť ako číslo aj ako text.
const toNumber = (value: number | string | null) => (value === null ? null : Number(value))

export async function fetchCaseTemplates(companyId: string): Promise<CaseTemplate[]> {
  const { data, error } = await getSupabase()
    .from('case_templates')
    .select('id, name, label_category, weight_kg, width_cm, length_cm, depth_cm')
    .eq('company_id', companyId)
    .order('name')
  if (error) throw error
  return (data as Row[]).map((row) => ({
    id: row.id,
    name: row.name,
    labelCategory: row.label_category,
    weightKg: toNumber(row.weight_kg),
    widthCm: toNumber(row.width_cm),
    lengthCm: toNumber(row.length_cm),
    depthCm: toNumber(row.depth_cm),
  }))
}

export async function addCaseTemplate(companyId: string, template: CaseTemplateFields) {
  const { error } = await getSupabase().from('case_templates').insert({
    company_id: companyId,
    name: template.name.trim(),
    label_category: template.labelCategory.trim(),
    weight_kg: template.weightKg,
    width_cm: template.widthCm,
    length_cm: template.lengthCm,
    depth_cm: template.depthCm,
  })
  if (error) throw error
}

export async function deleteCaseTemplate(companyId: string, id: string) {
  const { data, error } = await getSupabase().from('case_templates').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Názvy pre `count` nových cases: základ a poradové číslo, ktoré nadväzuje na už existujúce.
 * „Thon case“ pri existujúcich „Thon case 1“ a „Thon case 2“ dá „Thon case 3“, „Thon case 4“…
 * Číslo na konci zadaného názvu sa berie ako začiatok.
 */
export function numberedCaseNames(name: string, count: number, existing: string[]) {
  const typed = /^(.*?)\s+(\d+)$/.exec(name.trim())
  const base = (typed ? typed[1] : name).trim()
  const pattern = new RegExp(`^${escapeRegExp(base)}\\s+(\\d+)$`, 'i')
  const used = existing.map((other) => pattern.exec(other.trim())).filter((match) => match !== null).map((match) => Number(match[1]))
  const start = typed ? Number(typed[2]) : Math.max(0, ...used) + 1
  return Array.from({ length: Math.max(count, 1) }, (_, index) => `${base} ${start + index}`)
}

/** Rozmery šablóny jedným riadkom, na výber v zozname. */
export function describeTemplate(template: CaseTemplateFields) {
  const sides = [template.widthCm, template.lengthCm, template.depthCm].filter((side) => side !== null)
  return [
    sides.length > 0 && `${sides.map((side) => String(side).replace('.', ',')).join(' × ')} cm`,
    template.weightKg !== null && `${String(template.weightKg).replace('.', ',')} kg`,
    template.labelCategory,
  ]
    .filter(Boolean)
    .join(' · ')
}
