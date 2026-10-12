import { useQuery } from '@tanstack/react-query'
import { companyKeys, fetchMembers, type Member } from './api'

/** Členovia firmy, napr. na výber zodpovednej osoby. */
export function useMembers(companyId: string) {
  return useQuery({ queryKey: companyKeys.members(companyId), queryFn: () => fetchMembers(companyId) })
}

export function memberName(members: Member[] | undefined, userId: string | null) {
  if (!userId) return ''
  const member = members?.find((candidate) => candidate.userId === userId)
  return member ? member.fullName || member.email : ''
}
