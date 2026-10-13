import { z } from 'zod'

export { formatUnits } from '@/features/loans/model'

// Zodpovedá check constraints v 0015_service.sql a 0022_service_quantity.sql, 0023_service_units.sql.
export const SERVICE_KINDS = ['repair', 'inspection', 'maintenance'] as const
export type ServiceKind = (typeof SERVICE_KINDS)[number]

export const SERVICE_KIND_LABELS: Record<ServiceKind, string> = {
  repair: 'Oprava',
  inspection: 'Kontrola',
  maintenance: 'Údržba',
}

export const SERVICE_STATUSES = ['open', 'in_progress', 'done'] as const
export type ServiceStatus = (typeof SERVICE_STATUSES)[number]

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  open: 'Nový',
  in_progress: 'Rieši sa',
  done: 'Hotové',
}

export type ServiceRecord = {
  id: string
  equipmentId: string
  /** Koľko kusov techniky záznam pokrýva. */
  quantity: number
  /** Čísla kusov (1..počet kusov techniky), ktorých sa záznam týka; prázdne pri technike s jedným kusom. */
  unitNumbers: number[]
  kind: ServiceKind
  status: ServiceStatus
  happenedOn: string
  problem: string
  workDone: string
  hours: number | null
  cost: number | null
  technician: string
}

const text = (max: number) => z.string().trim().max(max, `Najviac ${max} znakov`)

export const serviceSchema = z.object({
  equipmentId: z.string().min(1, 'Vyberte techniku'),
  /** Pri technike evidovanej po kusoch čísla kusov, inak počet. */
  unitNumbers: z.array(z.number().int().min(1)).max(1000),
  quantity: z.number('Zadajte počet').int('Zadajte celé číslo').min(1, 'Aspoň 1 kus').max(100_000),
  kind: z.enum(SERVICE_KINDS),
  status: z.enum(SERVICE_STATUSES),
  happenedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Zadajte dátum'),
  problem: text(2000),
  workDone: text(2000),
  hours: z.number('Zadajte číslo').min(0, 'Nemôže byť záporné').max(1000).optional(),
  cost: z.number('Zadajte číslo').min(0, 'Nemôže byť záporné').max(10_000_000).optional(),
  technician: text(80),
})
export type ServiceFormValues = z.infer<typeof serviceSchema>

/** Rozpracované záznamy hore (najstaršie prvé, tie horia najdlhšie), hotové pod nimi od najnovších. */
export function sortServiceRecords(records: ServiceRecord[]) {
  return [...records].sort((a, b) => {
    const aOpen = a.status !== 'done'
    const bOpen = b.status !== 'done'
    if (aOpen !== bOpen) return aOpen ? -1 : 1
    return aOpen ? a.happenedOn.localeCompare(b.happenedOn) : b.happenedOn.localeCompare(a.happenedOn)
  })
}

/** Koľko kusov každej techniky je práve v servise (v rozpracovaných záznamoch). */
export function piecesInService(records: Pick<ServiceRecord, 'equipmentId' | 'quantity' | 'status'>[]) {
  const counts = new Map<string, number>()
  for (const record of records) {
    if (record.status !== 'done') counts.set(record.equipmentId, (counts.get(record.equipmentId) ?? 0) + record.quantity)
  }
  return counts
}

/** Čísla kusov každej techniky, ktoré sú práve v servise. */
export function unitsInService(records: Pick<ServiceRecord, 'equipmentId' | 'unitNumbers' | 'status'>[]) {
  const units = new Map<string, number[]>()
  for (const record of records) {
    if (record.status === 'done' || record.unitNumbers.length === 0) continue
    units.set(record.equipmentId, [...(units.get(record.equipmentId) ?? []), ...record.unitNumbers].sort((a, b) => a - b))
  }
  return units
}

/** Súčet odpracovaných hodín a nákladov. */
export function serviceTotals(records: Pick<ServiceRecord, 'hours' | 'cost'>[]) {
  const sum = (pick: (record: Pick<ServiceRecord, 'hours' | 'cost'>) => number | null) =>
    Math.round(records.reduce((total, record) => total + (pick(record) ?? 0), 0) * 100) / 100
  return { hours: sum((record) => record.hours), cost: sum((record) => record.cost) }
}
