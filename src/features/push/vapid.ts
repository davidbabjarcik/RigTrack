// Kľúče pre push (VAPID) a tajomstvo webhooku – vygenerujú sa priamo v prehliadači, bez príkazového riadku.
// Nikde sa neukladajú: admin ich hneď skopíruje do tajomstiev v Supabase.

const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export type VapidKeys = { publicKey: string; privateKey: string; webhookSecret: string }

/** Pár kľúčov P-256 vo formáte, aký čaká knižnica web-push (verejný 65 B, súkromný 32 B, base64url). */
export async function generateVapidKeys(): Promise<VapidKeys> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
  const secret = crypto.getRandomValues(new Uint8Array(32))
  return { publicKey: base64url(raw), privateKey: jwk.d!, webhookSecret: base64url(secret) }
}

/** Identifikátor projektu Supabase z adresy (https://abcd.supabase.co → abcd), na odkazy do Supabase. */
export function projectRef(url: string) {
  return /^https:\/\/([a-z0-9]+)\.supabase\.co/i.exec(url)?.[1] ?? ''
}
