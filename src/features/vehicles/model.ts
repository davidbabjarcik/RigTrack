import { z } from 'zod'

export const VEHICLE_STATUSES = ['active', 'in_service', 'retired'] as const
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number]

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  active: 'Aktívne',
  in_service: 'V servise',
  retired: 'Vyradené',
}

/** Termíny, ktoré sa pri vozidle sledujú. */
export const DEADLINES = [
  { key: 'stkUntil', label: 'STK' },
  { key: 'ekUntil', label: 'Emisná kontrola' },
  { key: 'vignetteUntil', label: 'Diaľničná známka' },
  { key: 'pzpUntil', label: 'PZP' },
  { key: 'cascoUntil', label: 'Havarijné poistenie' },
  { key: 'leasingUntil', label: 'Leasing' },
] as const
export type DeadlineKey = (typeof DEADLINES)[number]['key']

export type Vehicle = {
  id: string
  plate: string
  model: string
  vin: string
  status: VehicleStatus
  driver: string
  odometerKm: number | null
  /** Cesta fotky v Storage, prázdna bez fotky. */
  photoPath: string
  /** Najviac koľko kg sa smie naložiť. */
  payloadKg: number | null
  /** Vnútorné rozmery nákladného priestoru. */
  cargoLengthCm: number | null
  cargoWidthCm: number | null
  cargoHeightCm: number | null
  cargoObstacles: CargoObstacle[]
  /** Stály servis auta (servisný technik z adresára). */
  technicianId: string | null
  note: string
} & Record<DeadlineKey, string | null>

/**
 * Miesto v nákladnom priestore, kam sa nedá nakladať (podbeh kolesa, prepážka).
 * Kváder na podlahe: x = od kabíny, y = od ľavej steny, všetko v cm.
 */
export type CargoObstacle = { label: string; x: number; y: number; length: number; width: number; height: number }

const text = (max: number) => z.string().trim().max(max, `Najviac ${max} znakov`)
const optionalDate = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Zadajte dátum')

const cargoSide = (max: number) => z.number('Zadajte číslo').int('Celé centimetre').min(1, 'Aspoň 1 cm').max(max).optional()

// Limity zodpovedajú check constraints v 0013_vehicles.sql a 0031_vehicle_cargo.sql.
export const vehicleSchema = z.object({
  plate: text(20).min(1, 'Zadajte EČV'),
  model: text(80),
  vin: text(20),
  status: z.enum(VEHICLE_STATUSES),
  driver: text(80),
  odometerKm: z.number('Zadajte číslo').int('Celé kilometre').min(0, 'Nemôže byť záporné').max(5_000_000).optional(),
  stkUntil: optionalDate,
  ekUntil: optionalDate,
  vignetteUntil: optionalDate,
  pzpUntil: optionalDate,
  cascoUntil: optionalDate,
  leasingUntil: optionalDate,
  payloadKg: z.number('Zadajte číslo').int('Celé kilogramy').min(1, 'Aspoň 1 kg').max(100_000).optional(),
  cargoLengthCm: cargoSide(2000),
  cargoWidthCm: cargoSide(500),
  cargoHeightCm: cargoSide(500),
  cargoObstacles: z
    .array(
      z.object({
        label: text(40),
        x: z.number('Číslo').min(0, 'Nie záporné').max(2000),
        y: z.number('Číslo').min(0, 'Nie záporné').max(500),
        length: z.number('Číslo').positive('Viac ako 0').max(2000),
        width: z.number('Číslo').positive('Viac ako 0').max(500),
        height: z.number('Číslo').positive('Viac ako 0').max(500),
      }),
    )
    .max(20, 'Najviac 20 prekážok'),
  /** Id technika z adresára alebo prázdne. */
  technicianId: z.string(),
  note: text(2000),
})
export type VehicleFormValues = z.infer<typeof vehicleSchema>

// ---------------------------------------------------------------------------
// Termíny
// ---------------------------------------------------------------------------

export type DeadlineState = 'expired' | 'soon' | 'ok'
export type Deadline = { key: DeadlineKey; label: string; date: string; state: DeadlineState; days: number }

/** Koľko dní vopred sa termín začne pripomínať. */
export const SOON_DAYS = 30

export function daysUntil(date: string, today: string) {
  return Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000)
}

/** Vyplnené termíny vozidla so stavom k dnešnému dňu, najbližší prvý. */
export function vehicleDeadlines(vehicle: Record<DeadlineKey, string | null>, today: string): Deadline[] {
  return DEADLINES.flatMap(({ key, label }) => {
    const date = vehicle[key]
    if (!date) return []
    const days = daysUntil(date, today)
    const state: DeadlineState = days < 0 ? 'expired' : days <= SOON_DAYS ? 'soon' : 'ok'
    return [{ key, label, date, state, days }]
  }).sort((a, b) => a.date.localeCompare(b.date))
}

/** Termíny po platnosti alebo do 30 dní naprieč vozidlami; vyradené vozidlá sa nerátajú. */
export function upcomingDeadlines(vehicles: Vehicle[], today: string) {
  return vehicles
    .filter((vehicle) => vehicle.status !== 'retired')
    .flatMap((vehicle) =>
      vehicleDeadlines(vehicle, today)
        .filter((deadline) => deadline.state !== 'ok')
        .map((deadline) => ({ vehicle, deadline })),
    )
    .sort((a, b) => a.deadline.date.localeCompare(b.deadline.date))
}

/** „po termíne 5 dní“, „dnes“, „o 12 dní“ */
export function describeDays(days: number) {
  if (days < 0) return `po termíne ${-days} ${-days === 1 ? 'deň' : -days <= 4 ? 'dni' : 'dní'}`
  if (days === 0) return 'dnes'
  return `o ${days} ${days === 1 ? 'deň' : days <= 4 ? 'dni' : 'dní'}`
}

// ---------------------------------------------------------------------------
// Záznamy o prevádzke
// ---------------------------------------------------------------------------

export const RECORD_KINDS = ['fuel', 'service', 'repair', 'oil', 'tyres', 'accident', 'other'] as const
export type RecordKind = (typeof RECORD_KINDS)[number]

export const RECORD_KIND_LABELS: Record<RecordKind, string> = {
  fuel: 'Tankovanie',
  service: 'Servisná prehliadka',
  repair: 'Oprava',
  oil: 'Výmena oleja a filtrov',
  tyres: 'Pneumatiky',
  accident: 'Nehoda / poistná udalosť',
  other: 'Iné',
}

export type VehicleRecord = {
  id: string
  kind: RecordKind
  happenedOn: string
  odometerKm: number | null
  cost: number | null
  liters: number | null
  description: string
  /** Kto robil servis / opravu (technik z adresára). */
  technicianId: string | null
}

export const recordSchema = z.object({
  kind: z.enum(RECORD_KINDS),
  happenedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Zadajte dátum'),
  odometerKm: z.number('Zadajte číslo').int('Celé kilometre').min(0).max(5_000_000).optional(),
  cost: z.number('Zadajte číslo').min(0, 'Nemôže byť záporné').max(10_000_000).optional(),
  liters: z.number('Zadajte číslo').positive('Musí byť viac ako 0').max(10_000).optional(),
  description: text(1000),
  technicianId: z.string(),
})
export type RecordFormValues = z.infer<typeof recordSchema>

export function totalCost(records: Pick<VehicleRecord, 'cost'>[]) {
  return Math.round(records.reduce((sum, record) => sum + (record.cost ?? 0), 0) * 100) / 100
}

/**
 * Priemerná spotreba v l/100 km z tankovaní so stavom kilometrov.
 * Prvé tankovanie je východisko: jeho litre sa spotrebovali pred ním, takže sa nerátajú.
 * Bez aspoň dvoch tankovaní s kilometrami vráti null.
 */
export function fuelConsumption(records: Pick<VehicleRecord, 'kind' | 'odometerKm' | 'liters'>[]) {
  const fills = records
    .filter((record) => record.kind === 'fuel' && record.odometerKm !== null && record.liters !== null)
    .sort((a, b) => a.odometerKm! - b.odometerKm!)
  if (fills.length < 2) return null
  const distance = fills[fills.length - 1].odometerKm! - fills[0].odometerKm!
  if (distance <= 0) return null
  const liters = fills.slice(1).reduce((sum, fill) => sum + fill.liters!, 0)
  return Math.round((liters / distance) * 1000) / 10
}
