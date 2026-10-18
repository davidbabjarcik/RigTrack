import { getSupabase } from '@/lib/supabase/client'

/** Buckety, v ktorých má firma súbory v priečinku {company_id}/. Hlásenia chýb ostávajú vývojárovi. */
const BUCKETS = ['equipment-photos', 'company-logos', 'event-documents', 'attachments'] as const

const PAGE = 1000

/** Všetky súbory pod `prefix` (aj v podpriečinkoch). */
async function listFiles(bucket: string, prefix: string): Promise<string[]> {
  const storage = getSupabase().storage.from(bucket)
  const files: string[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await storage.list(prefix, { limit: PAGE, offset })
    if (error) throw error
    for (const entry of data) {
      const path = `${prefix}/${entry.name}`
      // Priečinok nemá id.
      if (entry.id === null) files.push(...(await listFiles(bucket, path)))
      else files.push(path)
    }
    if (data.length < PAGE) return files
  }
}

/** Zmaže súbory firmy zo Storage. Vráti, koľko ich bolo. */
export async function deleteCompanyFiles(companyId: string) {
  const db = getSupabase()
  let total = 0
  for (const bucket of BUCKETS) {
    const files = await listFiles(bucket, companyId)
    for (let index = 0; index < files.length; index += 100) {
      const { error } = await db.storage.from(bucket).remove(files.slice(index, index + 100))
      if (error) throw error
    }
    total += files.length
  }
  return total
}

/**
 * Natrvalo zmaže firmu: najprv jej súbory, potom všetky údaje v databáze (kaskádou).
 * Databáza overí, že ide o admina a že sedí názov.
 */
export async function deleteCompany(companyId: string, confirmName: string) {
  await deleteCompanyFiles(companyId)
  const { error } = await getSupabase().rpc('delete_company', { _company: companyId, _confirm_name: confirmName })
  if (error) throw error
}
