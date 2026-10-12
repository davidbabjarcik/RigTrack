import type { Priority } from '@/lib/priority'
import { getSupabase } from '@/lib/supabase/client'
import type { Task, TaskFormValues, TaskStatus } from './model'

export const taskKeys = {
  list: (companyId: string) => ['company', companyId, 'tasks'] as const,
}

type Row = {
  id: string
  title: string
  note: string
  assignee_id: string | null
  priority: Priority
  due_on: string | null
  status: TaskStatus
  created_by: string | null
}

export async function fetchTasks(companyId: string): Promise<Task[]> {
  const { data, error } = await getSupabase()
    .from('tasks')
    .select('id, title, note, assignee_id, priority, due_on, status, created_by')
    .eq('company_id', companyId)
  if (error) throw error
  return (data as Row[]).map((row) => ({
    id: row.id,
    title: row.title,
    note: row.note,
    assigneeId: row.assignee_id,
    priority: row.priority,
    dueOn: row.due_on,
    status: row.status,
    createdBy: row.created_by,
  }))
}

export async function saveTask(companyId: string, id: string | null, values: TaskFormValues) {
  const fields = {
    title: values.title,
    note: values.note,
    assignee_id: values.assigneeId || null,
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

export async function deleteTask(companyId: string, id: string) {
  const { data, error } = await getSupabase().from('tasks').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}
