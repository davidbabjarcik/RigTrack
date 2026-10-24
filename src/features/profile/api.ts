import { useQuery } from '@tanstack/react-query'
import { geocode } from '@/features/events/geo'
import { getSupabase } from '@/lib/supabase/client'

/** Osobný profil – spoločný pre všetky firmy (0081). Databáza ho prepíše do kariet zamestnanca. */
export type PersonalProfile = {
  fullName: string
  phone: string
  email: string
  birthDate: string
  /** Meniny ako „MM-DD“, prázdne = nezadané. */
  nameDay: string
  licences: string[]
  homeAddress: string
  /** Sociálne siete (sieť → meno alebo odkaz). */
  socials: Record<string, string>
}

export const EMPTY_PROFILE: PersonalProfile = { fullName: '', phone: '', email: '', birthDate: '', nameDay: '', licences: [], homeAddress: '', socials: {} }

export const profileKeys = { mine: (userId: string) => ['personal-profile', userId] as const }

/** Je profil vyplnený natoľko, aby sme ho prestali pripomínať? Stačí meno a telefón. */
export const profileComplete = (profile: Pick<PersonalProfile, 'fullName' | 'phone'>) => profile.fullName.trim() !== '' && profile.phone.trim() !== ''

type Row = { phone: string; email: string; birth_date: string | null; name_day: string; licences: string[]; home_address: string; home_lat: number | null; home_lon: number | null; socials?: Record<string, string> }

/** Riadok profilu; bez migrácie 0084 bez sociálnych sietí. */
async function personalRow(userId: string) {
  const query = (columns: string) => getSupabase().from('personal_profiles').select(columns).eq('user_id', userId).maybeSingle()
  const base = 'phone, email, birth_date, name_day, licences, home_address, home_lat, home_lon'
  const result = await query(base + ', socials')
  return result.error && /socials/.test(result.error.message ?? '') ? query(base) : result
}

/** Môj profil; `exists` = už bol uložený (inak sa pri uložení založí). */
export async function fetchPersonalProfile(userId: string): Promise<PersonalProfile & { exists: boolean; homeLat: number | null }> {
  const db = getSupabase()
  const [own, account] = await Promise.all([
    personalRow(userId),
    db.from('profiles').select('full_name').eq('id', userId).single(),
  ])
  if (own.error) throw own.error
  if (account.error) throw account.error
  const row = own.data as unknown as Row | null
  return {
    fullName: (account.data as { full_name: string }).full_name,
    phone: row?.phone ?? '',
    email: row?.email ?? '',
    birthDate: row?.birth_date ?? '',
    nameDay: row?.name_day ?? '',
    licences: row?.licences ?? [],
    homeAddress: row?.home_address ?? '',
    socials: row?.socials ?? {},
    homeLat: row?.home_lat ?? null,
    exists: row !== null,
  }
}

export function usePersonalProfile(userId: string | undefined) {
  return useQuery({ queryKey: profileKeys.mine(userId ?? ''), queryFn: () => fetchPersonalProfile(userId!), enabled: Boolean(userId), retry: false })
}

/**
 * Uloží profil (meno do účtu, ostatné do osobného profilu). Adresu domov prevedie na súradnice len pri zmene.
 * Vráti false, keď sa nová adresa na mape nenašla.
 */
export async function savePersonalProfile(userId: string, profile: PersonalProfile, previous: { exists: boolean; homeAddress: string }) {
  const db = getSupabase()
  const name = await db.from('profiles').update({ full_name: profile.fullName.trim() }).eq('id', userId)
  if (name.error) throw name.error
  const address = profile.homeAddress.trim()
  const socials = Object.fromEntries(Object.entries(profile.socials).map(([name, value]) => [name, value.trim()]).filter(([, value]) => value))
  const moved = address !== previous.homeAddress.trim()
  const point = moved && address ? await geocode(address).catch(() => null) : null
  const fields = {
    phone: profile.phone.trim(),
    email: profile.email.trim(),
    birth_date: profile.birthDate || null,
    name_day: profile.nameDay,
    licences: profile.licences,
    home_address: address,
    // Sociálne siete (0084) len keď sú vyplnené, aby uloženie fungovalo aj bez migrácie.
    ...(Object.keys(profile.socials).length > 0 && { socials }),
    ...(moved && { home_lat: point?.lat ?? null, home_lon: point?.lon ?? null }),
    updated_at: new Date().toISOString(),
  }
  const { error } = previous.exists ? await db.from('personal_profiles').update(fields).eq('user_id', userId) : await db.from('personal_profiles').insert(fields)
  if (error) throw error
  return !moved || !address || point !== null
}
