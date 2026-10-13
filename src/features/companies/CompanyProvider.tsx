import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/auth-context'
import { fetchMyPermissions, permissionKeys } from '@/features/permissions/api'
import { companyKeys, fetchMemberships } from './api'
import { CompanyContext } from './company-context'

const STORAGE_KEY = 'rigtrack:active-company'

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [storedId, setStoredId] = useState(readStored)

  const query = useQuery({
    queryKey: companyKeys.memberships(userId ?? ''),
    queryFn: () => fetchMemberships(userId!),
    enabled: Boolean(userId),
  })

  const memberships = query.data ?? []
  // Uložená firma platí iba vtedy, ak v nej používateľ stále je členom.
  const chosen = memberships.find((m) => m.companyId === storedId) ?? (memberships.length === 1 ? memberships[0] : null)
  // Oprávnenia môže admin zmeniť celej role aj jednému členovi, preto sa pýtame databázy.
  // Kým odpovie (alebo ak zlyhá), platia predvolené oprávnenia roly; dáta aj tak stráži RLS.
  const permissions = useQuery({
    queryKey: permissionKeys.mine(chosen?.companyId ?? ''),
    queryFn: () => fetchMyPermissions(chosen!.companyId),
    enabled: Boolean(chosen) && chosen?.role !== 'admin',
  })
  const active = useMemo(
    () => (chosen && permissions.data ? { ...chosen, permissions: new Set(permissions.data) } : chosen),
    [chosen, permissions.data],
  )

  function setActive(companyId: string) {
    try {
      localStorage.setItem(STORAGE_KEY, companyId)
    } catch {
      // bez úložiska platí výber len do zatvorenia karty
    }
    setStoredId(companyId)
  }

  return (
    <CompanyContext
      value={{
        memberships,
        active,
        loading: Boolean(userId) && query.isPending,
        error: query.isError,
        setActive,
        refetch: () => void query.refetch(),
      }}
    >
      {children}
    </CompanyContext>
  )
}
