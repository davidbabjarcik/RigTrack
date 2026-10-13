import { getSupabase } from '@/lib/supabase/client'
import type { Payment, PaymentFormValues, PaymentKind } from './model'

export const payoutKeys = {
  list: (companyId: string) => ['company', companyId, 'payouts'] as const,
}

type Row = {
  id: string
  member_id: string
  amount: number | string
  kind: PaymentKind
  happened_on: string
  event_id: string | null
  note: string
  paid_at: string | null
}

/**
 * Odmeny, ktoré smie prihlásený vidieť: admin všetky, ostatní iba svoje.
 * O tom rozhoduje databáza (RLS), nie tento dotaz.
 */
export async function fetchPayments(companyId: string): Promise<Payment[]> {
  const { data, error } = await getSupabase()
    .from('member_payments')
    .select('id, member_id, amount, kind, happened_on, event_id, note, paid_at')
    .eq('company_id', companyId)
  if (error) throw error
  return (data as Row[]).map((row) => ({
    id: row.id,
    memberId: row.member_id,
    amount: Number(row.amount),
    kind: row.kind,
    happenedOn: row.happened_on,
    eventId: row.event_id,
    note: row.note,
    paidAt: row.paid_at,
  }))
}

export async function addPayment(companyId: string, values: PaymentFormValues) {
  const { error } = await getSupabase()
    .from('member_payments')
    .insert({
      company_id: companyId,
      member_id: values.memberId,
      amount: values.amount,
      kind: values.kind,
      happened_on: values.happenedOn,
      event_id: values.eventId || null,
      note: values.note,
    })
  if (error) throw error
}

/** Označí odmenu ako vyplatenú (alebo vyplatenie vráti späť). */
export async function setPaymentPaid(id: string, paid: boolean) {
  const { data, error } = await getSupabase()
    .from('member_payments')
    .update({ paid_at: paid ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

export async function deletePayment(id: string) {
  const { data, error } = await getSupabase().from('member_payments').delete().eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}
