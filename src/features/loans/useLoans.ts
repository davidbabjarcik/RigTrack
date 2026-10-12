import { useQuery } from '@tanstack/react-query'
import { fetchLoans, loanKeys } from './api'

export function useLoans(companyId: string) {
  return useQuery({ queryKey: loanKeys.list(companyId), queryFn: () => fetchLoans(companyId) })
}
