import { useQuery } from '@tanstack/react-query'
import { caseKeys, fetchCases } from './api'

export function useCases(companyId: string) {
  return useQuery({ queryKey: caseKeys.list(companyId), queryFn: () => fetchCases(companyId) })
}
