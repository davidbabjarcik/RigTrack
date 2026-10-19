import { resolveLookup } from '@/features/equipment/api'
import { storeCompanyPhoto } from '@/features/equipment/photo'
import type { Lookup } from '@/features/equipment/model'
import { getSupabase } from '@/lib/supabase/client'
import { isMissingColumn } from '@/lib/supabase/errors'
import type { FoundLine, ItemMode, OrderDetail, OrderFormValues, OrderSource, OrderSummary, Purchase } from './model'

export const orderKeys = {
  list: (companyId: string) => ['company', companyId, 'orders'] as const,
  detail: (companyId: string, id: string) => ['company', companyId, 'orders', id] as const,
  lineSearch: (companyId: string, query: string) => ['company', companyId, 'orders', 'lines', query] as const,
  purchases: (companyId: string, equipmentId: string) => ['company', companyId, 'equipment', equipmentId, 'purchases'] as const,
}

const OVERVIEW_COLUMNS = 'id, source, supplier, seller, photo_path, order_number, ordered_at, currency, note, item_count, total'
// Údaje z 0060; bez migrácie sa objednávky načítajú bez nich.
const EXTRA_COLUMNS = ', created_at, ordered_by, for_us, for_whom, add_to_stock, has_invoice'
let extraColumns = EXTRA_COLUMNS
const columns = () => OVERVIEW_COLUMNS + extraColumns
function fallBack(error: { code?: string; message?: string } | null) {
  if (!extraColumns || !isMissingColumn(error, 'for_us')) return false
  extraColumns = ''
  return true
}

type OverviewRow = {
  id: string
  source: OrderSource
  supplier: string
  seller: string
  photo_path: string
  order_number: string
  ordered_at: string
  currency: string
  note: string
  item_count: number
  total: number | string
  created_at?: string
  ordered_by?: string | null
  for_us?: boolean
  for_whom?: string
  add_to_stock?: boolean
  has_invoice?: boolean
}

function toSummary(row: OverviewRow): OrderSummary {
  return {
    id: row.id,
    source: row.source,
    supplier: row.supplier,
    seller: row.seller,
    photoPath: row.photo_path,
    orderNumber: row.order_number,
    orderedAt: row.ordered_at,
    currency: row.currency,
    note: row.note,
    itemCount: row.item_count,
    total: Number(row.total),
    createdAt: row.created_at,
    orderedBy: row.ordered_by ?? null,
    forUs: row.for_us ?? true,
    forWhom: row.for_whom ?? '',
    addToStock: row.add_to_stock ?? true,
    hasInvoice: row.has_invoice ?? true,
  }
}

export async function fetchOrders(companyId: string): Promise<OrderSummary[]> {
  const { data, error } = await getSupabase()
    .from('orders_overview')
    .select(columns())
    .eq('company_id', companyId)
    .order('ordered_at', { ascending: false })
    .order('id')
  if (fallBack(error)) return fetchOrders(companyId)
  if (error) throw error
  return (data as unknown as OverviewRow[]).map(toSummary)
}

export async function fetchOrder(companyId: string, id: string): Promise<OrderDetail | null> {
  const db = getSupabase()
  const [order, items, links] = await Promise.all([
    db.from('orders_overview').select(columns()).eq('company_id', companyId).eq('id', id).maybeSingle(),
    db
      .from('order_items')
      .select('id, name, article_number, quantity, unit_price, category_id')
      .eq('company_id', companyId)
      .eq('order_id', id)
      .order('position'),
    db.from('equipment_purchases').select('order_item_id, equipment_id, quantity').eq('company_id', companyId).eq('order_id', id),
  ])
  if (fallBack(order.error)) return fetchOrder(companyId, id)
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
    ...toSummary(order.data as unknown as OverviewRow),
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
    // „Nepridávať do techniky“ platí pre celú objednávku.
    const mode: ItemMode = category?.consumable || values.addToStock === false ? 'none' : item.mode
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
      source: values.source,
      supplier: values.supplier,
      // Predajca patrí len k nákupu z bazáru.
      seller: values.source === 'marketplace' ? values.seller : '',
      order_number: values.orderNumber,
      ordered_at: values.orderedAt,
      currency: values.currency,
      note: values.note,
    },
    _items: items,
  })
  if (error) throw error
  const id = data as string
  await setOrderFlags(companyId, id, values)
  return id
}

export type OrderFlags = Pick<OrderFormValues, 'orderedBy' | 'forUs' | 'forWhom' | 'addToStock' | 'hasInvoice'>

/**
 * Kto objednal, pre koho, či do techniky a či s faktúrou (0060). Predvolené hodnoty sa neposielajú,
 * takže bez migrácie sa objednávka uloží aj tak; vyplnené údaje vtedy ohlási chyba.
 */
export async function setOrderFlags(companyId: string, id: string, flags: OrderFlags) {
  const row: Record<string, unknown> = {}
  if (flags.orderedBy) row.ordered_by = flags.orderedBy
  if (flags.forUs !== undefined) row.for_us = flags.forUs
  if (flags.forWhom !== undefined) row.for_whom = flags.forUs === false ? flags.forWhom.trim() : ''
  if (flags.addToStock !== undefined) row.add_to_stock = flags.addToStock
  if (flags.hasInvoice !== undefined) row.has_invoice = flags.hasInvoice
  const changed = Boolean(flags.orderedBy) || flags.forUs === false || flags.addToStock === false || flags.hasInvoice === false
  if (Object.keys(row).length === 0 || (!changed && !extraColumns)) return
  const { error } = await getSupabase().from('orders').update(row).eq('company_id', companyId).eq('id', id)
  if (error && !(isMissingColumn(error, 'for_us') && !changed)) throw error
}

/** Nahrá fotku nákupu aj s náhľadom do zoznamu a zapíše ju k objednávke. */
export async function saveOrderPhoto(companyId: string, orderId: string, file: File) {
  const path = await storeCompanyPhoto(companyId, `order-${orderId}`, file, { thumb: true })
  await setOrderPhoto(companyId, orderId, path)
}

async function setOrderPhoto(companyId: string, id: string, path: string) {
  const { data, error } = await getSupabase().from('orders').update({ photo_path: path }).eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

export async function deleteOrder(companyId: string, id: string) {
  const { data, error } = await getSupabase().from('orders').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}

export async function fetchPurchases(companyId: string, equipmentId: string): Promise<Purchase[]> {
  const { data, error } = await getSupabase()
    .from('equipment_purchases')
    .select('order_id, source, supplier, seller, ordered_at, currency, quantity, unit_price, article_number')
    .eq('company_id', companyId)
    .eq('equipment_id', equipmentId)
    .order('ordered_at', { ascending: false })
  if (error) throw error
  const rows = data as {
    order_id: string
    source: OrderSource
    supplier: string
    seller: string
    ordered_at: string
    currency: string
    quantity: number
    unit_price: number | string
    article_number: string
  }[]
  return rows.map((row) => ({
    orderId: row.order_id,
    source: row.source,
    supplier: row.supplier,
    seller: row.seller,
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
