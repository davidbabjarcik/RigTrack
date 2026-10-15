import { z } from 'zod'

export type Case = {
  id: string
  name: string
  inventoryNumber: string
  locationId: string | null
  /** Číslo case v sade, napr. „1“ a „2“ pri blindroch v dvoch cases. */
  labelNumber: string
  /** Kategória vytlačená na štítku, napr. Sound, Light, Cables. */
  labelCategory: string
  /** Vlastný názov na štítku; použije sa, keď v case nie je označený hlavný prvok. */
  labelTitle: string
  /** Vlastná fotka na štítku (cesta v Storage); platí to isté. */
  labelPhotoPath: string
  weightKg: number | null
  widthCm: number | null
  lengthCm: number | null
  depthCm: number | null
  /** Miesto na pláne skladu a pri regáli poschodie; null = case na pláne nie je. */
  spotId: string | null
  spotLevel: number | null
  note: string
  updatedAt: string
  lastCheck: CaseCheck | null
  /** Fotka case; prázdna = bez fotky. */
  photoPath: string
}

export type CaseCheck = {
  checkedAt: string
  checkedByName: string
  note: string
}

export const LABEL_CATEGORIES = ['Sound', 'Light', 'Cables', 'Video', 'Rigging', 'Power']

const text = (max: number) => z.string().trim().max(max, `Najviac ${max} znakov`)
const size = (max: number) => z.number('Zadajte číslo').positive('Musí byť viac ako 0').max(max).optional()

// Limity zodpovedajú check constraints v 0003_cases.sql.
export const caseSchema = z.object({
  name: text(120).min(1, 'Zadajte názov'),
  inventoryNumber: text(40),
  location: text(80),
  labelNumber: text(20),
  labelCategory: text(40),
  weightKg: size(10000),
  widthCm: size(10000),
  lengthCm: size(10000),
  depthCm: size(10000),
  note: text(2000),
})

/** „120 × 60 × 40 cm“ z rozmerov, ktoré sú vyplnené; bez rozmerov prázdny text. */
export function formatDimensions(item: Pick<Case, 'widthCm' | 'lengthCm' | 'depthCm'>) {
  const sides = [item.widthCm, item.lengthCm, item.depthCm].filter((side) => side !== null)
  return sides.length > 0 ? `${sides.map((side) => String(side).replace('.', ',')).join(' × ')} cm` : ''
}

export type CaseFormValues = z.infer<typeof caseSchema>
