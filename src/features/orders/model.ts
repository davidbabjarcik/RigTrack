import { z } from 'zod'
import { EQUIPMENT_KINDS } from '@/features/equipment/model'

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
  supplier: text(120).min(1, 'Zadajte dodávateľa'),
  orderNumber: text(80),
  orderedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Zadajte dátum'),
  currency: z.enum(CURRENCIES),
  note: text(2000),
  items: z.array(itemSchema).min(1, 'Pridajte aspoň jednu položku'),
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
  supplier: string
  orderNumber: string
  orderedAt: string
  currency: string
  note: string
  itemCount: number
  total: number
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
  supplier: string
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
