import { DatabaseZap } from 'lucide-react'
import type { ReactNode } from 'react'
import { isSupabaseConfigured } from '@/lib/supabase/client'

/** Obrazovky, ktoré bez databázy nemajú čo zobraziť. */
export function BackendRequired({ children }: { children: ReactNode }) {
  if (isSupabaseConfigured) return children
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
      <DatabaseZap className="size-8 text-muted-foreground" aria-hidden />
      <p className="font-medium">Databáza nie je pripojená</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Táto obrazovka potrebuje Supabase. Doplňte údaje do <code>.env.local</code> a reštartujte aplikáciu.
      </p>
    </div>
  )
}
