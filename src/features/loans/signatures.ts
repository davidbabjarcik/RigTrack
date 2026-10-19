import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

export type SignaturePhase = 'issue' | 'return'
export type SignatureRole = 'borrower' | 'lender'
export type LoanSignature = { id: string; phase: SignaturePhase; role: SignatureRole; signerName: string; image: string; signedAt: string }

export const SIGNATURE_LABELS: Record<SignaturePhase, Record<SignatureRole, string>> = {
  issue: { borrower: 'Prevzal (vypožičiavateľ)', lender: 'Odovzdal (požičiavateľ)' },
  return: { borrower: 'Vrátil (vypožičiavateľ)', lender: 'Prevzal späť (požičiavateľ)' },
}

export const signatureKeys = { ofLoan: (companyId: string, loanId: string) => ['company', companyId, 'loans', loanId, 'signatures'] as const }

export async function fetchSignatures(companyId: string, loanId: string): Promise<LoanSignature[]> {
  const { data, error } = await getSupabase()
    .from('loan_signatures')
    .select('id, phase, role, signer_name, image, signed_at')
    .eq('company_id', companyId)
    .eq('loan_id', loanId)
  if (error) throw error
  return (data as { id: string; phase: SignaturePhase; role: SignatureRole; signer_name: string; image: string; signed_at: string }[]).map((row) => ({
    id: row.id,
    phase: row.phase,
    role: row.role,
    signerName: row.signer_name,
    image: row.image,
    signedAt: row.signed_at,
  }))
}

export function useLoanSignatures(companyId: string, loanId: string) {
  return useQuery({ queryKey: signatureKeys.ofLoan(companyId, loanId), queryFn: () => fetchSignatures(companyId, loanId), retry: false })
}

export async function saveSignature(companyId: string, loanId: string, phase: SignaturePhase, role: SignatureRole, signerName: string, image: string) {
  const { error } = await getSupabase()
    .from('loan_signatures')
    .insert({ company_id: companyId, loan_id: loanId, phase, role, signer_name: signerName.trim(), image })
  if (error) throw error
}

export async function deleteSignature(id: string) {
  const { error } = await getSupabase().from('loan_signatures').delete().eq('id', id)
  if (error) throw error
}

export const signatureOf = (signatures: LoanSignature[] | undefined, phase: SignaturePhase, role: SignatureRole) =>
  signatures?.find((signature) => signature.phase === phase && signature.role === role)
