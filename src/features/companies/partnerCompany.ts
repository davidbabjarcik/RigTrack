import { getSupabase } from '@/lib/supabase/client'

export type SuggestedProfile = { name: string; ico: string; dic: string; address: string }

/** Údaje, ktoré o prihlásenom človeku majú firmy, kde je zapísaný ako kontakt (podľa e-mailu). */
export async function fetchSuggestedProfiles(): Promise<SuggestedProfile[]> {
  const { data, error } = await getSupabase().rpc('suggest_company_profiles')
  if (error) throw error
  return data as SuggestedProfile[]
}

/** Uloží navrhnuté údaje (IČO, DIČ, adresa) do údajov o novej firme. */
export async function saveSuggestedProfile(companyId: string, profile: SuggestedProfile) {
  const { error } = await getSupabase()
    .from('company_profile')
    .insert({ company_id: companyId, legal_name: profile.name.slice(0, 160), ico: profile.ico.slice(0, 20), dic: profile.dic.slice(0, 20), address: profile.address.slice(0, 200) })
  if (error) throw error
}

/** Založí partnerovi vlastnú firmu v RigTracku (zakladateľ je jej admin); vráti jej id. */
export async function createPartnerCompany(partnerId: string) {
  const { data, error } = await getSupabase().rpc('create_partner_company', { _partner_id: partnerId })
  if (error) throw error
  return data as string
}
