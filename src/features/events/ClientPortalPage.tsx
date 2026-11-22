import { useQuery } from '@tanstack/react-query'
import { ChevronRight, FileSignature, FileText, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchLogoForDisplay, type LogoStyle } from '@/features/companies/branding'
import { logoClasses } from '@/features/companies/logoStyle'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { fetchClientPortal } from './clientApi'

const LOGO_STYLES: LogoStyle[] = ['auto', 'original', 'plate', 'white', 'black']
const OFFER_STATUS: Record<string, string> = { draft: 'Návrh', sent: 'Čaká na potvrdenie', accepted: 'Potvrdená', rejected: 'Odmietnutá' }

function Row({ to, icon, title, hint }: { to: string; icon: ReactNode; title: string; hint: string }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium break-words">{title}</span>
          <span className="block text-sm text-muted-foreground">{hint}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  )
}

/**
 * Jeden odkaz pre klienta k akcii (bez prihlásenia): logo firmy, názov a termín akcie a všetko, čo mu firma zdieľala –
 * cenové ponuky, zmluvy a po akcii hodnotenie. Stránky pre klienta sú len po slovensky (ako ponuky a zmluvy).
 */
export function ClientPortalPage() {
  const { token = '' } = useParams()
  const portal = useQuery({ queryKey: ['event-client', token], queryFn: () => fetchClientPortal(token), retry: false })
  const logoPath = portal.data?.logoPath ?? ''
  const logo = useQuery({ queryKey: ['event-client-logo', logoPath], queryFn: () => fetchLogoForDisplay(logoPath), enabled: Boolean(logoPath), retry: false, staleTime: Infinity })

  if (portal.isPending) return <p className="min-h-dvh bg-background p-8 text-center text-sm text-muted-foreground">Načítavam…</p>
  if (portal.isError || !portal.data) {
    return <p className="min-h-dvh bg-background p-8 text-center text-sm text-muted-foreground">Odkaz sa nenašiel alebo už neplatí. Kontaktujte toho, kto vám ho poslal.</p>
  }
  const data = portal.data
  const when = data.startsOn === data.endsOn ? formatDate(data.startsOn) : `${formatDate(data.startsOn)} – ${formatDate(data.endsOn)}`
  const style = LOGO_STYLES.includes(data.logoStyle as LogoStyle) ? (data.logoStyle as LogoStyle) : 'auto'
  const nothing = data.offers.length === 0 && data.contracts.length === 0 && !data.rating

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-10 sm:py-16">
        <header>
          {logo.data?.url ? (
            <img src={logo.data.url} alt={data.companyName} className={cn('mb-3 h-14 max-w-56 object-contain object-left', logoClasses(style, logo.data.tone))} />
          ) : (
            <p className="text-sm text-muted-foreground">{data.companyName}</p>
          )}
          <h1 className="mt-1 text-2xl font-semibold break-words">{data.event}</h1>
          <p className="mt-1 text-muted-foreground">{[when, data.venue].filter(Boolean).join(' · ')}</p>
        </header>

        {nothing ? (
          <p className="rounded-xl border border-dashed bg-surface p-6 text-center text-sm text-muted-foreground">Zatiaľ tu nič nie je. Keď vám pošleme ponuku alebo zmluvu, nájdete ju tu.</p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-surface shadow-sm">
            {data.offers.map((offer) => (
              <Row
                key={offer.token}
                to={`/o/${offer.token}`}
                icon={<FileText className="size-5" aria-hidden />}
                title={`Cenová ponuka${offer.number ? ` č. ${offer.number}` : ''}${offer.title ? ` – ${offer.title}` : ''}`}
                hint={OFFER_STATUS[offer.status] ?? 'Cenová ponuka'}
              />
            ))}
            {data.contracts.map((contract) => (
              <Row
                key={contract.token}
                to={`/z/${contract.token}`}
                icon={<FileSignature className="size-5" aria-hidden />}
                title={`Zmluva${contract.number ? ` č. ${contract.number}` : ''}`}
                hint={contract.signed ? 'Podpísaná' : 'Na podpis'}
              />
            ))}
            {data.rating && (
              <Row
                to={`/h/${data.rating.token}`}
                icon={<Star className="size-5" aria-hidden />}
                title="Ako sme sa vám páčili?"
                hint={data.rating.rated ? 'Ďakujeme za hodnotenie' : 'Ohodnoťte nás – zaberie to minútu'}
              />
            )}
          </ul>
        )}
      </main>
    </div>
  )
}
