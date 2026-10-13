import { z } from 'zod'
import { previousEdition, type CompanyEvent } from '@/features/events/model'

// Zodpovedá check constraint v 0021_hours_payouts.sql.
export const PAYMENT_KINDS = ['reward', 'advance', 'bonus', 'other'] as const
export type PaymentKind = (typeof PAYMENT_KINDS)[number]

export const PAYMENT_KIND_LABELS: Record<PaymentKind, string> = {
  reward: 'Odmena za akciu',
  advance: 'Záloha',
  bonus: 'Bonus',
  other: 'Iné',
}

export type Payment = {
  id: string
  memberId: string
  amount: number
  kind: PaymentKind
  happenedOn: string
  eventId: string | null
  note: string
  paidAt: string | null
}

export const paymentSchema = z.object({
  memberId: z.string().min(1, 'Vyberte člena'),
  amount: z.number('Zadajte sumu').positive('Suma musí byť viac ako 0').max(1_000_000),
  kind: z.enum(PAYMENT_KINDS),
  happenedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Zadajte dátum'),
  eventId: z.string(),
  note: z.string().trim().max(500, 'Najviac 500 znakov'),
})
export type PaymentFormValues = z.infer<typeof paymentSchema>

const cents = (amount: number) => Math.round(amount * 100)

/** Súčty v centoch presne: čo ešte treba vyplatiť a čo už vyplatené bolo. */
export function paymentTotals(payments: Pick<Payment, 'amount' | 'paidAt'>[]) {
  let unpaid = 0
  let paid = 0
  for (const payment of payments) {
    if (payment.paidAt) paid += cents(payment.amount)
    else unpaid += cents(payment.amount)
  }
  return { unpaid: unpaid / 100, paid: paid / 100 }
}

/** Nevyplatené sumy po členoch, najvyššia prvá; členovia bez dlhu v zozname nie sú. */
export function unpaidByMember(payments: Pick<Payment, 'memberId' | 'amount' | 'paidAt'>[]) {
  const totals = new Map<string, number>()
  for (const payment of payments) {
    if (!payment.paidAt) totals.set(payment.memberId, (totals.get(payment.memberId) ?? 0) + cents(payment.amount))
  }
  return [...totals.entries()].map(([memberId, total]) => ({ memberId, unpaid: total / 100 })).sort((a, b) => b.unpaid - a.unpaid)
}

/** Nevyplatené hore (najstaršie prvé, tie čakajú najdlhšie), vyplatené pod nimi od najnovších. */
export function sortPayments(payments: Payment[]) {
  return [...payments].sort((a, b) => {
    const paid = Number(Boolean(a.paidAt)) - Number(Boolean(b.paidAt))
    if (paid !== 0) return paid
    return a.paidAt ? b.happenedOn.localeCompare(a.happenedOn) : a.happenedOn.localeCompare(b.happenedOn)
  })
}

export type MemberShare = {
  /** null = zvyšní členovia zlúčení do jedného riadku. */
  memberId: string | null
  amount: number
  /** Podiel na celku, 0–1. */
  share: number
  /** Koľko členov riadok zastupuje. */
  members: number
}

/**
 * Kto dostal akú časť odmien, od najväčšej. Najviac `limit` členov má vlastný riadok,
 * zvyšok sa zlúči do „Ostatní“, aby graf ostal čitateľný.
 */
export function shareByMember(payments: Pick<Payment, 'memberId' | 'amount' | 'paidAt'>[], paidOnly: boolean, limit = 8) {
  const totals = new Map<string, number>()
  for (const payment of payments) {
    if (paidOnly && !payment.paidAt) continue
    totals.set(payment.memberId, (totals.get(payment.memberId) ?? 0) + cents(payment.amount))
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const total = sorted.reduce((sum, [, amount]) => sum + amount, 0)
  if (total === 0) return { rows: [] as MemberShare[], total: 0 }

  const row = (memberId: string | null, amount: number, members: number): MemberShare => ({ memberId, amount: amount / 100, share: amount / total, members })
  const rows = sorted.slice(0, limit).map(([memberId, amount]) => row(memberId, amount, 1))
  const rest = sorted.slice(limit)
  if (rest.length > 0) {
    rows.push(
      row(
        null,
        rest.reduce((sum, [, amount]) => sum + amount, 0),
        rest.length,
      ),
    )
  }
  return { rows, total: total / 100 }
}

/** Roky, v ktorých sú nejaké záznamy, od najnovšieho. */
export function paymentYears(payments: Pick<Payment, 'happenedOn'>[]) {
  return [...new Set(payments.map((payment) => payment.happenedOn.slice(0, 4)))].sort().reverse()
}

/** Záznamy jedného roka; prázdny rok = všetky. */
export function inYear<T extends Pick<Payment, 'happenedOn'>>(payments: T[], year: string) {
  return year ? payments.filter((payment) => payment.happenedOn.startsWith(year)) : payments
}

/**
 * Koľko dostal člen za minulý ročník tej istej akcie. Podľa toho sa navrhuje suma
 * a upozorňuje sa, keď je nová nižšia. Null, ak akcia nemá minulý ročník alebo na ňom člen odmenu nemal.
 */
export function lastEditionPayout(
  payments: Pick<Payment, 'memberId' | 'eventId' | 'amount'>[],
  events: CompanyEvent[],
  memberId: string,
  eventId: string,
) {
  const event = events.find((item) => item.id === eventId)
  if (!event || !memberId) return null
  const previous = previousEdition(events, event)
  if (!previous) return null
  const mine = payments.filter((payment) => payment.memberId === memberId && payment.eventId === previous.id)
  if (mine.length === 0) return null
  return { event: previous, amount: mine.reduce((sum, payment) => sum + cents(payment.amount), 0) / 100 }
}
