import { getSupabase } from '@/lib/supabase/client'
import type { RecordFormValues, RecordKind, Vehicle, VehicleFormValues, VehicleRecord, VehicleStatus } from './model'

export const vehicleKeys = {
  list: (companyId: string) => ['company', companyId, 'vehicles'] as const,
  records: (companyId: string, vehicleId: string) => ['company', companyId, 'vehicles', vehicleId, 'records'] as const,
  costs: (companyId: string) => ['company', companyId, 'vehicles', 'costs'] as const,
}

const COLUMNS =
  'id, plate, model, vin, status, driver, odometer_km, stk_until, ek_until, vignette_until, pzp_until, casco_until, leasing_until, note'

type Row = {
  id: string
  plate: string
  model: string
  vin: string
  status: VehicleStatus
  driver: string
  odometer_km: number | null
  stk_until: string | null
  ek_until: string | null
  vignette_until: string | null
  pzp_until: string | null
  casco_until: string | null
  leasing_until: string | null
  note: string
}

export async function fetchVehicles(companyId: string): Promise<Vehicle[]> {
  const { data, error } = await getSupabase().from('vehicles').select(COLUMNS).eq('company_id', companyId).order('plate')
  if (error) throw error
  return (data as Row[]).map((row) => ({
    id: row.id,
    plate: row.plate,
    model: row.model,
    vin: row.vin,
    status: row.status,
    driver: row.driver,
    odometerKm: row.odometer_km,
    stkUntil: row.stk_until,
    ekUntil: row.ek_until,
    vignetteUntil: row.vignette_until,
    pzpUntil: row.pzp_until,
    cascoUntil: row.casco_until,
    leasingUntil: row.leasing_until,
    note: row.note,
  }))
}

export async function saveVehicle(companyId: string, id: string | null, values: VehicleFormValues): Promise<string> {
  const fields = {
    plate: values.plate.toUpperCase(),
    model: values.model,
    vin: values.vin.toUpperCase(),
    status: values.status,
    driver: values.driver,
    odometer_km: values.odometerKm ?? null,
    stk_until: values.stkUntil || null,
    ek_until: values.ekUntil || null,
    vignette_until: values.vignetteUntil || null,
    pzp_until: values.pzpUntil || null,
    casco_until: values.cascoUntil || null,
    leasing_until: values.leasingUntil || null,
    note: values.note,
  }
  const table = getSupabase().from('vehicles')
  const { data, error } = id
    ? await table.update(fields).eq('company_id', companyId).eq('id', id).select('id').single()
    : await table.insert({ ...fields, company_id: companyId }).select('id').single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function deleteVehicle(companyId: string, id: string) {
  const { data, error } = await getSupabase().from('vehicles').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}

export async function fetchVehicleRecords(companyId: string, vehicleId: string): Promise<VehicleRecord[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_records')
    .select('id, kind, happened_on, odometer_km, cost, liters, description')
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicleId)
    .order('happened_on', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  const rows = data as {
    id: string
    kind: RecordKind
    happened_on: string
    odometer_km: number | null
    cost: number | string | null
    liters: number | string | null
    description: string
  }[]
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    happenedOn: row.happened_on,
    odometerKm: row.odometer_km,
    cost: row.cost === null ? null : Number(row.cost),
    liters: row.liters === null ? null : Number(row.liters),
    description: row.description,
  }))
}

/** Náklady zo záznamov všetkých vozidiel firmy, pre štatistiky. */
export async function fetchVehicleCosts(companyId: string): Promise<{ vehicleId: string; cost: number | null }[]> {
  const { data, error } = await getSupabase().from('vehicle_records').select('vehicle_id, cost').eq('company_id', companyId)
  if (error) throw error
  const rows = data as { vehicle_id: string; cost: number | string | null }[]
  return rows.map((row) => ({ vehicleId: row.vehicle_id, cost: row.cost === null ? null : Number(row.cost) }))
}

export async function addVehicleRecord(companyId: string, vehicleId: string, values: RecordFormValues) {
  const { error } = await getSupabase()
    .from('vehicle_records')
    .insert({
      company_id: companyId,
      vehicle_id: vehicleId,
      kind: values.kind,
      happened_on: values.happenedOn,
      odometer_km: values.odometerKm ?? null,
      cost: values.cost ?? null,
      // Litre dávajú zmysel len pri tankovaní.
      liters: values.kind === 'fuel' ? (values.liters ?? null) : null,
      description: values.description,
    })
  if (error) throw error
}

export async function deleteVehicleRecord(companyId: string, id: string) {
  const { data, error } = await getSupabase().from('vehicle_records').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}
