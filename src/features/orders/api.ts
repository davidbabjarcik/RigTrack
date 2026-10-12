import { resolveLookup } from '@/features/equipment/api'
import type { Lookup } from '@/features/equipment/model'
import { getSupabase } from '@/lib/supabase/client'
import type { FoundLine, ItemMode, OrderDetail, OrderFormValues, OrderSummary, Purchase } from './model'

export const orderKeys = {
  list: (companyId: string) => ['company', companyId, 'orders'] as const,
  detail: (companyId: string, id: string) => ['company', companyId, 'orders', id] as const,
  lineSearch: (companyId: string, query: string) => ['company', companyId, 'orders', 'lines', query] as const,
  purchases: (companyId: string, equipmentId: string) => ['company', companyId, 'equipment', equipmentId, 'purchases'] as const,
}

const OVERVIEW_COLUMNS = 'id, supplier, order_number, ordered_at, currency, note, item_count, total'

type OverviewRow = {
  id: string
  supplier: string
  order_number: string
  ordered_at: string
  currency: string
  note: string
  item_count: number
  total: number | string
}

function toSummary(row: OverviewRow): OrderSummary {
  return {
    id: row.id,
    supplier: row.supplier,
    orderNumber: row.order_number,
    orderedAt: row.ordered_at,
    currency: row.currency,
    note: row.note,
    itemCount: row.item_count,
    total: Number(row.total),
  }
}

export async function fetchOrders(companyId: string): Promise<OrderSummary[]> {
  const { data, error } = await getSupabase()
    .from('orders_overview')
    .select(OVERVIEW_COLUMNS)
    .eq('company_id', companyId)
    .order('ordered_at', { ascending: false })
    .order('id')
  if (error) throw error
  return (data as OverviewRow[]).map(toSummary)
}

export async function fetchOrder(companyId: string, id: string): Promise<OrderDetail | null> {
  const db = getSupabase()
  const [order, items, links] = await Promise.all([
    db.from('orders_overview').select(OVERVIEW_COLUMNS).eq('company_id', companyId).eq('id', id).maybeSingle(),
    db
      .from('order_items')
      .select('id, name, article_number, quantity, unit_price, category_id')
      .eq('company_id', companyId)
      .eq('order_id', id)
      .order('position'),
    db.from('equipment_purchases').select('order_item_id, equipment_id, quantity').eq('company_id', companyId).eq('order_id', id),
  ])
  const error = order.error ?? items.error ?? links.error
  if (error) throw error
  if (!order.data) return null

  const linkRows = links.data as { order_item_id: string; equipment_id: string; quantity: number }[]
  const itemRows = items.data as {
    id: string
    name: string
    article_number: string
    quantity: number
    unit_price: number | string
    category_id: string | null
  }[]
  return {
    ...toSummary(order.data as OverviewRow),
    lines: itemRows.map((row) => ({
      id: row.id,
      name: row.name,
      articleNumber: row.article_number,
      quantity: row.quantity,
      unitPrice: Number(row.unit_price),
      categoryId: row.category_id,
      equipment: linkRows
        .filter((link) => link.order_item_id === row.id)
        .map((link) => ({ equipmentId: link.equipment_id, quantity: link.quantity })),
    })),
  }
}

/**
 * Uloží objednávku. Kategórie zadané názvom, ktoré ešte neexistujú, najprv založí.
 * Riadok v kategórii označenej ako spotrebný materiál sa do techniky nikdy nepridáva.
 */
export async function createOrder(companyId: string, values: OrderFormValues, categories: Lookup[]): Promise<string> {
  const known = [...categories]
  const items = []
  for (const item of values.items) {
    let category = known.find((c) => c.name.toLowerCase() === item.category.toLowerCase())
    if (!category && item.category) {
      const id = await resolveLookup(companyId, 'equipment_categories', item.category, known)
      category = { id: id!, name: item.category, consumable: false }
      known.push(category)
    }
    const mode: ItemMode = category?.consumable ? 'none' : item.mode
    items.push({
      name: item.name,
      article_number: item.articleNumber,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      mode,
      equipment_id: mode === 'existing' ? item.equipmentId : null,
      equipment_name: item.equipmentName,
      category_id: category?.id ?? '',
      kind: item.kind,
    })
  }

  const { data, error } = await getSupabase().rpc('create_order', {
    _company_id: companyId,
    _order: {
      supplier: values.supplier,
      order_number: values.orderNumber,
      ordered_at: values.orderedAt,
      currency: values.currency,
      note: values.note,
    },
    _items: items,
  })
  if (error) throw error
  return data as string
}

export async function deleteOrder(companyId: string, id: string) {
  const { data, error } = await getSupabase().from('orders').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}

export async function fetchPurchases(companyId: string, equipmentId: string): Promise<Purchase[]> {
  const { data, error } = await getSupabase()
    .from('equipment_purchases')
    .select('order_id, supplier, ordered_at, currency, quantity, unit_price, article_number')
    .eq('company_id', companyId)
    .eq('equipment_id', equipmentId)
    .order('ordered_at', { ascending: false })
  if (error) throw error
  const rows = data as {
    order_id: string
    supplier: string
    ordered_at: string
    currency: string
    quantity: number
    unit_price: number | string
    article_number: string
  }[]
  return rows.map((row) => ({
    orderId: row.order_id,
    supplier: row.supplier,
    orderedAt: row.ordered_at,
    currency: row.currency,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    articleNumber: row.article_number,
  }))
}

export type ArticleMemory = { mode: ItemMode; equipmentId: string | null; categoryId: string | null }

/**
 * Pre kódy tovaru daného dodávateľa vráti, čo sa s tovarom urobilo pri poslednej objednávke:
 * režim, kategóriu a (pri položke s počtom) techniku, ku ktorej sa pripísal.
 */
export async function fetchArticleMemory(
  companyId: string,
  supplier: string,
  articleNumbers: string[],
): Promise<Map<string, ArticleMemory>> {
  const memory = new Map<string, ArticleMemory>()
  const codes = [...new Set(articleNumbers.filter(Boolean))]
  if (codes.length === 0) return memory

  const db = getSupabase()
  const lines = await db
    .from('order_lines')
    .select('id, article_number, mode, category_id')
    .eq('company_id', companyId)
    .ilike('supplier', supplier)
    .in('article_number', codes)
    .order('ordered_at', { ascending: false })
  if (lines.error) throw lines.error

  const latest = new Map<string, { id: string; mode: ItemMode; category_id: string | null }>()
  for (const row of lines.data as { id: string; article_number: string; mode: ItemMode; category_id: string | null }[]) {
    if (!latest.has(row.article_number)) latest.set(row.article_number, row)
  }

  // Technika sa dohľadáva len tam, kde ide o jednu položku s počtom.
  const stocked = [...latest.values()].filter((row) => row.mode === 'bulk' || row.mode === 'existing')
  const equipmentByLine = new Map<string, string>()
  if (stocked.length > 0) {
    const links = await db
      .from('order_item_equipment')
      .select('order_item_id, equipment_id')
      .eq('company_id', companyId)
      .in(
        'order_item_id',
        stocked.map((row) => row.id),
      )
    if (links.error) throw links.error
    for (const link of links.data as { order_item_id: string; equipment_id: string }[]) {
      equipmentByLine.set(link.order_item_id, link.equipment_id)
    }
  }

  for (const [code, row] of latest) {
    memory.set(code, { mode: row.mode, equipmentId: equipmentByLine.get(row.id) ?? null, categoryId: row.category_id })
  }
  return memory
}

/** Hľadanie v položkách všetkých objednávok podľa názvu alebo kódu tovaru; najnovšie prvé. */
export async function searchOrderLines(companyId: string, query: string): Promise<FoundLine[]> {
  // Znaky so špeciálnym významom vo filtri PostgREST sa z hľadaného textu vypustia.
  const needle = query.replace(/[,()%*\\]/g, ' ').trim()
  if (needle.length < 2) return []
  const { data, error } = await getSupabase()
    .from('order_lines')
    .select('id, order_id, name, article_number, quantity, unit_price, supplier, ordered_at, currency')
    .eq('company_id', companyId)
    .or(`name.ilike.%${needle}%,article_number.ilike.%${needle}%`)
    .order('ordered_at', { ascending: false })
    .limit(50)
  if (error) throw error
  const rows = data as {
    id: string
    order_id: string
    name: string
    article_number: string
    quantity: number
    unit_price: number | string
    supplier: string
    ordered_at: string
    currency: string
  }[]
  return rows.map((row) => ({
    id: row.id,
    orderId: row.order_id,
    name: row.name,
    articleNumber: row.article_number,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    supplier: row.supplier,
    orderedAt: row.ordered_at,
    currency: row.currency,
  }))
}
