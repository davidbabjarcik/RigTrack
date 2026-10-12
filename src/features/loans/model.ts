import { z } from 'zod'

// Zodpovedá check constraint v 0014_loans.sql.
export const LOAN_STATUSES = ['reserved', 'issued', 'returned', 'damaged'] as const
export type LoanStatus = (typeof LOAN_STATUSES)[number]

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  reserved: 'Rezervované',
  issued: 'Vydané',
  returned: 'Vrátené',
  damaged: 'Vrátené s poškodením',
}

export type LoanItem = { equipmentId: string; quantity: number; damaged: boolean }

export type Loan = {
  id: string
  borrower: string
  contact: string
  startsOn: string
  endsOn: string
  status: LoanStatus
  note: string
  issuedAt: string | null
  returnedAt: string | null
  items: LoanItem[]
}

const text = (max: number) => z.string().trim().max(max, `Najviac ${max} znakov`)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Zadajte dátum')

export const loanSchema = z
  .object({
    borrower: text(120).min(1, 'Zadajte, komu sa požičiava'),
    contact: text(120),
    startsOn: date,
    endsOn: date,
    note: text(2000),
    items: z
      .array(
        z.object({
          equipmentId: z.string().min(1),
          quantity: z.number('Zadajte počet').int('Celé číslo').min(1, 'Aspoň 1').max(100000),
        }),
      )
      .min(1, 'Pridajte aspoň jeden kus techniky'),
  })
  .superRefine((loan, ctx) => {
    if (loan.startsOn && loan.endsOn && loan.endsOn < loan.startsOn) {
      ctx.addIssue({ code: 'custom', path: ['endsOn'], message: 'Koniec nemôže byť pred začiatkom' })
    }
  })

export type LoanFormValues = z.infer<typeof loanSchema>

/** Otvorená výpožička: technika je rezervovaná alebo vonku. */
export function isOpen(loan: Pick<Loan, 'status'>) {
  return loan.status === 'reserved' || loan.status === 'issued'
}

/** Vydaná a po termíne vrátenia. */
export function isOverdue(loan: Pick<Loan, 'status' | 'endsOn'>, today: string) {
  return loan.status === 'issued' && loan.endsOn < today
}

/** Rezervácia, ktorá mala byť už vydaná. */
export function isAwaitingIssue(loan: Pick<Loan, 'status' | 'startsOn'>, today: string) {
  return loan.status === 'reserved' && loan.startsOn <= today
}

/** Otvorené najprv (po termíne úplne hore), potom uzavreté od najnovších. */
export function sortLoans(loans: Loan[], today: string) {
  const rank = (loan: Loan) => (isOverdue(loan, today) ? 0 : loan.status === 'issued' ? 1 : loan.status === 'reserved' ? 2 : 3)
  return [...loans].sort((a, b) => {
    const byRank = rank(a) - rank(b)
    if (byRank !== 0) return byRank
    return isOpen(a) ? a.startsOn.localeCompare(b.startsOn) : b.startsOn.localeCompare(a.startsOn)
  })
}

/**
 * Koľko kusov danej techniky je v termíne od–do obsadených inými otvorenými výpožičkami.
 * Rovnaké pravidlo ako v databáze: vydaná výpožička po termíne blokuje, kým sa nevráti.
 */
export function busyQuantity(loans: Loan[], equipmentId: string, startsOn: string, endsOn: string, today: string) {
  return loans
    .filter((loan) => isOpen(loan) && loan.startsOn <= endsOn && (isOverdue(loan, today) || loan.endsOn >= startsOn))
    .reduce((sum, loan) => sum + (loan.items.find((item) => item.equipmentId === equipmentId)?.quantity ?? 0), 0)
}
