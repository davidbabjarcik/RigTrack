import { useQuery } from '@tanstack/react-query'
import { useMembers } from '@/features/companies/useMembers'
import { fetchStaff, fetchUnavailability, staffKeys } from './api'
import { mergeStaff } from './model'

/** Ľudia z tímu (členovia aj brigádnici) a ich „kedy nemôžu“. */
export function useStaff(companyId: string) {
  const members = useMembers(companyId)
  const staff = useQuery({ queryKey: staffKeys.list(companyId), queryFn: () => fetchStaff(companyId) })
  const unavailability = useQuery({ queryKey: staffKeys.unavailability(companyId), queryFn: () => fetchUnavailability(companyId) })
  return {
    people: mergeStaff(members.data ?? [], staff.data ?? []),
    unavailability: unavailability.data ?? [],
    isPending: members.isPending || staff.isPending || unavailability.isPending,
    isError: members.isError || staff.isError || unavailability.isError,
    refetch: () => Promise.all([members.refetch(), staff.refetch(), unavailability.refetch()]),
  }
}
