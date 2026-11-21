import { getSupabase } from '@/lib/supabase/client'
import { EVENT_SETTINGS, POWER_TYPES, type CompanyEvent, type EventFormValues } from './model'

/** Čo si šablóna pamätá: údaje eventu bez dátumov a klienta, techniku (aj s cases) a posádku. */
export type TemplateData = Pick<
  EventFormValues,
  'kind' | 'venue' | 'setting' | 'power' | 'powerCount' | 'powerNote' | 'description' | 'note' | 'getInTime' | 'showTime' | 'showEndTime'
> & {
  equipment: { equipmentId: string; quantity: number; caseId: string | null }[]
  crew: { memberId: string | null; name: string; role: string }[]
}

export type EventTemplate = { id: string; name: string; data: TemplateData; updatedAt: string }

export const templateKeys = { list: (companyId: string) => ['company', companyId, 'event-templates'] as const }

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : '')
const UUID = /^[0-9a-f-]{36}$/i

/** Šablóna z eventu. */
export function templateFrom(event: CompanyEvent): TemplateData {
  return {
    kind: event.kind,
    venue: event.venue,
    setting: event.setting,
    power: event.power,
    powerCount: event.powerCount,
    powerNote: event.powerNote,
    description: event.description,
    note: event.note,
    getInTime: event.getInTime,
    showTime: event.showTime,
    showEndTime: event.showEndTime,
    equipment: event.equipment.map((line) => ({ equipmentId: line.equipmentId, quantity: line.quantity, caseId: line.caseId })),
    crew: event.crew.map((person) => ({ memberId: person.memberId, name: person.name, role: person.role })),
  }
}

/** Uložený obsah šablóny – opatrne, čokoľvek chýba alebo nesedí, sa vynechá. */
export function readTemplate(raw: unknown): TemplateData {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const list = (value: unknown) => (Array.isArray(value) ? (value as Record<string, unknown>[]).filter((row) => row && typeof row === 'object') : [])
  return {
    kind: data.kind === 'dj' ? 'dj' : 'event',
    venue: text(data.venue, 200),
    setting: (EVENT_SETTINGS as readonly string[]).includes(data.setting as string) ? (data.setting as TemplateData['setting']) : '',
    power: (POWER_TYPES as readonly string[]).includes(data.power as string) ? (data.power as TemplateData['power']) : '',
    powerCount: typeof data.powerCount === 'number' ? data.powerCount : null,
    powerNote: text(data.powerNote, 300),
    description: text(data.description, 4000),
    note: text(data.note, 2000),
    getInTime: text(data.getInTime, 5),
    showTime: text(data.showTime, 5),
    showEndTime: text(data.showEndTime, 5),
    equipment: list(data.equipment)
      .filter((row) => typeof row.equipmentId === 'string' && UUID.test(row.equipmentId))
      .map((row) => ({
        equipmentId: row.equipmentId as string,
        quantity: Math.max(1, Math.min(10000, Math.floor(Number(row.quantity) || 1))),
        caseId: typeof row.caseId === 'string' && UUID.test(row.caseId) ? row.caseId : null,
      })),
    crew: list(data.crew).map((row) => ({
      memberId: typeof row.memberId === 'string' && UUID.test(row.memberId) ? row.memberId : null,
      name: text(row.name, 120),
      role: text(row.role, 80),
    })).filter((row) => row.memberId || row.name.trim()),
  }
}

export async function fetchTemplates(companyId: string): Promise<EventTemplate[]> {
  const { data, error } = await getSupabase().from('event_templates').select('id, name, data, updated_at').eq('company_id', companyId).order('name')
  if (error) throw error
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, data: readTemplate(row.data), updatedAt: row.updated_at }))
}

/** Uloží šablónu; s rovnakým názvom ju prepíše. */
export async function saveTemplate(companyId: string, name: string, data: TemplateData) {
  const db = getSupabase()
  const clean = name.trim().slice(0, 120)
  const existing = await db.from('event_templates').select('id').eq('company_id', companyId).eq('name', clean).maybeSingle()
  if (existing.error) throw existing.error
  const { error } = existing.data
    ? await db.from('event_templates').update({ data, updated_at: new Date().toISOString() }).eq('id', existing.data.id)
    : await db.from('event_templates').insert({ company_id: companyId, name: clean, data })
  if (error) throw error
}

export async function deleteTemplate(id: string) {
  const { data, error } = await getSupabase().from('event_templates').delete().eq('id', id).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Not deleted')
}
