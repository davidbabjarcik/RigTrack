import { useQuery } from '@tanstack/react-query'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import type { Equipment } from '@/features/equipment/model'
import { fetchCompanyIncome } from '@/features/events/income'
import type { CompanyEvent } from '@/features/events/model'
import { eventDates } from '@/features/events/plan'
import { useEvents } from '@/features/events/useEvents'
import { fetchOffers } from '@/features/offers/api'
import type { Offer } from '@/features/offers/model'
import { fetchPayments } from '@/features/payouts/api'
import { getSupabase } from '@/lib/supabase/client'
import { DEFAULT_SETTINGS, eventProfit, type CostKind, type EventCost, type Profit, type ProfitSettings } from './model'

export const profitKeys = {
  data: (companyId: string) => ['company', companyId, 'profit'] as const,
}

const check = <T,>(result: { data: T; error: unknown }) => {
  if (result.error) throw result.error
  return result.data
}

/** Všetko, z čoho sa ráta zisk. Čo prihlásený nesmie vidieť, databáza nevráti (RLS) – výpočet je potom neúplný, nie zlý. */
export async function fetchProfitData(companyId: string) {
  const db = getSupabase()
  const [income, crew, expenses, travel, places, costs, settings, offers] = await Promise.all([
    fetchCompanyIncome(companyId),
    fetchPayments(companyId),
    db.from('event_expenses').select('event_id, amount').eq('company_id', companyId).then(check),
    db.from('event_travel').select('event_id, vehicles, round_trips, extra_km').eq('company_id', companyId).then(check),
    db.from('events').select('id, distance_km').eq('company_id', companyId).then(check),
    db.from('event_costs').select('id, event_id, kind, partner_id, amount, note').eq('company_id', companyId).order('created_at').then(check),
    db.from('profit_settings').select('km_rate, gear_use_days').eq('company_id', companyId).maybeSingle().then(check),
    // Ponuky vidí len ten, kto má na ne právo; bez neho sa príjem ráta len z platieb.
    fetchOffers(companyId).catch((): Offer[] => []),
  ])
  const setting = settings as { km_rate: number | string; gear_use_days: number } | null
  return {
    income,
    crew,
    offers,
    expenses: (expenses as { event_id: string; amount: number | string }[]).map((row) => ({ eventId: row.event_id, amount: Number(row.amount) })),
    travel: (travel as { event_id: string; vehicles: number; round_trips: number; extra_km: number | string }[]).map((row) => ({ eventId: row.event_id, vehicles: row.vehicles, roundTrips: row.round_trips, extraKm: Number(row.extra_km) })),
    distance: new Map((places as { id: string; distance_km: number | string | null }[]).map((row) => [row.id, row.distance_km === null ? null : Number(row.distance_km)])),
    costs: (costs as { id: string; event_id: string; kind: CostKind; partner_id: string | null; amount: number | string; note: string }[]).map(
      (row): EventCost => ({ id: row.id, eventId: row.event_id, kind: row.kind, partnerId: row.partner_id, amount: Number(row.amount), note: row.note }),
    ),
    settings: setting ? { kmRate: Number(setting.km_rate), gearUseDays: setting.gear_use_days } : DEFAULT_SETTINGS,
  }
}

export type ProfitData = Awaited<ReturnType<typeof fetchProfitData>>

/** Zisk jedného eventu z načítaných údajov. */
export function profitOf(event: CompanyEvent, data: ProfitData, equipment: Equipment[]): Profit {
  const byId = new Map(equipment.map((item) => [item.id, item]))
  const distance = data.distance.get(event.id) ?? 0
  const km = data.travel
    .filter((row) => row.eventId === event.id)
    .reduce((sum, row) => sum + (distance ?? 0) * 2 * row.roundTrips * row.vehicles + row.extraKm, 0)
  return eventProfit({
    days: eventDates(event.startsOn, event.endsOn).length,
    payments: data.income.filter((payment) => payment.eventId === event.id),
    offers: data.offers.filter((offer) => offer.eventId === event.id),
    crewPayments: data.crew.filter((payment) => payment.eventId === event.id),
    expenses: data.expenses.filter((row) => row.eventId === event.id).map((row) => row.amount),
    km,
    costs: data.costs.filter((cost) => cost.eventId === event.id),
    gear: event.equipment.map((line) => {
      const item = byId.get(line.equipmentId)
      return { quantity: line.quantity, purchasePrice: item?.attributes.purchasePrice, depreciationYears: item?.attributes.depreciationYears }
    }),
    settings: data.settings,
  })
}

/** Údaje pre zisk: eventy, technika (ceny) a peniaze. */
export function useProfitData(companyId: string) {
  const events = useEvents(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const data = useQuery({ queryKey: profitKeys.data(companyId), queryFn: () => fetchProfitData(companyId), retry: false })
  return { events, equipment, data }
}

export async function addEventCost(companyId: string, eventId: string, cost: { kind: CostKind; partnerId: string | null; amount: number; note: string }) {
  check(await getSupabase().from('event_costs').insert({ company_id: companyId, event_id: eventId, kind: cost.kind, partner_id: cost.partnerId, amount: cost.amount, note: cost.note.trim() }).select('id'))
}

export async function deleteEventCost(id: string) {
  check(await getSupabase().from('event_costs').delete().eq('id', id).select('id'))
}

/** Uloží nastavenie (najprv úprava, inak nový riadok – práva sú len na tieto stĺpce). */
export async function saveProfitSettings(companyId: string, settings: ProfitSettings) {
  const fields = { km_rate: settings.kmRate, gear_use_days: settings.gearUseDays }
  const updated = check(await getSupabase().from('profit_settings').update(fields).eq('company_id', companyId).select('company_id')) as unknown[]
  if (updated.length === 0) check(await getSupabase().from('profit_settings').insert({ company_id: companyId, ...fields }).select('company_id'))
}
