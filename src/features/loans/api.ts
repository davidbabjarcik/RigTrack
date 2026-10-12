import { getSupabase } from '@/lib/supabase/client'
import type { Loan, LoanFormValues, LoanStatus } from './model'

export const loanKeys = {
  list: (companyId: string) => ['company', companyId, 'loans'] as const,
}

type LoanRow = {
  id: string
  borrower: string
  contact: string
  starts_on: string
  ends_on: string
  status: LoanStatus
  note: string
  issued_at: string | null
  returned_at: string | null
}

/** Všetky výpožičky firmy aj s položkami. Dva dotazy, aby nezáviselo od vnárania cez zložené kľúče. */
export async function fetchLoans(companyId: string): Promise<Loan[]> {
  const db = getSupabase()
  const [loans, items] = await Promise.all([
    db
      .from('loans')
      .select('id, borrower, contact, starts_on, ends_on, status, note, issued_at, returned_at')
      .eq('company_id', companyId)
      .order('starts_on', { ascending: false }),
    db.from('loan_items').select('loan_id, equipment_id, quantity, damaged').eq('company_id', companyId),
  ])
  const error = loans.error ?? items.error
  if (error) throw error

  const itemRows = items.data as { loan_id: string; equipment_id: string; quantity: number; damaged: boolean }[]
  return (loans.data as LoanRow[]).map((row) => ({
    id: row.id,
    borrower: row.borrower,
    contact: row.contact,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    status: row.status,
    note: row.note,
    issuedAt: row.issued_at,
    returnedAt: row.returned_at,
    items: itemRows
      .filter((item) => item.loan_id === row.id)
      .map((item) => ({ equipmentId: item.equipment_id, quantity: item.quantity, damaged: item.damaged })),
  }))
}

export async function createLoan(companyId: string, values: LoanFormValues): Promise<string> {
  const { data, error } = await getSupabase().rpc('create_loan', {
    _company_id: companyId,
    _loan: {
      borrower: values.borrower,
      contact: values.contact,
      starts_on: values.startsOn,
      ends_on: values.endsOn,
      note: values.note,
    },
    _items: values.items.map((item) => ({ equipment_id: item.equipmentId, quantity: item.quantity })),
  })
  if (error) throw error
  return data as string
}

export async function issueLoan(id: string) {
  const { error } = await getSupabase().rpc('issue_loan', { _loan_id: id })
  if (error) throw error
}

/** `damaged` sú id techniky, ktorá sa vrátila poškodená. */
export async function returnLoan(id: string, damaged: string[]) {
  const { error } = await getSupabase().rpc('return_loan', { _loan_id: id, _damaged: damaged })
  if (error) throw error
}

export async function deleteLoan(companyId: string, id: string) {
  const { data, error } = await getSupabase().from('loans').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}
