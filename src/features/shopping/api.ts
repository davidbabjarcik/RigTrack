import { storeCompanyPhoto } from '@/features/equipment/photo'
import type { Priority } from '@/lib/priority'
import { getSupabase } from '@/lib/supabase/client'
import type { ShoppingFormValues, ShoppingItem, ShoppingList, ShoppingStatus } from './model'

export const shoppingKeys = {
  list: (companyId: string) => ['company', companyId, 'shopping'] as const,
}

type Row = {
  id: string
  list: ShoppingList
  name: string
  quantity: number
  unit_price: number | string | null
  supplier: string
  url: string
  priority: Priority
  due_on: string | null
  status: ShoppingStatus
  assignee_id: string | null
  order_number: string
  note: string
  created_by: string | null
  photo_path: string
}

export async function fetchShoppingItems(companyId: string): Promise<ShoppingItem[]> {
  const { data, error } = await getSupabase()
    .from('shopping_items')
    .select('id, list, name, quantity, unit_price, supplier, url, priority, due_on, status, assignee_id, order_number, note, created_by, photo_path')
    .eq('company_id', companyId)
  if (error) throw error
  return (data as Row[]).map((row) => ({
    id: row.id,
    list: row.list,
    name: row.name,
    quantity: row.quantity,
    unitPrice: row.unit_price === null ? null : Number(row.unit_price),
    supplier: row.supplier,
    url: row.url,
    priority: row.priority,
    dueOn: row.due_on,
    status: row.status,
    assigneeId: row.assignee_id,
    orderNumber: row.order_number,
    note: row.note,
    createdBy: row.created_by,
    photoPath: row.photo_path,
  }))
}

export async function saveShoppingItem(companyId: string, id: string | null, values: ShoppingFormValues) {
  const fields = {
    list: values.list,
    name: values.name,
    quantity: values.quantity,
    unit_price: values.unitPrice ?? null,
    supplier: values.supplier,
    url: values.url,
    priority: values.priority,
    due_on: values.dueOn || null,
    status: values.status,
    assignee_id: values.assigneeId || null,
    order_number: values.orderNumber,
    note: values.note,
  }
  const table = getSupabase().from('shopping_items')
  const { data, error } = id
    ? await table.update(fields).eq('company_id', companyId).eq('id', id).select('id')
    : await table.insert({ ...fields, company_id: companyId }).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not saved')
}

/** Rýchla zmena bez otvárania formulára: presun medzi zoznamami alebo zmena stavu. */
export async function patchShoppingItem(companyId: string, id: string, patch: { list?: ShoppingList; status?: ShoppingStatus }) {
  const { data, error } = await getSupabase().from('shopping_items').update(patch).eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

export async function deleteShoppingItem(companyId: string, id: string) {
  const { data, error } = await getSupabase().from('shopping_items').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}

/** Fotka položky na nákup: uloží súbor aj s náhľadom a zapíše ho k položke. */
export async function setShoppingPhoto(companyId: string, id: string, file: File) {
  const path = await storeCompanyPhoto(companyId, `shopping-${id}`, file, { thumb: true })
  const { data, error } = await getSupabase().from('shopping_items').update({ photo_path: path }).eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}
