import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

/** Kúpený program: koľko inštalácií, na koho účet, dokedy platí (bez dátumu = trvalá) a na ktorom počítači z techniky beží. */
export type License = {
  id: string
  name: string
  edition: string
  seats: number
  account: string
  purchasedOn: string | null
  expiresOn: string | null
  price: number | null
  equipmentId: string | null
  note: string
}
export type LicenseFields = Omit<License, 'id'> & { licenseKey: string }

export const licenseKeys = {
  list: (companyId: string) => ['company', companyId, 'licenses'] as const,
  keys: (companyId: string) => ['company', companyId, 'licenses', 'keys'] as const,
}

const check = <T,>(result: { data: T; error: unknown }) => {
  if (result.error) throw result.error
  return result.data
}

type Row = {
  id: string
  name: string
  edition: string
  seats: number
  account: string
  purchased_on: string | null
  expires_on: string | null
  price: number | string | null
  equipment_id: string | null
  note: string
}

export async function fetchLicenses(companyId: string): Promise<License[]> {
  const rows = check(
    await getSupabase()
      .from('software_licenses')
      .select('id, name, edition, seats, account, purchased_on, expires_on, price, equipment_id, note')
      .eq('company_id', companyId)
      .order('name'),
  ) as Row[]
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    edition: row.edition,
    seats: row.seats,
    account: row.account,
    purchasedOn: row.purchased_on,
    expiresOn: row.expires_on,
    price: row.price === null ? null : Number(row.price),
    equipmentId: row.equipment_id,
    note: row.note,
  }))
}

/** Licenčné kľúče – databáza ich vráti len tomu, kto smie upravovať techniku. */
export async function fetchLicenseKeys(companyId: string): Promise<Map<string, string>> {
  const rows = check(await getSupabase().from('software_license_keys').select('license_id, license_key').eq('company_id', companyId)) as { license_id: string; license_key: string }[]
  return new Map(rows.map((row) => [row.license_id, row.license_key]))
}

/** Bez migrácie 0172 tabuľka chýba – stránka ukáže chybu namiesto prázdneho zoznamu. */
export function useLicenses(companyId: string) {
  return useQuery({ queryKey: licenseKeys.list(companyId), queryFn: () => fetchLicenses(companyId), retry: false })
}

export function useLicenseKeys(companyId: string, enabled: boolean) {
  return useQuery({ queryKey: licenseKeys.keys(companyId), queryFn: () => fetchLicenseKeys(companyId), enabled, retry: false })
}

export async function saveLicense(companyId: string, id: string | null, fields: LicenseFields, canKeys: boolean) {
  const db = getSupabase()
  const row = {
    name: fields.name.trim(),
    edition: fields.edition.trim(),
    seats: fields.seats,
    account: fields.account.trim(),
    purchased_on: fields.purchasedOn || null,
    expires_on: fields.expiresOn || null,
    price: fields.price,
    equipment_id: fields.equipmentId || null,
    note: fields.note.trim(),
  }
  let licenseId = id
  if (id) {
    const updated = check(await db.from('software_licenses').update(row).eq('id', id).select('id')) as unknown[]
    if (updated.length === 0) throw new Error('Licencia sa nenašla alebo ju nemôžete upraviť.')
  } else {
    licenseId = (check(await db.from('software_licenses').insert({ ...row, company_id: companyId }).select('id').single()) as { id: string }).id
  }
  if (!canKeys) return
  const key = fields.licenseKey.trim()
  if (!key) {
    check(await db.from('software_license_keys').delete().eq('license_id', licenseId!).select('license_id'))
    return
  }
  // Najprv úprava, inak nový riadok (práva na úpravu sú len na stĺpec s kľúčom).
  const updated = check(await db.from('software_license_keys').update({ license_key: key }).eq('license_id', licenseId!).select('license_id')) as unknown[]
  if (updated.length === 0) check(await db.from('software_license_keys').insert({ company_id: companyId, license_id: licenseId, license_key: key }).select('license_id'))
}

export async function deleteLicense(id: string) {
  check(await getSupabase().from('software_licenses').delete().eq('id', id).select('id'))
}
