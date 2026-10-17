import { getSupabase } from '@/lib/supabase/client'
import { readCases, readItems, type EquipmentPackage, type PackageValues } from './model'

export const packageKeys = { list: (companyId: string) => ['company', companyId, 'packages'] as const }

export async function fetchPackages(companyId: string): Promise<EquipmentPackage[]> {
  const { data, error } = await getSupabase()
    .from('equipment_packages')
    .select('id, name, category, note, items, cases')
    .eq('company_id', companyId)
    .order('category')
    .order('name')
  if (error) throw error
  return (data as { id: string; name: string; category: string; note: string; items: unknown; cases: unknown }[]).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    note: row.note,
    items: readItems(row.items),
    cases: readCases(row.cases),
  }))
}

export async function savePackage(companyId: string, id: string | null, values: PackageValues) {
  const fields = { name: values.name, category: values.category, note: values.note, items: values.items, cases: values.cases }
  const table = getSupabase().from('equipment_packages')
  const { error } = id ? await table.update(fields).eq('company_id', companyId).eq('id', id) : await table.insert({ ...fields, company_id: companyId })
  if (error) throw error
}

export async function deletePackage(companyId: string, id: string) {
  const { data, error } = await getSupabase().from('equipment_packages').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}
