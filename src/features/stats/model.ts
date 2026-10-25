import { EQUIPMENT_STATUSES, STATUS_LABELS, type Equipment } from '@/features/equipment/model'
import { isOpen, isOverdue, type Loan } from '@/features/loans/model'
import { SERVICE_KIND_LABELS, SERVICE_KINDS, type ServiceRecord } from '@/features/service/model'
import { upcomingDeadlines, type Vehicle } from '@/features/vehicles/model'

// Štatistiky sú odvodený pohľad: počítajú sa z údajov ostatných modulov, nič sa neukladá.

export type Ranked = { id: string; label: string; value: number }

export type Stats = {
  equipment: {
    items: number
    pieces: number
    /** Podiel kusov v stave „dostupná“ z nevyradenej techniky, 0–1. */
    availability: number
    byStatus: Ranked[]
    packed: number
    unpacked: number
  }
  loans: { total: number; open: number; overdue: number; mostLent: Ranked[] }
  service: { records: number; open: number; hours: number; cost: number; byKind: Ranked[]; costliest: Ranked[] }
  vehicles: { count: number; due: number; costs: Ranked[] }
}

export type StatsSources = {
  equipment: Equipment[]
  loans: Loan[]
  service: ServiceRecord[]
  vehicles: Vehicle[]
  vehicleCosts: { vehicleId: string; cost: number | null }[]
}

const TOP = 5
const round2 = (value: number) => Math.round(value * 100) / 100

function top(totals: Map<string, number>, label: (id: string) => string): Ranked[] {
  return [...totals.entries()]
    .filter(([, value]) => value > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, TOP)
    .map(([id, value]) => ({ id, label: label(id), value: round2(value) }))
}

/** Počet dní výpožičky, ktoré padli do okna od `from` do `to` (oba vrátane). */
export function daysWithin(startsOn: string, endsOn: string, from: string, to: string) {
  const start = startsOn > from ? startsOn : from
  const end = endsOn < to ? endsOn : to
  if (end < start) return 0
  return Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1
}

/**
 * `today` a `yearAgo` vymedzujú okno pre vyťaženie techniky: počítajú sa dni,
 * počas ktorých bola technika naozaj vonku (vydané a vrátené výpožičky, nie rezervácie).
 */
export function buildStats(sources: StatsSources, today: string, yearAgo: string): Stats {
  const { equipment, loans, service, vehicles, vehicleCosts } = sources
  const nameOf = (id: string) => equipment.find((item) => item.id === id)?.name ?? 'Odstránená technika'
  // Spotrebný materiál nie je technika na požičanie ani balenie; do prehľadu stavu nepatrí.
  const gear = equipment.filter((item) => item.kind !== 'consumable')
  const active = gear.filter((item) => item.status !== 'retired')
  const pieces = (items: Equipment[]) => items.reduce((sum, item) => sum + item.quantity, 0)

  const lentDays = new Map<string, number>()
  for (const loan of loans.filter((candidate) => candidate.status !== 'reserved')) {
    // Vydaná a nevrátená výpožička je vonku až dodnes, aj keď mala skončiť skôr.
    const end = loan.status === 'issued' && loan.endsOn < today ? today : loan.endsOn
    const days = daysWithin(loan.startsOn, end, yearAgo, today)
    for (const item of loan.items) lentDays.set(item.equipmentId, (lentDays.get(item.equipmentId) ?? 0) + days)
  }

  const serviceCost = new Map<string, number>()
  for (const record of service) {
    serviceCost.set(record.equipmentId, (serviceCost.get(record.equipmentId) ?? 0) + (record.cost ?? 0))
  }

  const vehicleCost = new Map<string, number>()
  for (const record of vehicleCosts) {
    vehicleCost.set(record.vehicleId, (vehicleCost.get(record.vehicleId) ?? 0) + (record.cost ?? 0))
  }

  return {
    equipment: {
      items: gear.length,
      pieces: pieces(gear),
      availability: pieces(active) === 0 ? 0 : pieces(active.filter((item) => item.status === 'available')) / pieces(active),
      byStatus: EQUIPMENT_STATUSES.map((status) => ({
        id: status,
        label: STATUS_LABELS[status],
        value: gear.filter((item) => item.status === status).length,
      })).filter((row) => row.value > 0),
      packed: pieces(active.filter((item) => item.caseId !== null)),
      unpacked: pieces(active.filter((item) => item.caseId === null && !item.attributes.noCase)),
    },
    loans: {
      total: loans.length,
      open: loans.filter(isOpen).length,
      overdue: loans.filter((loan) => isOverdue(loan, today)).length,
      mostLent: top(lentDays, nameOf),
    },
    service: {
      records: service.length,
      open: service.filter((record) => record.status !== 'done').length,
      hours: round2(service.reduce((sum, record) => sum + (record.hours ?? 0), 0)),
      cost: round2(service.reduce((sum, record) => sum + (record.cost ?? 0), 0)),
      byKind: SERVICE_KINDS.map((kind) => ({
        id: kind,
        label: SERVICE_KIND_LABELS[kind],
        value: service.filter((record) => record.kind === kind).length,
      })).filter((row) => row.value > 0),
      costliest: top(serviceCost, nameOf),
    },
    vehicles: {
      count: vehicles.filter((vehicle) => vehicle.status !== 'retired').length,
      due: upcomingDeadlines(vehicles, today).length,
      costs: top(vehicleCost, (id) => vehicles.find((vehicle) => vehicle.id === id)?.plate ?? 'Odstránené vozidlo'),
    },
  }
}
