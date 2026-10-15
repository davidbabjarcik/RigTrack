import { z } from 'zod'
import { PRIORITIES, priorityRank, type Priority } from '@/lib/priority'

// Zodpovedá check constraints v 0016_tasks_shopping.sql.
export const SHOPPING_LISTS = ['buy', 'want'] as const
export type ShoppingList = (typeof SHOPPING_LISTS)[number]

export const SHOPPING_LIST_LABELS: Record<ShoppingList, string> = {
  buy: 'Kúpiť',
  want: 'Chceme časom',
}

export const SHOPPING_STATUSES = ['planned', 'ordered', 'delivered'] as const
export type ShoppingStatus = (typeof SHOPPING_STATUSES)[number]

export const SHOPPING_STATUS_LABELS: Record<ShoppingStatus, string> = {
  planned: 'Treba objednať',
  ordered: 'Objednané',
  delivered: 'Doručené',
}

export type ShoppingItem = {
  id: string
  list: ShoppingList
  name: string
  quantity: number
  unitPrice: number | null
  supplier: string
  url: string
  priority: Priority
  dueOn: string | null
  status: ShoppingStatus
  assigneeId: string | null
  orderNumber: string
  note: string
  createdBy: string | null
  /** Fotka položky (napr. z obchodu); prázdna = bez fotky. */
  photoPath: string
}

const text = (max: number) => z.string().trim().max(max, `Najviac ${max} znakov`)

export const shoppingSchema = z.object({
  list: z.enum(SHOPPING_LISTS),
  name: text(200).min(1, 'Zadajte názov'),
  quantity: z.number('Zadajte počet').int('Celé číslo').min(1, 'Aspoň 1').max(100000),
  unitPrice: z.number('Zadajte číslo').min(0, 'Nemôže byť záporné').max(10_000_000).optional(),
  supplier: text(120),
  url: text(500).refine((value) => value === '' || /^https?:\/\//i.test(value), 'Odkaz musí začínať na http:// alebo https://'),
  priority: z.enum(PRIORITIES),
  dueOn: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Zadajte dátum'),
  status: z.enum(SHOPPING_STATUSES),
  assigneeId: z.string(),
  orderNumber: text(80),
  note: text(2000),
})
export type ShoppingFormValues = z.infer<typeof shoppingSchema>

/** Odhad ceny zoznamu v centoch presne; položky bez ceny sa nerátajú. */
export function shoppingTotal(items: Pick<ShoppingItem, 'quantity' | 'unitPrice'>[]) {
  return items.reduce((sum, item) => sum + Math.round((item.unitPrice ?? 0) * 100) * item.quantity, 0) / 100
}

/** Doručené na koniec; inak podľa priority, termínu a názvu. */
export function sortShopping(items: ShoppingItem[]) {
  return [...items].sort((a, b) => {
    const delivered = Number(a.status === 'delivered') - Number(b.status === 'delivered')
    if (delivered !== 0) return delivered
    const priority = priorityRank(a.priority) - priorityRank(b.priority)
    if (priority !== 0) return priority
    return (a.dueOn ?? '9999').localeCompare(b.dueOn ?? '9999') || a.name.localeCompare(b.name, 'sk')
  })
}
