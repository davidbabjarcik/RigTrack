import { z } from 'zod'

// Zodpovedá check constraint v 0014_loans.sql; case položky je z 0024_loan_cases.sql.
export const LOAN_STATUSES = ['reserved', 'issued', 'returned', 'damaged'] as const
export type LoanStatus = (typeof LOAN_STATUSES)[number]

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  reserved: 'Rezervované',
  issued: 'Vydané',
  returned: 'Vrátené',
  damaged: 'Vrátené s poškodením',
}

/** `caseId` je vyplnené, keď technika odišla ako súčasť celého case. */
export type LoanItem = {
  equipmentId: string
  quantity: number
  damaged: boolean
  caseId: string | null
  /** Čísla kusov pri technike evidovanej po kusoch, inak prázdne. */
  unitNumbers: number[]
  /** Čo sa vrátilo poškodené: čísla kusov, pri technike na počet koľko kusov. */
  damagedUnits: number[]
  damagedQuantity: number
  /** Cena za kus a deň zapísaná pri vzniku výpožičky. */
  unitPrice: number | null
}

/** Poškodenie jednej položky pri vrátení. */
export type LoanDamage = { equipmentId: string; units: number[]; quantity: number }

export type Loan = {
  id: string
  borrower: string
  contact: string
  borrowerIco: string
  borrowerAddress: string
  startsOn: string
  endsOn: string
  /** Počet účtovaných dní; bez neho kalendárne dni od–do. */
  billedDays: number | null
  /** Dohodnutá cena; bez nej platí vypočítaná. */
  price: number | null
  deposit: number | null
  status: LoanStatus
  note: string
  issuedAt: string | null
  /** Kto techniku vydal a kto ju prijal späť; prázdne, kým sa to nestalo. */
  issuedByName: string
  returnedByName: string
  returnedAt: string | null
  items: LoanItem[]
}

const text = (max: number) => z.string().trim().max(max, `Najviac ${max} znakov`)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Zadajte dátum')
const money = z.number('Zadajte číslo').min(0, 'Nemôže byť záporné').max(10_000_000).optional()

export const loanSchema = z
  .object({
    borrower: text(120).min(1, 'Zadajte, komu sa požičiava'),
    contact: text(120),
    borrowerIco: text(20),
    borrowerAddress: text(200),
    startsOn: date,
    endsOn: date,
    billedDays: z.number('Zadajte číslo').int('Celé dni').min(1, 'Aspoň 1 deň').max(3650).optional(),
    price: money,
    deposit: money,
    note: text(2000),
    items: z
      .array(
        z.object({
          equipmentId: z.string().min(1),
          quantity: z.number('Zadajte počet').int('Celé číslo').min(1, 'Aspoň 1').max(100000),
          /** Prázdne pri technike vybranej jednotlivo. */
          caseId: z.string(),
          /** Vybrané kusy pri technike evidovanej po kusoch. */
          unitNumbers: z.array(z.number().int().min(1)),
          /** Cena za kus a deň. */
          unitPrice: money,
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

/** Rozdelí položky na celé cases a techniku vybranú jednotlivo; poradie ostáva. */
export function groupByCase<T extends { caseId: string | null }>(items: T[]) {
  const cases = new Map<string, T[]>()
  const single: T[] = []
  for (const item of items) {
    if (item.caseId) cases.set(item.caseId, [...(cases.get(item.caseId) ?? []), item])
    else single.push(item)
  }
  return { cases: [...cases].map(([caseId, content]) => ({ caseId, content })), single }
}

/** „#1, #3“ */
export const formatUnits = (unitNumbers: number[]) => unitNumbers.map((unit) => `#${unit}`).join(', ')

/** Obsah case jedným riadkom: „2× DI box, XLR 5 m, 2× Blinder (#1, #2)“. */
export function describeContent(
  items: { equipmentId: string; quantity: number; unitNumbers?: number[] }[],
  nameOf: (equipmentId: string) => string,
) {
  return items
    .map(
      (item) =>
        (item.quantity > 1 ? `${item.quantity}× ` : '') +
        nameOf(item.equipmentId) +
        (item.unitNumbers?.length ? ` (${formatUnits(item.unitNumbers)})` : ''),
    )
    .join(', ')
}

/** Čo sa z položky vrátilo poškodené, slovom; prázdne, ak nič. */
export function describeDamage(item: Pick<LoanItem, 'damaged' | 'quantity' | 'damagedUnits' | 'damagedQuantity'>) {
  if (!item.damaged) return ''
  if (item.damagedUnits.length > 0) return `poškodené ${formatUnits(item.damagedUnits)}`
  return item.quantity > 1 && item.damagedQuantity > 0 ? `poškodené ${item.damagedQuantity} ks` : 'poškodené'
}

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

/** Čísla kusov danej techniky, ktoré sú v termíne od–do na iných otvorených výpožičkách. */
export function busyUnits(loans: Loan[], equipmentId: string, startsOn: string, endsOn: string, today: string) {
  return loans
    .filter((loan) => isOpen(loan) && loan.startsOn <= endsOn && (isOverdue(loan, today) || loan.endsOn >= startsOn))
    .flatMap((loan) => loan.items.find((item) => item.equipmentId === equipmentId)?.unitNumbers ?? [])
}

/** Kalendárne dni výpožičky vrátane prvého aj posledného; pri neplatných dátumoch 1. */
export function loanDays(startsOn: string, endsOn: string) {
  const days = Math.round((Date.parse(endsOn) - Date.parse(startsOn)) / 86_400_000) + 1
  return Number.isFinite(days) && days >= 1 ? days : 1
}

const cents = (amount: number) => Math.round(amount * 100) / 100

/** Cena položky za jeden deň; bez zapísanej ceny nula. */
export function linePerDay(item: { quantity: number; unitPrice?: number | null }) {
  return cents((item.unitPrice ?? 0) * (Number.isFinite(item.quantity) ? item.quantity : 0))
}

/**
 * Kalkulácia výpožičky: súčet (cena za kus a deň × počet) × účtované dni.
 * Dohodnutá cena má prednosť pred vypočítanou. `priced` hovorí, či výpožička vôbec nejakú cenu má.
 */
export function loanPricing(loan: {
  startsOn: string
  endsOn: string
  billedDays?: number | null
  price?: number | null
  items: { quantity: number; unitPrice?: number | null }[]
}) {
  const days = loan.billedDays ?? loanDays(loan.startsOn, loan.endsOn)
  const perDay = cents(loan.items.reduce((sum, item) => sum + linePerDay(item), 0))
  const calculated = cents(perDay * days)
  const agreed = loan.price ?? null
  return {
    days,
    perDay,
    calculated,
    total: agreed ?? calculated,
    priced: agreed !== null || loan.items.some((item) => item.unitPrice != null),
  }
}
