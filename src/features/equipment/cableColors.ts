import { getSupabase } from '@/lib/supabase/client'

// Farebný kód dĺžok káblov: každá dĺžka má vo firme svoju farbu (páska na konektore)
// a jej názov, ktorý sa tlačí na hárok FLIGHTCASE CONTENT.

export type CableColor = { lengthM: number; name: string; color: string }

const HEX = /^#[0-9a-f]{6}$/

/** „00A651“ aj „#00a651“ → „#00a651“; iný text vráti null. */
export function parseHexColor(text: string) {
  const value = text.trim().toLowerCase()
  const withHash = value.startsWith('#') ? value : `#${value}`
  return HEX.test(withHash) ? withHash : null
}

export const cableColorKeys = {
  list: (companyId: string) => ['company', companyId, 'cable-colors'] as const,
}

export async function fetchCableColors(companyId: string): Promise<CableColor[]> {
  const { data, error } = await getSupabase()
    .from('cable_colors')
    .select('length_m, name, color')
    .eq('company_id', companyId)
    .order('length_m')
  if (error) throw error
  const rows = data as { length_m: number | string; name: string; color: string }[]
  return rows.map((row) => ({ lengthM: Number(row.length_m), name: row.name, color: row.color }))
}

/**
 * Založí farbu pre dĺžku, alebo zmení existujúcu.
 * Zámerne nie upsert: ten by prepisoval aj company_id a length_m, na čo používateľ
 * nemá (a nemá mať) oprávnenie, a databáza by celý zápis odmietla.
 */
export async function saveCableColor(companyId: string, color: CableColor) {
  const db = getSupabase()
  const fields = { color: color.color.toLowerCase(), name: color.name.trim() }
  const updated = await db
    .from('cable_colors')
    .update(fields)
    .eq('company_id', companyId)
    .eq('length_m', color.lengthM)
    .select('length_m')
  if (updated.error) throw updated.error
  if (updated.data.length > 0) return

  const inserted = await db.from('cable_colors').insert({ company_id: companyId, length_m: color.lengthM, ...fields })
  if (inserted.error) throw inserted.error
}
