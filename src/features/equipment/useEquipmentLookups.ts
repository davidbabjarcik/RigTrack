import { useQuery } from '@tanstack/react-query'
import { equipmentKeys, fetchLookup } from './api'

export function useEquipmentLookups(companyId: string) {
  const categories = useQuery({
    queryKey: equipmentKeys.lookup(companyId, 'equipment_categories'),
    queryFn: () => fetchLookup(companyId, 'equipment_categories'),
  })
  const locations = useQuery({
    queryKey: equipmentKeys.lookup(companyId, 'locations'),
    queryFn: () => fetchLookup(companyId, 'locations'),
  })
  return {
    categories: categories.data ?? [],
    locations: locations.data ?? [],
    isPending: categories.isPending || locations.isPending,
    isError: categories.isError || locations.isError,
    error: categories.error ?? locations.error,
    refetch: () => Promise.all([categories.refetch(), locations.refetch()]),
  }
}
