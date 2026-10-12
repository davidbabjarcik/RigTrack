import { useQuery } from '@tanstack/react-query'
import { eventKeys, fetchEvents } from './api'

export function useEvents(companyId: string) {
  return useQuery({ queryKey: eventKeys.list(companyId), queryFn: () => fetchEvents(companyId) })
}
