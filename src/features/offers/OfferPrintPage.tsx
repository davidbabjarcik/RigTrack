import { useRef } from 'react'
import { PaperSheet } from '@/components/print/PaperSheet'
import { PrintButton } from '@/components/print/PrintButton'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { useCompany } from '@/features/companies/company-context'
import { useCompanyLogo } from '@/features/companies/useCompanyLogo'
import { useOffer } from './api'
import { OfferDocument } from './OfferDocument'

const PRINT_CSS = `
@page { size: A4; margin: 14mm; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; } }
@media print { html, body { background: #fff !important; } }
`

/** Cenová ponuka na tlač / PDF (bez menu aplikácie). */
export function OfferPrintPage() {
  const sheet = useRef<HTMLDivElement>(null)
  const { id = '' } = useParams()
  const company = useCompany().active!
  const offer = useOffer(company.companyId, id)
  const logo = useCompanyLogo(company.companyId)
  if (offer.isPending) return <LoadingBlock />
  if (offer.isError || !offer.data) return <ErrorBlock message="Ponuka sa nenašla alebo k nej nemáte prístup." />
  return (
    <div className="min-h-dvh bg-muted p-2 text-black sm:p-6 print:bg-white print:p-0">
      <style>{PRINT_CSS}</style>
      <div className="mx-auto mb-6 flex max-w-[190mm] items-center justify-between gap-3 print:hidden">
        <Link to={`/offers/${id}`} className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black">
          <ArrowLeft className="size-4" aria-hidden />
          Späť na úpravu
        </Link>
        <PrintButton sheet={sheet} fileName="cenova-ponuka" marginMm={14} label="Tlačiť / uložiť ako PDF" />
      </div>
      <PaperSheet sheetRef={sheet} marginMm={14}>
      <OfferDocument offer={offer.data} logoUrl={logo.url || undefined} />
      </PaperSheet>
    </div>
  )
}
