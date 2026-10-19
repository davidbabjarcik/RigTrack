import { z } from 'zod'
import { EQUIPMENT_KINDS } from '@/features/equipment/model'
import { formatMoney } from '@/lib/format'

export const CURRENCIES = ['EUR', 'CZK', 'USD', 'GBP'] as const

// Zodpovedá režimom funkcie create_order v migráciách.
export const ITEM_MODES = ['separate', 'bulk', 'existing', 'none'] as const
export type ItemMode = (typeof ITEM_MODES)[number]

export const MODE_LABELS: Record<ItemMode, string> = {
  separate: 'Nová technika — každý kus zvlášť',
  bulk: 'Nová technika — jedna položka s počtom',
  existing: 'Pripočítať k existujúcej technike',
  none: 'Nepridávať do techniky (len evidovať nákup)',
}

/** Najviac kusov, ktoré sa dajú naraz založiť ako samostatné položky. */
export const MAX_SEPARATE = 200

const text = (max: number) => z.string().trim().max(max, `Najviac ${max} znakov`)

/** Odkiaľ je nákup: z obchodu, alebo z bazáru či inzerátu (aj zahraničného). */
export const ORDER_SOURCES = ['shop', 'marketplace'] as const
export type OrderSource = (typeof ORDER_SOURCES)[number]

export const SOURCE_LABELS: Record<OrderSource, string> = { shop: 'Obchod', marketplace: 'Bazár / inzerát' }

/** Bazáre a inzertné portály, ktoré formulár ponúkne; dá sa napísať aj iný. */
export const MARKETPLACES = [
  'Bazoš.sk',
  'Bazoš.cz',
  'Bazoš.at',
  'Bazoš.pl',
  'Hudebnibazar.cz',
  'Sbazar.cz',
  'Kleinanzeigen',
  'Willhaben',
  'eBay',
  'Reverb',
  'Marktplaats',
  'Allegro',
  'OLX',
  'Facebook Marketplace',
]

const itemSchema = z
  .object({
    name: text(200).min(1, 'Zadajte názov'),
    articleNumber: text(60),
    quantity: z.number('Zadajte počet').int('Celé číslo').min(1, 'Aspoň 1').max(100000),
    unitPrice: z.number('Zadajte cenu').min(0, 'Cena nemôže byť záporná'),
    mode: z.enum(ITEM_MODES),
    equipmentId: z.string(),
    equipmentName: text(120),
    /** Názov kategórie; neexistujúca sa pri uložení založí. */
    category: text(80),
    kind: z.enum(EQUIPMENT_KINDS),
  })
  .superRefine((item, ctx) => {
    if (item.mode === 'existing' && !item.equipmentId) {
      ctx.addIssue({ code: 'custom', path: ['equipmentId'], message: 'Vyberte techniku' })
    }
    if (item.mode === 'separate' && item.quantity > MAX_SEPARATE) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: `Zvlášť možno založiť najviac ${MAX_SEPARATE} kusov; zvoľte položku s počtom`,
      })
    }
  })

export const orderSchema = z.object({
  source: z.enum(ORDER_SOURCES),
  supplier: text(120).min(1, 'Zadajte dodávateľa'),
  /** Meno predajcu pri bazári. */
  seller: text(120),
  orderNumber: text(80),
  orderedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Zadajte dátum'),
  currency: z.enum(CURRENCIES),
  note: text(2000),
  items: z.array(itemSchema).min(1, 'Pridajte aspoň jednu položku'),
  /** Kto objednal (člen firmy); prázdne = ten, kto zapisuje. */
  orderedBy: z.string().optional(),
  /** Nie pre nás: kúpené pre klienta / kolegu – nezaráta sa do našich nákladov. */
  forUs: z.boolean().optional(),
  forWhom: text(120).optional(),
  /** Vypnuté = žiadna položka sa nepridá do techniky. */
  addToStock: z.boolean().optional(),
  hasInvoice: z.boolean().optional(),
})

export type OrderFormValues = z.infer<typeof orderSchema>
export type OrderItemValues = OrderFormValues['items'][number]

export const EMPTY_ITEM: OrderItemValues = {
  name: '',
  articleNumber: '',
  quantity: 1,
  unitPrice: 0,
  mode: 'separate',
  equipmentId: '',
  equipmentName: '',
  category: '',
  kind: 'general',
}

/**
 * Odkaz na tovar u dodávateľa podľa kódu tovaru. Zatiaľ iba Thomann: hľadanie podľa čísla
 * artiklu ho presmeruje do obchodu v jazyku návštevníka. Pre iných dodávateľov null.
 */
export function supplierProductUrl(supplier: string, articleNumber: string) {
  const code = articleNumber.trim()
  if (!code || !/thomann/i.test(supplier)) return null
  return `https://www.thomann.de/intl/search_dir.html?sw=${encodeURIComponent(code)}`
}

/** Súčet v centoch, aby sa nesčítavali chyby zaokrúhlenia desatinných čísel. */
export function orderTotal(items: { quantity: number; unitPrice: number }[]) {
  const cents = items.reduce((sum, item) => {
    const line = Math.round(item.unitPrice * 100) * item.quantity
    return sum + (Number.isFinite(line) ? line : 0)
  }, 0)
  return cents / 100
}

/** Čo sa s tovarom daného kódu urobilo naposledy; predvolí sa to aj pri ďalšom importe. */
export type RememberedArticle = {
  mode: ItemMode
  /** Technika, ku ktorej sa tovar pripísal (iba pri bulk/existing a ak ešte existuje). */
  equipmentId: string | null
  /** Názov kategórie riadku. */
  category: string
}

export type OrderSummary = {
  id: string
  source: OrderSource
  supplier: string
  seller: string
  /** Nepovinná fotka nákupu (tovar, inzerát, bloček). */
  photoPath: string
  orderNumber: string
  orderedAt: string
  currency: string
  note: string
  itemCount: number
  total: number
  /** Údaje z 0060; bez migrácie predvolené (pre nás, do techniky, s faktúrou). */
  createdAt?: string
  orderedBy?: string | null
  forUs?: boolean
  forWhom?: string
  addToStock?: boolean
  hasInvoice?: boolean
}

export const ORDER_SORTS = ['ordered_desc', 'ordered_asc', 'created_desc', 'created_asc', 'total_desc', 'total_asc'] as const
export type OrderSort = (typeof ORDER_SORTS)[number]
export const ORDER_SORT_LABELS: Record<OrderSort, string> = {
  ordered_desc: 'Dátum kúpy – najnovšie',
  ordered_asc: 'Dátum kúpy – najstaršie',
  created_desc: 'Naposledy pridané',
  created_asc: 'Najskôr pridané',
  total_desc: 'Najvyššia cena',
  total_asc: 'Najnižšia cena',
}

export type OrderFilter = {
  search: string
  orderedBy: string
  /** „us“ = pre nás, „others“ = nie pre nás. */
  forWhom: '' | 'us' | 'others'
  source: '' | OrderSource
  year: string
  /** „noInvoice“ = bez faktúry, „noStock“ = nepridané do techniky. */
  flag: '' | 'noInvoice' | 'noStock'
  sort: OrderSort
}

export const NO_ORDER_FILTER: OrderFilter = { search: '', orderedBy: '', forWhom: '', source: '', year: '', flag: '', sort: 'ordered_desc' }

const plainText = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export function filterOrders(orders: OrderSummary[], filter: OrderFilter) {
  const words = plainText(filter.search).split(/\s+/).filter(Boolean)
  const found = orders.filter((order) => {
    if (filter.orderedBy && order.orderedBy !== filter.orderedBy) return false
    if (filter.forWhom === 'us' && order.forUs === false) return false
    if (filter.forWhom === 'others' && order.forUs !== false) return false
    if (filter.source && order.source !== filter.source) return false
    if (filter.year && !order.orderedAt.startsWith(filter.year)) return false
    if (filter.flag === 'noInvoice' && order.hasInvoice !== false) return false
    if (filter.flag === 'noStock' && order.addToStock !== false) return false
    const haystack = plainText([order.supplier, order.seller, order.orderNumber, order.note, order.forWhom].join(' '))
    return words.every((word) => haystack.includes(word))
  })
  const [field, direction] = filter.sort.split('_') as ['ordered' | 'created' | 'total', 'asc' | 'desc']
  const sign = direction === 'asc' ? 1 : -1
  const key = (order: OrderSummary) => (field === 'ordered' ? order.orderedAt : field === 'created' ? (order.createdAt ?? order.orderedAt) : order.total)
  return [...found].sort((a, b) => {
    const x = key(a)
    const y = key(b)
    return sign * (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y)))
  })
}

export type OrderStats = {
  count: number
  /** Súčty podľa meny (objednávky môžu byť v rôznych menách). */
  totals: Record<string, number>
  forOthers: Record<string, number>
  byMonth: { month: string; totals: Record<string, number>; count: number }[]
  bySupplier: { name: string; totals: Record<string, number>; count: number }[]
  byOrderer: { id: string | null; totals: Record<string, number>; count: number }[]
}

const addTo = (totals: Record<string, number>, currency: string, amount: number) => {
  totals[currency] = Math.round(((totals[currency] ?? 0) + amount) * 100) / 100
}

/** Štatistiky objednávok: súčty (pre nás aj nie pre nás), po mesiacoch, dodávateľoch a objednávateľoch. */
export function orderStats(orders: OrderSummary[]): OrderStats {
  const stats: OrderStats = { count: orders.length, totals: {}, forOthers: {}, byMonth: [], bySupplier: [], byOrderer: [] }
  const months = new Map<string, OrderStats['byMonth'][number]>()
  const suppliers = new Map<string, OrderStats['bySupplier'][number]>()
  const orderers = new Map<string | null, OrderStats['byOrderer'][number]>()
  for (const order of orders) {
    if (order.forUs === false) {
      addTo(stats.forOthers, order.currency, order.total)
      continue
    }
    addTo(stats.totals, order.currency, order.total)
    const month = order.orderedAt.slice(0, 7)
    const m = months.get(month) ?? { month, totals: {}, count: 0 }
    addTo(m.totals, order.currency, order.total)
    m.count += 1
    months.set(month, m)
    const supplierKey = order.supplier.trim().toLowerCase()
    const s = suppliers.get(supplierKey) ?? { name: order.supplier.trim(), totals: {}, count: 0 }
    addTo(s.totals, order.currency, order.total)
    s.count += 1
    suppliers.set(supplierKey, s)
    const who = order.orderedBy ?? null
    const o = orderers.get(who) ?? { id: who, totals: {}, count: 0 }
    addTo(o.totals, order.currency, order.total)
    o.count += 1
    orderers.set(who, o)
  }
  const main = (totals: Record<string, number>) => totals.EUR ?? Object.values(totals)[0] ?? 0
  stats.byMonth = [...months.values()].sort((a, b) => b.month.localeCompare(a.month))
  stats.bySupplier = [...suppliers.values()].sort((a, b) => main(b.totals) - main(a.totals))
  stats.byOrderer = [...orderers.values()].sort((a, b) => main(b.totals) - main(a.totals))
  return stats
}

export type OrderLine = {
  id: string
  name: string
  articleNumber: string
  quantity: number
  unitPrice: number
  categoryId: string | null
  equipment: { equipmentId: string; quantity: number }[]
}

export type OrderDetail = OrderSummary & { lines: OrderLine[] }

export type Purchase = {
  orderId: string
  source: OrderSource
  supplier: string
  seller: string
  orderedAt: string
  currency: string
  quantity: number
  unitPrice: number
  articleNumber: string
}

/** Riadok objednávky nájdený hľadaním naprieč objednávkami (história cien). */
export type FoundLine = {
  id: string
  orderId: string
  name: string
  articleNumber: string
  quantity: number
  unitPrice: number
  supplier: string
  orderedAt: string
  currency: string
}

/** „1 200,00 € + 300,00 Kč“ – súčty vo viacerých menách. */
export function formatTotals(totals: Record<string, number>) {
  const entries = Object.entries(totals)
  if (entries.length === 0) return formatMoney(0, 'EUR')
  return entries.map(([currency, amount]) => formatMoney(amount, currency)).join(' + ')
}
