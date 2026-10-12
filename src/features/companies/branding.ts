import { getSupabase } from '@/lib/supabase/client'

// Podklady pre flight case štítok: logo firmy a kontaktný riadok.

const BUCKET = 'company-logos'
const MAX_SIDE = 1200

export type Branding = { logoPath: string; labelFooter: string }

export const brandingKeys = {
  branding: (companyId: string) => ['company', companyId, 'branding'] as const,
  logo: (companyId: string, path: string) => ['company', companyId, 'branding', 'logo', path] as const,
}

export async function fetchBranding(companyId: string): Promise<Branding> {
  const { data, error } = await getSupabase().from('companies').select('logo_path, label_footer').eq('id', companyId).single()
  if (error) throw error
  const row = data as { logo_path: string; label_footer: string }
  return { logoPath: row.logo_path, labelFooter: row.label_footer }
}

async function updateCompany(companyId: string, fields: { logo_path?: string; label_footer?: string }) {
  const { data, error } = await getSupabase().from('companies').update(fields).eq('id', companyId).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

export function saveLabelFooter(companyId: string, text: string) {
  return updateCompany(companyId, { label_footer: text.trim() })
}

/** Zmenší logo na najviac 1200 px. PNG zachová priehľadné pozadie. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))), 'image/png')
  })
}

export async function uploadLogo(companyId: string, file: File, previousPath: string) {
  const db = getSupabase()
  const path = `${companyId}/logo-${Date.now()}.png`
  const upload = await db.storage.from(BUCKET).upload(path, await shrink(file), { contentType: 'image/png' })
  if (upload.error) throw upload.error
  await updateCompany(companyId, { logo_path: path })
  if (previousPath) await db.storage.from(BUCKET).remove([previousPath])
}

export async function removeLogo(companyId: string, path: string) {
  await updateCompany(companyId, { logo_path: '' })
  await getSupabase().storage.from(BUCKET).remove([path])
}

/** Logo ako dáta, nie odkaz: dá sa tak nakresliť do canvasu štítku bez obmedzení cudzieho pôvodu. */
export async function fetchLogoBlob(path: string): Promise<Blob> {
  const { data, error } = await getSupabase().storage.from(BUCKET).download(path)
  if (error) throw error
  return data
}
