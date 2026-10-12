import { useQuery } from '@tanstack/react-query'
import { fetchServiceRecords, serviceKeys } from './api'

export function useServiceRecords(companyId: string) {
  return useQuery({ queryKey: serviceKeys.list(companyId), queryFn: () => fetchServiceRecords(companyId) })
}
