import { getSupabase } from '@/lib/supabase/client'

const BUCKET = 'equipment-photos'
const MAX_SIDE = 1280
const THUMB_SIDE = 240
const SIGNED_URL_SECONDS = 3600

/** Zmenší obrázok na najviac `maxSide` px a uloží ako JPEG, aby fotky z mobilu nemali niekoľko MB. */
async function shrink(file: File, maxSide: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  // JPEG nemá priehľadnosť; bez bieleho podkladu by priehľadné časti sčerneli.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))), 'image/jpeg', quality)
  })
}

/** Malý náhľad do zoznamov leží vedľa fotky: „…/abc.jpg“ → „…/abc-thumb.jpg“. */
export function thumbPath(path: string) {
  return path.replace(/\.jpg$/, '-thumb.jpg')
}

/** Nahrá novú fotku aj jej náhľad, zapíše ju k technike a starú zmaže. */
export async function uploadEquipmentPhoto(companyId: string, equipmentId: string, file: File, previousPath: string) {
  const storage = getSupabase().storage.from(BUCKET)
  // Nový názov pri každom nahratí: prehliadač tak nikdy neukáže starú fotku z cache.
  const path = `${companyId}/${equipmentId}-${Date.now()}.jpg`
  const [photo, thumb] = await Promise.all([shrink(file, MAX_SIDE, 0.85), shrink(file, THUMB_SIDE, 0.8)])
  const upload = await storage.upload(path, photo, { contentType: 'image/jpeg' })
  if (upload.error) throw upload.error
  // Náhľad je len zrýchlenie; ak sa nenahrá, zoznamy použijú veľkú fotku.
  await storage.upload(thumbPath(path), thumb, { contentType: 'image/jpeg' })
  await setPhotoPath(companyId, equipmentId, path)
  if (previousPath) await storage.remove([previousPath, thumbPath(previousPath)])
}

/**
 * Uloží zmenšenú fotku do priečinka firmy pod daným názvom a vráti jej cestu.
 * Pre fotky, ktoré nepatria kusu techniky (napr. vlastná fotka na štítku case).
 */
export async function storeCompanyPhoto(companyId: string, name: string, file: File): Promise<string> {
  const path = `${companyId}/${name}-${Date.now()}.jpg`
  const upload = await getSupabase()
    .storage.from(BUCKET)
    .upload(path, await shrink(file, MAX_SIDE, 0.85), { contentType: 'image/jpeg' })
  if (upload.error) throw upload.error
  return path
}

export async function removeEquipmentPhoto(companyId: string, equipmentId: string, path: string) {
  await setPhotoPath(companyId, equipmentId, '')
  await getSupabase().storage.from(BUCKET).remove([path, thumbPath(path)])
}

/** Upratanie súborov po zmazaní techniky. Zlyhanie nevadí: v evidencii už na fotku nič neodkazuje. */
export async function discardPhotoFile(path: string) {
  await getSupabase().storage.from(BUCKET).remove([path, thumbPath(path)])
}

async function setPhotoPath(companyId: string, equipmentId: string, path: string) {
  const { data, error } = await getSupabase()
    .from('equipment')
    .update({ photo_path: path })
    .eq('company_id', companyId)
    .eq('id', equipmentId)
    .select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

/** Dočasný odkaz na fotku; bucket je súkromný, takže trvalá verejná adresa neexistuje. */
export async function fetchPhotoUrl(path: string): Promise<string> {
  const { data, error } = await getSupabase().storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS)
  if (error) throw error
  return data.signedUrl
}

async function signMany(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>()
  if (paths.length === 0) return urls
  const { data, error } = await getSupabase().storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS)
  if (error) throw error
  for (const item of data) {
    if (item.path && item.signedUrl && !item.error) urls.set(item.path, item.signedUrl)
  }
  return urls
}

/**
 * Odkazy na náhľady pre celý zoznam naraz; kľúčom je cesta veľkej fotky.
 * Fotky nahraté pred zavedením náhľadov ho nemajú — tie dostanú odkaz na veľkú fotku.
 */
export async function fetchThumbUrls(paths: string[]): Promise<Record<string, string>> {
  const thumbs = await signMany(paths.map(thumbPath))
  const full = await signMany(paths.filter((path) => !thumbs.has(thumbPath(path))))
  const result: Record<string, string> = {}
  for (const path of paths) {
    const url = thumbs.get(thumbPath(path)) ?? full.get(path)
    if (url) result[path] = url
  }
  return result
}

/** Fotka ako dáta, nie odkaz: dá sa tak nakresliť do canvasu štítku bez obmedzení cudzieho pôvodu. */
export async function fetchPhotoBlob(path: string): Promise<Blob> {
  const { data, error } = await getSupabase().storage.from(BUCKET).download(path)
  if (error) throw error
  return data
}

/** Odkaz platí hodinu; po 50 minútach sa vypýta nový. */
export const PHOTO_URL_STALE_MS = 50 * 60 * 1000
