import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import type { CategoryColor } from './categoryColors'
import type { EquipmentKind } from './model'

/** Farba druhu techniky; „none“ = bez pruhu. Chýbajúci druh má predvolenú farbu. */
export type KindColor = CategoryColor | 'none'
export type KindColors = Partial<Record<EquipmentKind, KindColor>>

export const kindColorKeys = { list: (companyId: string) => ['company', companyId, 'kind-colors'] as const }

/** Farby druhov firmy; bez migrácie 0115 prázdne (platia predvolené). */
export async function fetchKindColors(companyId: string): Promise<KindColors> {
  const { data, error } = await getSupabase().from('kind_colors').select('kind, color').eq('company_id', companyId)
  if (error) return {}
  return Object.fromEntries((data as { kind: EquipmentKind; color: KindColor }[]).map((row) => [row.kind, row.color]))
}

export function useKindColors(companyId: string) {
  return useQuery({ queryKey: kindColorKeys.list(companyId), queryFn: () => fetchKindColors(companyId), staleTime: 5 * 60_000 })
}

/** Nastaví farbu druhu; null vráti predvolenú. Nie upsert – ten by menil aj kľúč, na čo používateľ nemá právo. */
export async function saveKindColor(companyId: string, kind: EquipmentKind, color: KindColor | null) {
  const db = getSupabase()
  if (color === null) {
    const { error } = await db.from('kind_colors').delete().eq('company_id', companyId).eq('kind', kind)
    if (error) throw error
    return
  }
  const updated = await db.from('kind_colors').update({ color }).eq('company_id', companyId).eq('kind', kind).select('kind')
  if (updated.error) throw updated.error
  if (updated.data.length > 0) return
  const { error } = await db.from('kind_colors').insert({ company_id: companyId, kind, color })
  if (error) throw error
}
