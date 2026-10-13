import { getSupabase } from '@/lib/supabase/client'
import type { Loan, LoanDamage, LoanFormValues, LoanStatus } from './model'

export const loanKeys = {
  list: (companyId: string) => ['company', companyId, 'loans'] as const,
}

type LoanRow = {
  id: string
  borrower: string
  contact: string
  borrower_ico: string
  borrower_address: string
  billed_days: number | null
  price: number | string | null
  deposit: number | string | null
  starts_on: string
  ends_on: string
  status: LoanStatus
  note: string
  issued_at: string | null
  returned_at: string | null
  issued_by_name: string
  returned_by_name: string
}

const toNumber = (value: number | string | null) => (value === null ? null : Number(value))

/** Všetky výpožičky firmy aj s položkami. Dva dotazy, aby nezáviselo od vnárania cez zložené kľúče. */
export async function fetchLoans(companyId: string): Promise<Loan[]> {
  const db = getSupabase()
  const [loans, items] = await Promise.all([
    db
      .from('loans')
      .select('id, borrower, contact, borrower_ico, borrower_address, billed_days, price, deposit, starts_on, ends_on, status, note, issued_at, returned_at, issued_by_name, returned_by_name')
      .eq('company_id', companyId)
      .order('starts_on', { ascending: false }),
    db.from('loan_items').select('loan_id, equipment_id, quantity, damaged, case_id, unit_numbers, damaged_units, damaged_quantity, unit_price').eq('company_id', companyId),
  ])
  const error = loans.error ?? items.error
  if (error) throw error

  const itemRows = items.data as {
    loan_id: string
    equipment_id: string
    quantity: number
    damaged: boolean
    case_id: string | null
    unit_numbers: number[]
    damaged_units: number[]
    damaged_quantity: number
    unit_price: number | string | null
  }[]
  return (loans.data as LoanRow[]).map((row) => ({
    id: row.id,
    borrower: row.borrower,
    contact: row.contact,
    borrowerIco: row.borrower_ico,
    borrowerAddress: row.borrower_address,
    billedDays: row.billed_days,
    price: toNumber(row.price),
    deposit: toNumber(row.deposit),
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    status: row.status,
    note: row.note,
    issuedAt: row.issued_at,
    returnedAt: row.returned_at,
    issuedByName: row.issued_by_name,
    returnedByName: row.returned_by_name,
    items: itemRows
      .filter((item) => item.loan_id === row.id)
      .map((item) => ({
        equipmentId: item.equipment_id,
        quantity: item.quantity,
        damaged: item.damaged,
        caseId: item.case_id,
        unitNumbers: item.unit_numbers,
        damagedUnits: item.damaged_units,
        damagedQuantity: item.damaged_quantity,
        unitPrice: toNumber(item.unit_price),
      })),
  }))
}

function loanPayload(values: LoanFormValues) {
  return {
    _loan: {
      borrower: values.borrower,
      contact: values.contact,
      borrower_ico: values.borrowerIco,
      borrower_address: values.borrowerAddress,
      billed_days: values.billedDays ?? null,
      price: values.price ?? null,
      deposit: values.deposit ?? null,
      starts_on: values.startsOn,
      ends_on: values.endsOn,
      note: values.note,
    },
    _items: values.items.map((item) => ({
      equipment_id: item.equipmentId,
      quantity: item.quantity,
      case_id: item.caseId,
      unit_numbers: item.unitNumbers,
      unit_price: item.unitPrice ?? null,
    })),
  }
}

export async function createLoan(companyId: string, values: LoanFormValues): Promise<string> {
  const { data, error } = await getSupabase().rpc('create_priced_loan', { _company_id: companyId, ...loanPayload(values) })
  if (error) throw error
  return data as string
}

/** Prepíše rezerváciu; databáza odmietne výpožičku, ktorá už bola vydaná. */
export async function updateLoan(id: string, values: LoanFormValues) {
  const { error } = await getSupabase().rpc('update_loan', { _loan_id: id, ...loanPayload(values) })
  if (error) throw error
}

export async function issueLoan(id: string) {
  const { error } = await getSupabase().rpc('issue_loan', { _loan_id: id })
  if (error) throw error
}

/** `damaged` vymenúva, čo sa vrátilo poškodené: čísla kusov alebo počet. */
export async function returnLoan(id: string, damaged: LoanDamage[]) {
  const { error } = await getSupabase().rpc('return_loan', {
    _loan_id: id,
    _damaged: damaged.map((entry) => ({ equipment_id: entry.equipmentId, units: entry.units, quantity: entry.quantity })),
  })
  if (error) throw error
}

export async function deleteLoan(companyId: string, id: string) {
  const { data, error } = await getSupabase().from('loans').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}
