import { getSupabase } from '@/lib/supabase/client'
import { contentBounds, detectBackground, logoTone, recolor, removeBackground, type LogoTone } from './logoImage'

// Logo firmy a kontaktný riadok: na štítkoch cases, v menu aj na zapožičacej listine.

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

const toPng = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))), 'image/png')
  })

/** Nakreslí obrázok do canvasu (najviac `maxSide` px) a vráti aj jeho body na čítanie. */
async function readImage(source: Blob, maxSide: number) {
  const bitmap = await createImageBitmap(source)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return { canvas, context, image: context.getImageData(0, 0, canvas.width, canvas.height) }
}

/**
 * Pripraví logo na uloženie: zmenší ho, jednofarebné pozadie spriehľadní a oreže prázdne okraje.
 * Logo, ktoré pozadie nemá, sa len oreže. Výsledok je PNG kvôli priehľadnosti.
 */
export async function prepareLogo(file: Blob): Promise<Blob> {
  const { canvas, context, image } = await readImage(file, MAX_SIDE)
  const background = detectBackground(image.data, canvas.width, canvas.height)
  if (background) {
    removeBackground(image.data, background)
    context.putImageData(image, 0, 0)
  }
  const bounds = contentBounds(image.data, canvas.width, canvas.height)
  // Úplne prázdny obrázok nie je čo orezávať; uloží sa tak, ako prišiel.
  if (!bounds) return toPng(canvas)

  const cropped = document.createElement('canvas')
  cropped.width = bounds.width
  cropped.height = bounds.height
  cropped.getContext('2d')!.drawImage(canvas, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height)
  return toPng(cropped)
}

export async function uploadLogo(companyId: string, file: File, previousPath: string) {
  const db = getSupabase()
  const path = `${companyId}/logo-${Date.now()}.png`
  const upload = await db.storage.from(BUCKET).upload(path, await prepareLogo(file), { contentType: 'image/png' })
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

// Tón stačí zistiť na zmenšenine; farby sa zmenšením nemenia.
const TONE_SIDE = 96

/** Logo na zobrazenie v aplikácii: data URL a to, či je tmavé, svetlé alebo farebné. */
export async function fetchLogoForDisplay(path: string): Promise<{ url: string; tone: LogoTone }> {
  const blob = await fetchLogoBlob(path)
  const { image } = await readImage(blob, TONE_SIDE)
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Logo read failed'))
    reader.readAsDataURL(blob)
  })
  return { url, tone: logoTone(image.data) }
}

/**
 * Logo pre biely podklad (štítok case, tlač): svetlé logo by na ňom zaniklo, preto sa prefarbí
 * na čierno. Tmavé a farebné logá ostávajú, ako sú.
 */
export async function logoForLightBackground(blob: Blob): Promise<Blob> {
  const { canvas, context, image } = await readImage(blob, MAX_SIDE)
  if (logoTone(image.data) !== 'light') return blob
  recolor(image.data, [23, 23, 23])
  context.putImageData(image, 0, 0)
  return toPng(canvas)
}
