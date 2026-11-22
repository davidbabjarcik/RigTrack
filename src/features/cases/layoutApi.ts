import { getSupabase } from '@/lib/supabase/client'
import { isMissingColumn } from '@/lib/supabase/errors'
import { placeables, readLayout, withoutGone, type CaseLayout } from './layout'
import type { SheetCompartments } from './contentSheet'

export const layoutKey = (companyId: string, caseId: string) => ['company', companyId, 'cases', caseId, 'layout'] as const

/** Rozloženie case; undefined = stĺpec ešte nie je (migrácia 0186), null = bez rozloženia. */
export async function fetchLayout(companyId: string, caseId: string): Promise<CaseLayout | null | undefined> {
  const { data, error } = await getSupabase().from('cases').select('layout').eq('company_id', companyId).eq('id', caseId).maybeSingle()
  if (isMissingColumn(error, 'layout')) return undefined
  if (error) throw error
  return readLayout((data as { layout?: unknown } | null)?.layout)
}

export async function saveLayout(companyId: string, caseId: string, layout: CaseLayout | null) {
  const { data, error } = await getSupabase().from('cases').update({ layout: layout ?? {} }).eq('company_id', companyId).eq('id', caseId).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

type Piece = { id: string; name: string; quantity: number; trackUnits: boolean; unitIds: number[]; photoPath?: string }

/** Rozloženie na hárok s obsahom: časti, mriežka a v priehradkách „6× SM58“, „PAR #3“. */
export function sheetCompartments(layout: CaseLayout, content: Piece[]): SheetCompartments {
  const clean = withoutGone(layout, content)
  const items = placeables(content)
  const label = (item: { equipmentId: string; unit: number | null; count: number }) => {
    const piece = items.find((other) => other.equipmentId === item.equipmentId && other.unit === item.unit)
    if (!piece) return ''
    return piece.unit === null ? `${item.count || piece.quantity}× ${piece.label}` : piece.label
  }
  // Fotky techniky v priehradke (každá raz), ak sú v obsahu.
  const photosOf = (cell: { items: { equipmentId: string }[] }) => [
    ...new Set(cell.items.map((item) => content.find((piece) => piece.id === item.equipmentId)?.photoPath ?? '').filter(Boolean)),
  ]
  return clean.sections.map((section) => ({
    name: section.name,
    cols: section.cols,
    cells: section.cells.map((cell) => ({ lines: cell.items.map(label).filter(Boolean), note: cell.note, photos: photosOf(cell) })),
  }))
}
