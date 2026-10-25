import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { useCompanyLogo } from '@/features/companies/useCompanyLogo'
import { useOffer } from './api'
import { OfferDocument } from './OfferDocument'

const PRINT_CSS = `
@page { size: A4; margin: 14mm; }
@media print { html, body { background: #fff !important; } }
`

/** Cenová ponuka na tlač / PDF (bez menu aplikácie). */
export function OfferPrintPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const offer = useOffer(company.companyId, id)
  const logo = useCompanyLogo(company.companyId)
  if (offer.isPending) return <LoadingBlock />
  if (offer.isError || !offer.data) return <ErrorBlock message="Ponuka sa nenašla alebo k nej nemáte prístup." />
  return (
    <div className="min-h-dvh bg-white p-6 text-black">
      <style>{PRINT_CSS}</style>
      <div className="mx-auto mb-6 flex max-w-[190mm] items-center justify-between gap-3 print:hidden">
        <Link to={`/offers/${id}`} className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black">
          <ArrowLeft className="size-4" aria-hidden />
          Späť na úpravu
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden />
          Tlačiť / uložiť ako PDF
        </Button>
      </div>
      <OfferDocument offer={offer.data} logoUrl={logo.url || undefined} />
    </div>
  )
}
