import { getSupabase } from '@/lib/supabase/client'

// Dvojfaktorové prihlásenie (TOTP – 6-miestny kód z aplikácie ako Google Authenticator alebo Microsoft Authenticator).
// Databáza (migrácia 0194) pustí k dátam toho, kto má 2FA zapnuté, len po zadaní kódu (relácia aal2).

export const mfaKeys = { state: (token: string) => ['mfa', token] as const, factors: ['mfa', 'factors'] as const }

/** Či relácia ešte čaká na kód: má overený faktor, ale prihlásil sa zatiaľ len heslom. */
export async function needsMfaCode(): Promise<boolean> {
  const { data, error } = await getSupabase().auth.mfa.getAuthenticatorAssuranceLevel()
  if (error || !data) return false
  return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2'
}

export type TotpFactor = { id: string; name: string; verified: boolean; createdAt: string }

export async function listTotpFactors(): Promise<TotpFactor[]> {
  const { data, error } = await getSupabase().auth.mfa.listFactors()
  if (error) throw error
  return (data?.all ?? [])
    .filter((factor) => factor.factor_type === 'totp')
    .map((factor) => ({ id: factor.id, name: factor.friendly_name ?? '', verified: factor.status === 'verified', createdAt: factor.created_at }))
}

/** Overí kód k faktoru (pri prihlásení aj pri zapínaní). */
export async function verifyCode(factorId: string, code: string) {
  const { error } = await getSupabase().auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, '') })
  if (error) throw error
}

/** Kód pri prihlásení: overený TOTP faktor používateľa. */
export async function verifyLoginCode(code: string) {
  const factor = (await listTotpFactors()).find((item) => item.verified)
  if (!factor) throw new Error('Žiadny faktor')
  await verifyCode(factor.id, code)
}

/** Začne zapínanie: nový (neoverený) faktor s QR kódom a tajným kľúčom na ručné zadanie. Staré neoverené zmaže. */
export async function startEnroll(): Promise<{ factorId: string; qr: string; secret: string }> {
  const db = getSupabase()
  for (const factor of (await listTotpFactors()).filter((item) => !item.verified)) await db.auth.mfa.unenroll({ factorId: factor.id })
  const { data, error } = await db.auth.mfa.enroll({ factorType: 'totp', issuer: 'RigTrack', friendlyName: `RigTrack ${new Date().toISOString().slice(0, 16)}` })
  if (error) throw error
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret }
}

/** Vypne 2FA (Supabase to dovolí len s overeným kódom v tejto relácii). */
export async function disableMfa(factorId: string) {
  const { error } = await getSupabase().auth.mfa.unenroll({ factorId })
  if (error) throw error
}
