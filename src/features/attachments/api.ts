import { getSupabase } from '@/lib/supabase/client'

// Prílohy k záznamom (servis, vozidlo). Zodpovedá tabuľke attachments v 0019_attachments_audit.sql.

const BUCKET = 'attachments'

export type AttachmentEntity = 'service' | 'vehicle'
export type Attachment = { id: string; name: string; path: string; sizeBytes: number; createdAt: string }

export const attachmentKeys = {
  list: (companyId: string, entity: AttachmentEntity, entityId: string) =>
    ['company', companyId, 'attachments', entity, entityId] as const,
}

export async function fetchAttachments(companyId: string, entity: AttachmentEntity, entityId: string): Promise<Attachment[]> {
  const { data, error } = await getSupabase()
    .from('attachments')
    .select('id, name, path, size_bytes, created_at')
    .eq('company_id', companyId)
    .eq('entity_type', entity)
    .eq('entity_id', entityId)
    .order('created_at')
  if (error) throw error
  const rows = data as { id: string; name: string; path: string; size_bytes: number; created_at: string }[]
  return rows.map((row) => ({ id: row.id, name: row.name, path: row.path, sizeBytes: Number(row.size_bytes), createdAt: row.created_at }))
}

export async function uploadAttachment(companyId: string, entity: AttachmentEntity, entityId: string, file: File) {
  const db = getSupabase()
  // Pôvodný názov ostáva v databáze; v ceste je len bezpečná prípona, aby na názve nezáležalo.
  const extension = /\.([a-z0-9]{1,8})$/i.exec(file.name)?.[1]?.toLowerCase() ?? 'bin'
  const path = `${companyId}/${entity}/${entityId}/${crypto.randomUUID()}.${extension}`
  const upload = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined })
  if (upload.error) throw upload.error
  const { error } = await db
    .from('attachments')
    .insert({ company_id: companyId, entity_type: entity, entity_id: entityId, name: file.name.slice(0, 200), path, size_bytes: file.size })
  if (error) {
    await db.storage.from(BUCKET).remove([path])
    throw error
  }
}

export async function deleteAttachment(attachment: Attachment) {
  const db = getSupabase()
  const { data, error } = await db.from('attachments').delete().eq('id', attachment.id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
  await db.storage.from(BUCKET).remove([attachment.path])
}

/** Krátkodobý odkaz na stiahnutie; bucket je súkromný. */
export async function attachmentUrl(attachment: Attachment) {
  const { data, error } = await getSupabase().storage.from(BUCKET).createSignedUrl(attachment.path, 120, { download: attachment.name })
  if (error) throw error
  return data.signedUrl
}

/**
 * Zmaže súbory príloh záznamu, ktorý sa práve ruší. Riadky v databáze zmaže trigger spolu
 * so záznamom, preto treba cesty zistiť vopred: zavolajte pred zmazaním a výsledok po ňom.
 */
export async function collectAttachmentFiles(companyId: string, entity: AttachmentEntity, entityId: string) {
  const attachments = await fetchAttachments(companyId, entity, entityId).catch(() => [])
  return async () => {
    if (attachments.length > 0) await getSupabase().storage.from(BUCKET).remove(attachments.map((attachment) => attachment.path))
  }
}
