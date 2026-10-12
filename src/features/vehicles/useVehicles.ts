import { useQuery } from '@tanstack/react-query'
import { fetchVehicles, vehicleKeys } from './api'

export function useVehicles(companyId: string) {
  return useQuery({ queryKey: vehicleKeys.list(companyId), queryFn: () => fetchVehicles(companyId) })
}
