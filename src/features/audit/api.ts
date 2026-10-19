import { getSupabase } from '@/lib/supabase/client'
import type { AuditAction, AuditEntry } from './model'

export const LIMIT = 200

/** Záznamy histórie zmien od najnovších; s `entityId` len pre jeden záznam (napr. jednu techniku). */
export async function fetchAudit(companyId: string, entity: string, from = 0, to = LIMIT - 1, entityId?: string): Promise<AuditEntry[]> {
  let query = getSupabase()
    .from('audit_log')
    .select('id, actor_name, action, entity, entity_id, label, changed, created_at')
    .eq('company_id', companyId)
    .order('id', { ascending: false })
    .range(from, to)
  if (entity) query = query.eq('entity', entity)
  if (entityId) query = query.eq('entity_id', entityId)
  const { data, error } = await query
  if (error) throw error
  const rows = data as {
    id: number
    actor_name: string
    action: AuditAction
    entity: string
    entity_id: string | null
    label: string
    changed: string[] | null
    created_at: string
  }[]
  return rows.map((row) => ({
    id: row.id,
    actorName: row.actor_name,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    label: row.label,
    changed: row.changed ?? [],
    createdAt: row.created_at,
  }))
}
