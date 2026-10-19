import type { Priority } from '@/lib/priority'
import { getSupabase } from '@/lib/supabase/client'
import { isMissingColumn } from '@/lib/supabase/errors'
import type { Task, TaskFormValues, TaskStatus } from './model'

export const taskKeys = {
  list: (companyId: string) => ['company', companyId, 'tasks'] as const,
  templates: (companyId: string) => ['company', companyId, 'tasks', 'templates'] as const,
}

// Viac riešiteľov, kategória a event (0061); bez migrácie sa úlohy načítajú bez nich.
const EXTRA_COLUMNS = ', assignee_ids, category, event_id, created_at'
let extraColumns = EXTRA_COLUMNS

type Row = {
  id: string
  title: string
  note: string
  assignee_id: string | null
  priority: Priority
  due_on: string | null
  status: TaskStatus
  created_by: string | null
  assignee_ids?: string[] | null
  category?: string
  event_id?: string | null
  created_at?: string
}

export async function fetchTasks(companyId: string): Promise<Task[]> {
  const { data, error } = await getSupabase()
    .from('tasks')
    .select('id, title, note, assignee_id, priority, due_on, status, created_by' + extraColumns)
    .eq('company_id', companyId)
  if (extraColumns && isMissingColumn(error, 'assignee_ids')) {
    extraColumns = ''
    return fetchTasks(companyId)
  }
  if (error) throw error
  return (data as unknown as Row[]).map((row) => ({
    id: row.id,
    title: row.title,
    note: row.note,
    assigneeId: row.assignee_id,
    priority: row.priority,
    dueOn: row.due_on,
    status: row.status,
    createdBy: row.created_by,
    assigneeIds: row.assignee_ids ?? (row.assignee_id ? [row.assignee_id] : []),
    category: row.category ?? '',
    eventId: row.event_id ?? null,
    createdAt: row.created_at,
  }))
}

export async function saveTask(companyId: string, id: string | null, values: TaskFormValues) {
  const ids = values.assigneeIds ?? (values.assigneeId ? [values.assigneeId] : [])
  const fields = {
    title: values.title,
    note: values.note,
    assignee_id: ids[0] ?? null,
    // Bez migrácie 0061 sa uloží len prvý riešiteľ.
    ...(extraColumns ? { assignee_ids: ids, category: (values.category ?? '').trim() } : {}),
    priority: values.priority,
    due_on: values.dueOn || null,
    status: values.status,
  }
  const table = getSupabase().from('tasks')
  const { data, error } = id
    ? await table.update(fields).eq('company_id', companyId).eq('id', id).select('id')
    : await table.insert({ ...fields, company_id: companyId }).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not saved')
}

export async function setTaskStatus(companyId: string, id: string, status: TaskStatus) {
  const { data, error } = await getSupabase().from('tasks').update({ status }).eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

export type TaskTemplate = { id: string; title: string; category: string; daysAfter: number; active: boolean; assigneeIds: string[] }

// Riešitelia šablón (0073); bez migrácie sa načítajú bez nich.
let templateAssignees = ', assignee_ids'

export async function fetchTaskTemplates(companyId: string): Promise<TaskTemplate[]> {
  const { data, error } = await getSupabase().from('task_templates').select('id, title, category, days_after, active' + templateAssignees).eq('company_id', companyId).order('created_at')
  if (templateAssignees && isMissingColumn(error, 'assignee_ids')) {
    templateAssignees = ''
    return fetchTaskTemplates(companyId)
  }
  if (error) throw error
  return (data as unknown as { id: string; title: string; category: string; days_after: number; active: boolean; assignee_ids?: string[] }[]).map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    daysAfter: row.days_after,
    active: row.active,
    assigneeIds: row.assignee_ids ?? [],
  }))
}

export async function addTaskTemplate(companyId: string, template: Omit<TaskTemplate, 'id' | 'active'>) {
  const assignees = template.assigneeIds.length > 0 ? { assignee_ids: template.assigneeIds } : {}
  const { error } = await getSupabase()
    .from('task_templates')
    .insert({ company_id: companyId, title: template.title.trim(), category: template.category.trim(), days_after: template.daysAfter, ...assignees })
  if (error) throw error
}

export async function setTaskTemplateActive(id: string, active: boolean) {
  const { error } = await getSupabase().from('task_templates').update({ active }).eq('id', id)
  if (error) throw error
}

export async function deleteTaskTemplate(id: string) {
  const { error } = await getSupabase().from('task_templates').delete().eq('id', id)
  if (error) throw error
}

/** Po skončených eventoch založí úlohy zo šablón (každú len raz); vráti počet nových. */
export async function createPostEventTasks(companyId: string) {
  const { data, error } = await getSupabase().rpc('create_post_event_tasks', { _company_id: companyId })
  if (error) throw error
  return data as number
}

export async function deleteTask(companyId: string, id: string) {
  const { data, error } = await getSupabase().from('tasks').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}
