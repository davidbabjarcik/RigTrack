import { useQuery } from '@tanstack/react-query'
import { fetchTasks, taskKeys } from './api'

export function useTasks(companyId: string) {
  return useQuery({ queryKey: taskKeys.list(companyId), queryFn: () => fetchTasks(companyId) })
}
