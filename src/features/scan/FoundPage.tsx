import { useQuery } from '@tanstack/react-query'
import { Mail, Phone, Globe, LogIn } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { getSupabase } from '@/lib/supabase/client'

type Info = { enabled: boolean; name?: string; company?: string; phone?: string; email?: string; web?: string } | null

/**
 * Čo uvidí človek bez účtu po naskenovaní QR štítku fotoaparátom: čo to je a komu to patrí (ak to firma povolila),
 * a tlačidlo na prihlásenie pre ľudí z firmy.
 */
export function FoundPage({ kind, id, unit }: { kind: 'equipment' | 'case'; id: string; unit: number | null }) {
  const location = useLocation()
  const info = useQuery({
    queryKey: ['public-scan', kind, id],
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('public_scan_info', { _kind: kind, _id: id })
      if (error) throw error
      return data as Info
    },
    retry: false,
  })
  const data = info.data
  const web = data?.web && (/^https?:\/\//.test(data.web) ? data.web : `https://${data.web}`)

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-sm rounded-2xl border bg-surface p-6 text-center shadow-sm">
        <img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt="" className="mx-auto mb-4 size-12 rounded-xl" />
        {info.isPending ? (
          <p className="text-muted-foreground">Načítavam…</p>
        ) : data?.enabled ? (
          <>
            <p className="text-sm text-muted-foreground">Našli ste</p>
            <h1 className="mt-1 text-2xl font-semibold break-words">
              {data.name}
              {unit !== null && kind === 'equipment' && ` #${unit}`}
            </h1>
            <p className="mt-2">
              Patrí firme <strong>{data.company}</strong>. Ak to nie je na svojom mieste, ozvite sa, prosím:
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {data.phone && (
                <a href={`tel:${data.phone.replace(/\s+/g, '')}`} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground">
                  <Phone className="size-4" aria-hidden />
                  {data.phone}
                </a>
              )}
              {data.email && (
                <a href={`mailto:${data.email}`} className="flex items-center justify-center gap-2 rounded-lg border px-4 py-3 font-medium hover:bg-muted">
                  <Mail className="size-4" aria-hidden />
                  {data.email}
                </a>
              )}
              {web && (
                <a href={web} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-lg border px-4 py-3 font-medium hover:bg-muted">
                  <Globe className="size-4" aria-hidden />
                  {data.web}
                </a>
              )}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Technika evidovaná v RigTracku</h1>
            <p className="mt-2 text-muted-foreground">Podrobnosti vidia len ľudia z firmy, ktorej patrí. Prihláste sa, ak ste z nej.</p>
          </>
        )}
        <Link
          to="/auth"
          state={{ from: location.pathname + location.search }}
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          <LogIn className="size-4" aria-hidden />
          Som z firmy – prihlásiť sa
        </Link>
      </div>
    </div>
  )
}
