import { createContext, useContext } from 'react'
import type { Role } from '@/lib/roles'

export type Membership = {
  companyId: string
  companyName: string
  role: Role
  /** Čo člen vo firme smie (po zmenách admina); admin smie vždy všetko. */
  permissions: ReadonlySet<string>
}

export type CompanyState = {
  memberships: Membership[]
  active: Membership | null
  loading: boolean
  error: boolean
  setActive: (companyId: string) => void
  refetch: () => void
}

export const CompanyContext = createContext<CompanyState>({
  memberships: [],
  active: null,
  loading: false,
  error: false,
  setActive: () => {},
  refetch: () => {},
})

export function useCompany() {
  return useContext(CompanyContext)
}
