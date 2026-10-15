import type { EquipmentKind, Lookup } from './model'

// Farby kategórií: prúžok pred fotkou v zozname techniky. Zodpovedá check constraint v 0042.
export const CATEGORY_COLORS = ['green', 'pink', 'yellow', 'red', 'blue', 'purple', 'orange', 'teal', 'gray'] as const
export type CategoryColor = (typeof CATEGORY_COLORS)[number]

export const COLOR_LABELS: Record<CategoryColor, string> = {
  green: 'Zelená',
  pink: 'Ružová',
  yellow: 'Žltá',
  red: 'Červená',
  blue: 'Modrá',
  purple: 'Fialová',
  orange: 'Oranžová',
  teal: 'Tyrkysová',
  gray: 'Sivá',
}

/** Triedy pozadia (celé názvy, aby ich Tailwind našiel). */
export const COLOR_CLASSES: Record<CategoryColor, string> = {
  green: 'bg-emerald-500',
  pink: 'bg-pink-500',
  yellow: 'bg-yellow-400',
  red: 'bg-red-600',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  teal: 'bg-teal-500',
  gray: 'bg-slate-400',
}

const plain = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Farba podľa názvu kategórie, kým ju nikto nenastavil: svetlá zelené, zvuk ružový, pódium žlté, hliník/truss červený. */
export function suggestedColor(name: string): CategoryColor | null {
  const text = plain(name)
  if (/svetl|light/.test(text)) return 'green'
  if (/zvuk|audio|sound/.test(text)) return 'pink'
  if (/podi|stage|nivtec/.test(text)) return 'yellow'
  if (/hlinik|truss|alu/.test(text)) return 'red'
  return null
}

const KIND_COLORS: Partial<Record<EquipmentKind, CategoryColor>> = { light: 'green', audio: 'pink', stage: 'yellow', truss: 'red' }

/** Farba techniky: nastavená farba kategórie, inak odhad podľa názvu kategórie, inak podľa druhu. */
export function colorOf(item: { kind: EquipmentKind; categoryId: string | null }, categories: Lookup[]): CategoryColor | null {
  const category = categories.find((candidate) => candidate.id === item.categoryId)
  return category?.color ?? (category ? suggestedColor(category.name) : null) ?? KIND_COLORS[item.kind] ?? null
}
