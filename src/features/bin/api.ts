import { getSupabase } from '@/lib/supabase/client'
import { filesByBucket, type BinItem, type BinKind } from './model'

export const binKeys = {
  list: (companyId: string) => ['company', companyId, 'recycle-bin'] as const,
  autoPurge: (companyId: string) => ['company', companyId, 'recycle-bin', 'auto-purge'] as const,
}

/** Obsah koša, najnovšie zmazané prvé. Iba pre admina; ostatným databáza odmietne. */
export async function fetchBin(companyId: string): Promise<BinItem[]> {
  const { data, error } = await getSupabase().rpc('recycle_bin_items', { _company_id: companyId })
  if (error) throw error
  const rows = data as { kind: BinKind; id: string; label: string; detail: string; deleted_at: string; deleted_by_name: string }[]
  return rows.map((row) => ({
    kind: row.kind,
    id: row.id,
    label: row.label,
    detail: row.detail,
    deletedAt: row.deleted_at,
    deletedByName: row.deleted_by_name,
  }))
}

export async function restoreBinItem(companyId: string, item: Pick<BinItem, 'kind' | 'id'>) {
  const { error } = await getSupabase().rpc('restore_bin_item', { _company_id: companyId, _kind: item.kind, _id: item.id })
  if (error) throw error
}

/**
 * Natrvalo zmaže položky z koša: tie po lehote ('expired'), všetky ('all') alebo jednu.
 * Databáza vráti súbory, ktoré po záznamoch ostali, a tie sa zmažú zo Storage.
 * Ak by mazanie súborov zlyhalo, záznamy sú už preč a súbory len zaberajú miesto.
 */
export async function purgeBin(companyId: string, mode: 'expired' | 'all' | 'one', item?: Pick<BinItem, 'kind' | 'id'>) {
  const db = getSupabase()
  const { data, error } = await db.rpc('purge_bin', { _company_id: companyId, _mode: mode, _kind: item?.kind ?? null, _id: item?.id ?? null })
  if (error) throw error
  const files = data as { bucket: string; path: string }[]
  await Promise.all([...filesByBucket(files)].map(([bucket, paths]) => db.storage.from(bucket).remove(paths)))
  return files.length
}
