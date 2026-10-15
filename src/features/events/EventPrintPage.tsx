import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { useCompanyLogo } from '@/features/companies/useCompanyLogo'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { PHOTO_URL_STALE_MS } from '@/features/equipment/photo'
import { describeContent, groupByCase } from '@/features/loans/model'
import { formatDate, todayIso } from '@/lib/format'
import { eventKeys, eventPhotoUrls, fetchEventDocuments } from './api'
import { describeTimes, EVENT_STATUS_LABELS } from './model'
import { useEvents } from './useEvents'

// Tlačí sa z prehliadača (Tlačiť → Uložiť ako PDF), preto vždy čierna na bielom a mimo rozloženia aplikácie.
const PRINT_CSS = `
@page { size: A4; margin: 14mm; }
@media print { html, body { background: #fff !important; } }
`

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="text-xs font-semibold tracking-wide text-neutral-600 uppercase">{children}</h2>
}

/** Prázdny štvorček na odškrtnutie perom. */
function CheckBox() {
  return <span className="inline-block size-4 border border-neutral-500 align-middle" aria-hidden />
}

/** Prehľad eventu na A4: termín, časy, miesto, organizátor, popis, posádka, technika, fotky a dokumenty. */
export function EventPrintPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const events = useEvents(companyId)
  const cases = useCases(companyId)
  const members = useMembers(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const documents = useQuery({ queryKey: eventKeys.documents(companyId, id), queryFn: () => fetchEventDocuments(companyId, id) })
  const photoPaths = (documents.data ?? []).filter((document) => document.isPhoto).map((document) => document.path)
  const photoUrls = useQuery({
    queryKey: [...eventKeys.documents(companyId, id), 'photo-urls', photoPaths],
    queryFn: () => eventPhotoUrls(photoPaths),
    enabled: photoPaths.length > 0,
    staleTime: PHOTO_URL_STALE_MS,
  })
  const logo = useCompanyLogo(companyId)

  const event = events.data?.find((candidate) => candidate.id === id)
  // Názov karty sa ponúkne ako názov PDF súboru.
  const title = event?.name
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = `Event – ${title}`
    return () => {
      document.title = previous
    }
  }, [title])

  const back = (
    <Link to={`/events/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      Event
    </Link>
  )

  if (events.isPending || equipment.isPending || cases.isPending || documents.isPending) return <LoadingBlock />
  if (events.isError || equipment.isError) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <ErrorBlock message="Prehľad eventu sa nepodarilo pripraviť." onRetry={() => void events.refetch()} />
      </div>
    )
  }
  if (!event) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
        {back}
        <ErrorBlock message="Tento event neexistuje alebo k nemu nemáte prístup." />
      </div>
    )
  }

  const itemOf = (equipmentId: string) => equipment.data.find((item) => item.id === equipmentId)
  const nameOf = (equipmentId: string) => itemOf(equipmentId)?.name ?? 'Technika'
  const grouped = groupByCase(event.equipment)
  const rows = [
    ...grouped.cases.map(({ caseId, content }) => {
      const box = cases.data?.find((item) => item.id === caseId)
      return {
        key: caseId,
        name: box?.name ?? 'Case',
        // Case sa odškrtáva celý; jeho obsah je len pre informáciu malým sivým.
        detail: [box?.inventoryNumber && `inv. č. ${box.inventoryNumber}`, describeContent(content, nameOf)].filter(Boolean).join(' · '),
        quantity: 'celý case',
      }
    }),
    ...grouped.single.map((item) => {
      const piece = itemOf(item.equipmentId)
      return {
        key: item.equipmentId,
        name: nameOf(item.equipmentId),
        detail: [[piece?.manufacturer, piece?.model].filter(Boolean).join(' '), piece?.inventoryNumber && `inv. č. ${piece.inventoryNumber}`]
          .filter(Boolean)
          .join(' · '),
        quantity: `${item.quantity} ks`,
      }
    }),
  ]
  const when = event.startsOn === event.endsOn ? formatDate(event.startsOn) : `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`
  const times = describeTimes(event)
  const files = (documents.data ?? []).filter((document) => !document.isPhoto)
  const photos = (documents.data ?? []).filter((document) => document.isPhoto)
  const hasOrganizer = [event.organizer, event.organizerPerson, event.organizerPhone, event.organizerEmail].some(Boolean)

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
              // Papier je vždy biely: svetlé logo sa vytlačí čierne, aby nezaniklo.
              <img src={logo.url} alt={company.companyName} className={`max-h-20 max-w-56 object-contain ${logo.tone === 'light' ? 'brightness-0' : ''}`} />
            ) : (
              <p className="text-xl font-bold">{company.companyName}</p>
            )}
          </div>
          <div className="min-w-0 text-right">
            <h1 className="text-2xl font-bold tracking-tight break-words">{event.name}</h1>
            <p className="mt-1 text-neutral-600">
              {EVENT_STATUS_LABELS[event.status]} · vytlačené {formatDate(todayIso())}
            </p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-3">
            <div>
              <Heading>Termín</Heading>
              <p className="mt-1 font-semibold">{when}</p>
              {times && <p className="text-neutral-700">{times}</p>}
            </div>
            {event.venue && (
              <div>
                <Heading>Miesto</Heading>
                <p className="mt-1 font-semibold break-words">{event.venue}</p>
              </div>
            )}
            {event.client && (
              <div>
                <Heading>Klient</Heading>
                <p className="mt-1 break-words">{event.client}</p>
              </div>
            )}
          </div>
          {hasOrganizer && (
            <div>
              <Heading>Organizátor</Heading>
              {event.organizer && <p className="mt-1 font-semibold break-words">{event.organizer}</p>}
              {event.organizerPerson && <p className="break-words">{event.organizerPerson}</p>}
              {event.organizerPhone && <p>{event.organizerPhone}</p>}
              {event.organizerEmail && <p className="break-all">{event.organizerEmail}</p>}
            </div>
          )}
        </section>

        {event.description && (
          <section className="mt-5">
            <Heading>Popis</Heading>
            <p className="mt-1 whitespace-pre-wrap">{event.description}</p>
          </section>
        )}

        {event.crew.length > 0 && (
          <section className="mt-5 break-inside-avoid">
            <Heading>Posádka ({event.crew.length})</Heading>
            <ul className="mt-1 grid grid-cols-2 gap-x-6">
              {event.crew.map((person) => (
                <li key={person.id} className="flex justify-between gap-3 border-b border-neutral-300 py-1">
                  <span className="font-medium">{person.memberId ? memberName(members.data, person.memberId) || 'Bývalý člen' : person.name}</span>
                  {person.role && <span className="text-neutral-600">{person.role}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {rows.length > 0 && (
          <section className="mt-5">
            <Heading>Technika – checklist</Heading>
            <table className="mt-1 w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-black text-left text-xs tracking-wide uppercase">
                  <th className="w-8 py-2 pr-2 font-semibold">#</th>
                  <th className="py-2 pr-2 font-semibold">Položka</th>
                  <th className="w-24 py-2 text-right font-semibold">Počet</th>
                  <th className="w-10 py-2 text-center font-semibold">✓</th>
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
                      <td className="py-2 text-center">
                        <CheckBox />
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {files.length > 0 && (
          <section className="mt-5 break-inside-avoid">
            <Heading>Dokumenty v RigTracku</Heading>
            <p className="mt-1">{files.map((file) => file.name).join(' · ')}</p>
          </section>
        )}

        {event.note && (
          <section className="mt-5 break-inside-avoid">
            <Heading>Poznámka</Heading>
            <p className="mt-1 whitespace-pre-wrap">{event.note}</p>
          </section>
        )}

        {photos.length > 0 && (
          <section className="mt-5">
            <Heading>Fotky</Heading>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {photos.map((photo) => {
                const url = photoUrls.data?.[photo.path]
                return (
                  <figure key={photo.id} className="break-inside-avoid">
                    {url ? (
                      <img src={url} alt={photo.name} className="max-h-[90mm] w-full rounded border border-neutral-300 object-contain" />
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded border border-neutral-300 text-neutral-500">Načítavam…</div>
                    )}
                  </figure>
                )
              })}
            </div>
          </section>
        )}
      </article>
    </div>
  )
}
