import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { formatDate } from '@/lib/format'
import { ROLE_LABELS } from '@/lib/roles'
import { getSupabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type DevUser = {
  user_id: string
  email: string
  full_name: string
  created_at: string | null
  last_sign_in_at: string | null
  confirmed: boolean
  companies: { name: string; role: string; demo: boolean }[]
}

async function fetchDevUsers(): Promise<DevUser[]> {
  const { data, error } = await getSupabase().rpc('developer_users')
  if (error) throw error
  return data as DevUser[]
}

/** „Pred 3 dňami“ / „dnes“ – kedy bol človek naposledy v appke. */
function ago(iso: string | null) {
  if (!iso) return 'ešte nebol prihlásený'
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)
  if (days <= 0) return 'dnes'
  if (days === 1) return 'včera'
  return `pred ${days} dňami`
}

/** Vývojár: všetky účty – kedy vznikli, kedy boli naposledy v appke a v ktorých firmách sú s akou rolou. */
export function DeveloperUsers() {
  const users = useQuery({ queryKey: ['developer-users'], queryFn: fetchDevUsers, retry: false })
  const [search, setSearch] = useState('')
  if (users.isPending) return <p className="text-sm text-muted-foreground">Načítavam…</p>
  if (users.isError) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Zoznam účtov zatiaľ nie je dostupný – treba spustiť migráciu 0117 (supabase/update-all.sql).</p>
  const words = search.trim().toLowerCase()
  const shown = users.data.filter((user) => !words || [user.email, user.full_name, ...user.companies.map((c) => c.name)].join(' ').toLowerCase().includes(words))
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm text-muted-foreground">{users.data.length} účtov · zoradené podľa posledného prihlásenia</p>
        <input
          aria-label="Hľadať účet"
          placeholder="Hľadať e-mail, meno, firmu…"
          className="h-9 w-64 rounded-lg border bg-background px-3 text-sm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <ul className="divide-y overflow-hidden rounded-xl border bg-surface text-sm">
        {shown.map((user) => (
          <li key={user.user_id} className="flex flex-wrap items-start gap-x-4 gap-y-1 p-3">
            <span className="min-w-0 flex-1 basis-56">
              <span className="block truncate font-medium">{user.full_name || user.email}</span>
              {user.full_name && <span className="block truncate text-muted-foreground">{user.email}</span>}
              <span className="block text-xs text-muted-foreground">
                účet od {user.created_at ? formatDate(user.created_at.slice(0, 10)) : '—'}
                {!user.confirmed && ' · e-mail nepotvrdený'}
              </span>
            </span>
            <span className="w-40 shrink-0">
              <span className={cn('block font-medium', !user.last_sign_in_at && 'text-muted-foreground')}>{ago(user.last_sign_in_at)}</span>
              {user.last_sign_in_at && <span className="block text-xs text-muted-foreground">{formatDate(user.last_sign_in_at.slice(0, 10))}</span>}
            </span>
            <span className="flex min-w-0 basis-full flex-wrap gap-1 sm:basis-auto sm:flex-1">
              {user.companies.length === 0 ? (
                <span className="text-muted-foreground">bez firmy</span>
              ) : (
                user.companies.map((company) => (
                  <span key={company.name} className={cn('rounded-full border px-2 py-0.5 text-xs', company.demo && 'border-dashed text-muted-foreground')}>
                    {company.demo ? 'Demo' : company.name} · {ROLE_LABELS[company.role as keyof typeof ROLE_LABELS] ?? company.role}
                  </span>
                ))
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
