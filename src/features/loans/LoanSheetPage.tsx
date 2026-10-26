import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { useCases } from '@/features/cases/useCases'
import { brandingKeys, fetchBranding } from '@/features/companies/branding'
import { useCompany } from '@/features/companies/company-context'
import { useCompanyLogo } from '@/features/companies/useCompanyLogo'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { formatDate, formatMoney, todayIso } from '@/lib/format'
import { describeContent, describeDamage, formatUnits, groupByCase, linePerDay, loanPricing } from './model'
import { useLoans } from './useLoans'
import { signatureOf, useLoanSignatures } from './signatures'

// Listina sa tlačí z prehliadača (Tlačiť → Uložiť ako PDF), preto je vždy čierna na bielom
// a stojí mimo rozloženia aplikácie.
const PRINT_CSS = `
@page { size: A4; margin: 14mm; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; } }
@media print { html, body { background: #fff !important; } }
`

/** Riadok na podpis. `value` je údaj, ktorý appka už pozná (dátum, meno) a predtlačí ho nad čiaru. */
function Signature({ label, value, image }: { label: string; value?: string; image?: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="relative flex h-14 items-end border-b border-neutral-500 pb-1 font-medium break-words">
        {image && <img src={image} alt="" className="absolute right-0 bottom-0 h-14 max-w-[70%] object-contain mix-blend-multiply" />}
        <span className="relative">{value}</span>
      </div>
      <p className="mt-1 text-xs text-neutral-600">{label}</p>
    </div>
  )
}

/** Zapožičacia listina jednej výpožičky, pripravená na tlač alebo uloženie do PDF. */
export function LoanSheetPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const loans = useLoans(companyId)
  const cases = useCases(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const branding = useQuery({ queryKey: brandingKeys.branding(companyId), queryFn: () => fetchBranding(companyId) })
  const logo = useCompanyLogo(companyId)
  const signatures = useLoanSignatures(companyId, id)

  const loan = loans.data?.find((candidate) => candidate.id === id)
  // Názov karty sa ponúkne ako názov PDF súboru.
  const borrower = loan?.borrower
  useEffect(() => {
    if (!borrower) return
    const previous = document.title
    document.title = `Zapožičacia listina – ${borrower}`
    return () => {
      document.title = previous
    }
  }, [borrower])

  const back = (
    <Link to={`/loans/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      Výpožička
    </Link>
  )

  if (loans.isPending || equipment.isPending || cases.isPending || branding.isPending) return <LoadingBlock />
  if (loans.isError || equipment.isError) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <ErrorBlock message="Listinu sa nepodarilo pripraviť." onRetry={() => void loans.refetch()} />
      </div>
    )
  }
  if (!loan) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
        {back}
        <ErrorBlock message="Táto výpožička neexistuje alebo k nej nemáte prístup." />
      </div>
    )
  }

  const itemOf = (equipmentId: string) => equipment.data.find((item) => item.id === equipmentId)
  const nameOf = (equipmentId: string) => itemOf(equipmentId)?.name ?? 'Technika'
  const grouped = groupByCase(loan.items)
  const pricing = loanPricing(loan)
  // Čo sa pri vrátení označilo ako poškodené: „Hlava: poškodené #2“.
  const damages = loan.items.filter((item) => item.damaged).map((item) => `${nameOf(item.equipmentId)}: ${describeDamage(item)}`)
  const eur = (amount: number) => formatMoney(amount, 'EUR')
  const rows = [
    ...grouped.cases.map(({ caseId, content }) => {
      const box = cases.data?.find((item) => item.id === caseId)
      return {
        key: caseId,
        name: box?.name ?? 'Case',
        detail: [box?.inventoryNumber && `inv. č. ${box.inventoryNumber}`, describeContent(content, nameOf)].filter(Boolean).join(' · '),
        quantity: 'celý case',
        perDay: content.reduce((sum, item) => sum + linePerDay(item), 0),
      }
    }),
    ...grouped.single.map((item) => {
      const piece = itemOf(item.equipmentId)
      return {
        key: item.equipmentId,
        name: nameOf(item.equipmentId),
        detail: [
          item.unitNumbers.length > 0 && `kusy ${formatUnits(item.unitNumbers)}`,
          [piece?.manufacturer, piece?.model].filter(Boolean).join(' '),
          piece?.inventoryNumber && `inv. č. ${piece.inventoryNumber}`,
          piece?.serialNumber && `s. č. ${piece.serialNumber}`,
        ]
          .filter(Boolean)
          .join(' · '),
        quantity: `${item.quantity} ks`,
        perDay: linePerDay(item),
      }
    }),
  ]

  return (
    <div className="min-h-dvh bg-muted print:bg-white">
      <style>{PRINT_CSS}</style>
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-4 print:hidden">
        {back}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">V dialógu tlače zvoľte „Uložiť ako PDF“.</span>
          <Button onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            Tlačiť / PDF
          </Button>
        </div>
      </div>

      <article className="mx-auto mb-8 max-w-[210mm] bg-white p-[14mm] text-sm text-black shadow-sm [color-scheme:light] print:mb-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-4">
          <div className="min-w-0">
            {logo.url ? (
              // Listina je vždy biela: svetlé logo sa vytlačí čierne, aby na papieri nezaniklo.
              <img src={logo.url} alt={company.companyName} className={`max-h-20 max-w-56 object-contain ${logo.tone === 'light' ? 'brightness-0' : ''}`} />
            ) : (
              <p className="text-xl font-bold">{company.companyName}</p>
            )}
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold tracking-tight uppercase">Zapožičacia listina</h1>
            <p className="mt-1 text-neutral-600">
              č. {loan.id.slice(0, 8).toUpperCase()} · vystavené {formatDate(todayIso())}
            </p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-xs font-semibold tracking-wide text-neutral-600 uppercase">Požičiavateľ</h2>
            <p className="mt-1 font-semibold">{company.companyName}</p>
            {branding.data?.labelFooter && <p className="whitespace-pre-wrap text-neutral-700">{branding.data.labelFooter}</p>}
          </div>
          <div>
            <h2 className="text-xs font-semibold tracking-wide text-neutral-600 uppercase">Vypožičiavateľ</h2>
            <p className="mt-1 font-semibold break-words">{loan.borrower}</p>
            {loan.borrowerAddress && <p className="break-words text-neutral-700">{loan.borrowerAddress}</p>}
            {loan.borrowerIco && <p className="text-neutral-700">IČO: {loan.borrowerIco}</p>}
            {loan.contact && <p className="break-words text-neutral-700">{loan.contact}</p>}
          </div>
        </section>

        <p className="mt-5 rounded border border-neutral-300 px-3 py-2">
          Termín výpožičky:{' '}
          <strong>
            {formatDate(loan.startsOn)} – {formatDate(loan.endsOn)}
          </strong>
        </p>

        <table className="mt-5 w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-left text-xs tracking-wide uppercase">
              <th className="w-8 py-2 pr-2 font-semibold">#</th>
              <th className="py-2 pr-2 font-semibold">Položka</th>
              <th className="w-24 py-2 text-right font-semibold">Počet</th>
              {pricing.priced && <th className="w-28 py-2 text-right font-semibold">Cena / deň</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.key} className="break-inside-avoid border-b border-neutral-300 align-top">
                <td className="py-2 pr-2 text-neutral-600 tabular-nums">{index + 1}</td>
                <td className="py-2 pr-2">
                  <span className="block font-medium">{row.name}</span>
                  {row.detail && <span className="block text-xs text-neutral-500">{row.detail}</span>}
                </td>
                <td className="py-2 text-right font-medium whitespace-nowrap">{row.quantity}</td>
                {pricing.priced && <td className="py-2 text-right whitespace-nowrap tabular-nums">{row.perDay > 0 ? eur(row.perDay) : '—'}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {(pricing.priced || loan.deposit !== null) && (
          <dl className="mt-4 ml-auto flex w-72 max-w-full break-inside-avoid flex-col gap-1">
            {pricing.priced && loan.price === null && (
              <div className="flex justify-between gap-4 text-neutral-700">
                <dt>
                  {eur(pricing.perDay)} × {pricing.days} {pricing.days === 1 ? 'deň' : pricing.days < 5 ? 'dni' : 'dní'}
                </dt>
                <dd className="tabular-nums">{eur(pricing.calculated)}</dd>
              </div>
            )}
            {pricing.priced && (
              <div className="flex justify-between gap-4 border-t-2 border-black pt-1 text-base font-bold">
                <dt>Cena výpožičky</dt>
                <dd className="tabular-nums">{eur(pricing.total)}</dd>
              </div>
            )}
            {loan.deposit !== null && (
              <div className="flex justify-between gap-4">
                <dt>Kaucia</dt>
                <dd className="tabular-nums">{eur(loan.deposit)}</dd>
              </div>
            )}
          </dl>
        )}

        {loan.note && (
          <section className="mt-5 break-inside-avoid">
            <h2 className="text-xs font-semibold tracking-wide text-neutral-600 uppercase">Poznámka</h2>
            <p className="mt-1 whitespace-pre-wrap">{loan.note}</p>
          </section>
        )}

        <p className="mt-6 break-inside-avoid text-xs text-neutral-700">
          Vypožičiavateľ podpisom potvrdzuje, že uvedenú techniku prevzal kompletnú a funkčnú, a zaväzuje sa vrátiť ju v dohodnutom
          termíne v stave, v akom ju prevzal. Za stratu alebo poškodenie techniky počas výpožičky zodpovedá vypožičiavateľ.
        </p>

        <section className="mt-8 break-inside-avoid">
          <h2 className="text-xs font-semibold tracking-wide text-neutral-600 uppercase">Odovzdanie</h2>
          <div className="mt-2 flex gap-8">
            <Signature label="Dátum" value={loan.issuedAt ? formatDate(loan.issuedAt.slice(0, 10)) : undefined} />
            <Signature label="Odovzdal (požičiavateľ)" value={signatureOf(signatures.data, 'issue', 'lender')?.signerName ?? (loan.issuedAt ? loan.issuedByName : undefined)} image={signatureOf(signatures.data, 'issue', 'lender')?.image} />
            <Signature label="Prevzal (vypožičiavateľ)" value={signatureOf(signatures.data, 'issue', 'borrower')?.signerName ?? (loan.issuedAt ? loan.borrower : undefined)} image={signatureOf(signatures.data, 'issue', 'borrower')?.image} />
          </div>
        </section>

        <section className="mt-8 break-inside-avoid">
          <h2 className="text-xs font-semibold tracking-wide text-neutral-600 uppercase">Vrátenie</h2>
          <div className="mt-2 flex gap-8">
            <Signature label="Dátum" value={loan.returnedAt ? formatDate(loan.returnedAt.slice(0, 10)) : undefined} />
            <Signature label="Vrátil (vypožičiavateľ)" value={signatureOf(signatures.data, 'return', 'borrower')?.signerName ?? (loan.returnedAt ? loan.borrower : undefined)} image={signatureOf(signatures.data, 'return', 'borrower')?.image} />
            <Signature label="Prevzal späť (požičiavateľ)" value={signatureOf(signatures.data, 'return', 'lender')?.signerName ?? (loan.returnedAt ? loan.returnedByName : undefined)} image={signatureOf(signatures.data, 'return', 'lender')?.image} />
          </div>
          {loan.returnedAt ? (
            <div className="mt-4 border-b border-neutral-500 pb-1">
              {damages.length === 0 ? (
                <p className="font-medium">Bez poškodení, vrátené kompletné.</p>
              ) : (
                <ul className="list-disc pl-5 font-medium">
                  {damages.map((damage) => (
                    <li key={damage}>{damage}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="mt-4 h-12 border-b border-neutral-500" />
          )}
          <p className="mt-1 text-xs text-neutral-600">Zistené poškodenia alebo chýbajúce kusy</p>
        </section>
      </article>
    </div>
  )
}
