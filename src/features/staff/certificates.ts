import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

/** Certifikát alebo školenie človeka (práca vo výškach, elektro…) a dokedy platí (bez dátumu = bez obmedzenia). */
export type Certificate = { id: string; staffId: string; name: string; issuer: string; number: string; issuedOn: string | null; validUntil: string | null; note: string }
export type CertificateFields = Omit<Certificate, 'id' | 'staffId'>

export const certificateKeys = {
  list: (companyId: string) => ['company', companyId, 'staff', 'certificates'] as const,
}

const check = <T,>(result: { data: T; error: unknown }) => {
  if (result.error) throw result.error
  return result.data
}

export async function fetchCertificates(companyId: string): Promise<Certificate[]> {
  const rows = check(
    await getSupabase().from('staff_certificates').select('id, staff_id, name, issuer, number, issued_on, valid_until, note').eq('company_id', companyId).order('name'),
  ) as { id: string; staff_id: string; name: string; issuer: string; number: string; issued_on: string | null; valid_until: string | null; note: string }[]
  return rows.map((row) => ({ id: row.id, staffId: row.staff_id, name: row.name, issuer: row.issuer, number: row.number, issuedOn: row.issued_on, validUntil: row.valid_until, note: row.note }))
}

/** Bez migrácie 0172 tabuľka chýba – sekcia sa vtedy ticho skryje. */
export function useCertificates(companyId: string) {
  return useQuery({ queryKey: certificateKeys.list(companyId), queryFn: () => fetchCertificates(companyId), retry: false })
}

export async function saveCertificate(companyId: string, staffId: string, id: string | null, fields: CertificateFields) {
  const row = {
    name: fields.name.trim(),
    issuer: fields.issuer.trim(),
    number: fields.number.trim(),
    issued_on: fields.issuedOn || null,
    valid_until: fields.validUntil || null,
    note: fields.note.trim(),
  }
  const table = getSupabase().from('staff_certificates')
  if (id) {
    const updated = check(await table.update(row).eq('id', id).select('id')) as unknown[]
    if (updated.length === 0) throw new Error('Certifikát sa nenašiel alebo ho nemôžete upraviť.')
  } else {
    check(await table.insert({ ...row, company_id: companyId, staff_id: staffId }).select('id'))
  }
}

export async function deleteCertificate(id: string) {
  check(await getSupabase().from('staff_certificates').delete().eq('id', id).select('id'))
}
