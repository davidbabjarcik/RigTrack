import { getSupabase } from '@/lib/supabase/client'

// Technika, ktorú používateľ nedávno pridal a chýbajú jej základné údaje (fotka, výrobca a model, kategória).
// Upozornenie hore mu pripomenie, aby ich doplnil – napr. „pridal mikrofóny, doplň údaje“.

export type IncompleteItem = { id: string; name: string; missing: string[] }

type Row = { id: string; name: string; kind: string; manufacturer: string; model: string; photo_path: string; category_id: string | null; status: string; created_at: string }

/**
 * Čo chýba pri kuse: káble a spotrebný materiál nepotrebujú výrobcu ani model. Kategória len keď ich firma používa
 * (inak sa pole vo formulári ani nezobrazuje); pódium kategóriu nemá.
 */
export function missingDetails(row: Pick<Row, 'kind' | 'manufacturer' | 'model' | 'photo_path' | 'category_id'>, usesCategories = true): string[] {
  const missing: string[] = []
  if (!row.photo_path) missing.push('fotka')
  if (!['cable', 'consumable', 'general'].includes(row.kind) && !row.manufacturer.trim() && !row.model.trim()) missing.push('výrobca a model')
  if (usesCategories && row.kind !== 'stage' && !row.category_id) missing.push('kategória')
  return missing
}

export const incompleteKey = (companyId: string, userId: string) => ['company', companyId, 'equipment', 'incomplete', userId] as const

/** Technika, ktorú pridal tento používateľ za posledných 30 dní a má neúplné údaje (najviac 20). */
export async function fetchMyIncomplete(companyId: string, userId: string): Promise<IncompleteItem[]> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const categories = await getSupabase().from('equipment_categories').select('id', { count: 'exact', head: true }).eq('company_id', companyId)
  const usesCategories = (categories.count ?? 0) > 0
  const { data, error } = await getSupabase()
    .from('equipment')
    .select('id, name, kind, manufacturer, model, photo_path, category_id, status, created_at')
    .eq('company_id', companyId)
    .eq('created_by', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return []
  return (data as Row[])
    .filter((row) => !['sold', 'retired', 'archived'].includes(row.status))
    .map((row) => ({ id: row.id, name: row.name, missing: missingDetails(row, usesCategories) }))
    .filter((item) => item.missing.length > 0)
    .slice(0, 20)
}
