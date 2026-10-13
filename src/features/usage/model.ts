import { EVENT_STATUS_LABELS, type CompanyEvent } from '@/features/events/model'
import { isOpen, LOAN_STATUS_LABELS, type Loan } from '@/features/loans/model'
import type { ServiceRecord } from '@/features/service/model'

export type UsageEntry = {
  kind: 'loan' | 'event'
  id: string
  title: string
  startsOn: string
  endsOn: string
  status: string
  quantity: number
  /** Čísla kusov, ak ide o techniku evidovanú po kusoch. */
  units: number[]
  to: string
}

/**
 * Výpožičky a eventy, na ktorých bola daná technika, od najnovších.
 * Pri case sa ráta jeho obsah a navyše výpožičky, kde odišiel ako celok
 * (aj keby sa jeho obsah medzitým zmenil). Zrušené eventy sa nerátajú.
 */
export function usageHistory(loans: Loan[], events: CompanyEvent[], equipmentIds: string[], caseId?: string): UsageEntry[] {
  const wanted = new Set(equipmentIds)
  const entries: UsageEntry[] = []
  for (const loan of loans) {
    const items = loan.items.filter((item) => wanted.has(item.equipmentId) || (caseId !== undefined && item.caseId === caseId))
    if (items.length === 0) continue
    entries.push({
      kind: 'loan',
      id: loan.id,
      title: loan.borrower,
      startsOn: loan.startsOn,
      endsOn: loan.endsOn,
      status: LOAN_STATUS_LABELS[loan.status],
      quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      units: equipmentIds.length === 1 ? items.flatMap((item) => item.unitNumbers) : [],
      to: `/loans/${loan.id}`,
    })
  }
  for (const event of events) {
    if (event.status === 'cancelled') continue
    const items = event.equipment.filter((item) => wanted.has(item.equipmentId))
    if (items.length === 0) continue
    entries.push({
      kind: 'event',
      id: event.id,
      title: event.name,
      startsOn: event.startsOn,
      endsOn: event.endsOn,
      status: EVENT_STATUS_LABELS[event.status],
      quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      units: [],
      to: `/events/${event.id}`,
    })
  }
  return entries.sort((a, b) => b.startsOn.localeCompare(a.startsOn))
}

export type UnitSummary = {
  unit: number
  state: 'free' | 'reserved' | 'loaned' | 'service'
  /** Čo kus práve drží: otvorený servis alebo výpožička. */
  current: { label: string; to: string } | null
  serviceCount: number
  loanCount: number
  lastLoan: { id: string; borrower: string; startsOn: string } | null
}

/**
 * Stav a história každého očíslovaného kusu techniky. Servis má prednosť pred výpožičkou,
 * vydaná výpožička pred rezerváciou; z rezervácií sa berie najbližšia.
 */
export function unitSummaries(
  equipmentId: string,
  /** Platné čísla kusov techniky. */
  unitIds: number[],
  loans: Loan[],
  records: Pick<ServiceRecord, 'id' | 'equipmentId' | 'unitNumbers' | 'status'>[],
  today: string,
): UnitSummary[] {
  const mine = records.filter((record) => record.equipmentId === equipmentId)
  const lent = loans
    .map((loan) => ({ loan, units: loan.items.find((item) => item.equipmentId === equipmentId)?.unitNumbers ?? [] }))
    .filter((entry) => entry.units.length > 0)
    .sort((a, b) => b.loan.startsOn.localeCompare(a.loan.startsOn))

  return unitIds.map((unit) => {
    const service = mine.filter((record) => record.unitNumbers.includes(unit))
    const unitLoans = lent.filter((entry) => entry.units.includes(unit)).map((entry) => entry.loan)
    const openService = service.find((record) => record.status !== 'done')
    const issued = unitLoans.find((loan) => loan.status === 'issued')
    const reserved = unitLoans.filter((loan) => loan.status === 'reserved' && loan.endsOn >= today).at(-1)
    const past = unitLoans.find((loan) => !isOpen(loan)) ?? null

    let state: UnitSummary['state'] = 'free'
    let current: UnitSummary['current'] = null
    if (openService) {
      state = 'service'
      current = { label: 'otvorený servisný záznam', to: `/service/${openService.id}` }
    } else if (issued) {
      state = 'loaned'
      current = { label: `u: ${issued.borrower}`, to: `/loans/${issued.id}` }
    } else if (reserved) {
      state = 'reserved'
      current = { label: `pre: ${reserved.borrower}`, to: `/loans/${reserved.id}` }
    }
    return {
      unit,
      state,
      current,
      serviceCount: service.length,
      loanCount: unitLoans.length,
      lastLoan: past && { id: past.id, borrower: past.borrower, startsOn: past.startsOn },
    }
  })
}
