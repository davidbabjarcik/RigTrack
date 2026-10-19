import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

export type CompanyProfile = {
  legalName: string
  ico: string
  dic: string
  icDph: string
  address: string
  ceoName: string
  phone: string
  email: string
  web: string
  /** Odkiaľ sa rátajú kilometre na akcie. */
  warehouseAddress: string
}

export const EMPTY_PROFILE: CompanyProfile = { legalName: '', ico: '', dic: '', icDph: '', address: '', ceoName: '', phone: '', email: '', web: '', warehouseAddress: '' }

export const profileKey = (companyId: string) => ['company', companyId, 'profile'] as const

export async function fetchProfile(companyId: string): Promise<CompanyProfile> {
  const { data, error } = await getSupabase()
    .from('company_profile')
    .select('legal_name, ico, dic, ic_dph, address, ceo_name, phone, email, web, warehouse_address')
    .eq('company_id', companyId)
    .maybeSingle()
  if (error) throw error
  const row = data as Record<string, string> | null
  if (!row) return EMPTY_PROFILE
  return {
    legalName: row.legal_name,
    ico: row.ico,
    dic: row.dic,
    icDph: row.ic_dph,
    address: row.address,
    ceoName: row.ceo_name,
    phone: row.phone,
    email: row.email,
    web: row.web,
    warehouseAddress: row.warehouse_address,
  }
}

/** Údaje o firme (bez migrácie 0059 prázdne). */
export function useCompanyProfile(companyId: string) {
  return useQuery({ queryKey: profileKey(companyId), queryFn: () => fetchProfile(companyId), retry: false })
}

export async function saveProfile(companyId: string, profile: CompanyProfile) {
  const fields = {
    legal_name: profile.legalName.trim(),
    ico: profile.ico.trim(),
    dic: profile.dic.trim(),
    ic_dph: profile.icDph.trim(),
    address: profile.address.trim(),
    ceo_name: profile.ceoName.trim(),
    phone: profile.phone.trim(),
    email: profile.email.trim(),
    web: profile.web.trim(),
    warehouse_address: profile.warehouseAddress.trim(),
    updated_at: new Date().toISOString(),
  }
  const db = getSupabase()
  const updated = await db.from('company_profile').update(fields).eq('company_id', companyId).select('company_id')
  if (updated.error) throw updated.error
  if (updated.data.length === 0) {
    const inserted = await db.from('company_profile').insert({ ...fields, company_id: companyId })
    if (inserted.error) throw inserted.error
  }
}
