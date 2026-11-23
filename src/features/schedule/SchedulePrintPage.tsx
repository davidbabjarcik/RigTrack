import { ArrowLeft } from 'lucide-react'
import { useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PaperSheet } from '@/components/print/PaperSheet'
import { PrintButton } from '@/components/print/PrintButton'
import { useCompany } from '@/features/companies/company-context'
import { useEvents } from '@/features/events/useEvents'
import { formatDate } from '@/lib/format'
import { useSchedule } from './api'
import { groupSchedule, SCHEDULE_KIND_LABELS } from './model'

const PRINT_CSS = `
@page { size: A4; margin: 12mm; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; } }
@media print { html, body { background: #fff !important; } }
`

/** Harmonogram akcie na A4 – po dňoch, pri festivale po pódiách vedľa seba. */
export function SchedulePrintPage() {
  const sheet = useRef<HTMLDivElement>(null)
  const { id = '' } = useParams()
  const company = useCompany().active!
  const events = useEvents(company.companyId)
  const schedule = useSchedule(company.companyId, id)
  if (events.isPending || schedule.isPending) return <LoadingBlock />
  const event = events.data?.find((item) => item.id === id)
  if (!event || !schedule.data) return <ErrorBlock message="Harmonogram sa nepodarilo načítať." />
  const days = groupSchedule(schedule.data)
  return (
    <div className="min-h-dvh bg-muted p-2 text-black sm:p-6 print:bg-white print:p-0">
      <style>{PRINT_CSS}</style>
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Link to={`/events/${id}?tab=gear`} className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black">
          <ArrowLeft className="size-4" aria-hidden />
          Späť na event
        </Link>
        <PrintButton sheet={sheet} fileName={`harmonogram-${event.name}`} marginMm={12} />
      </div>
      <PaperSheet sheetRef={sheet} marginMm={12}>
        <header className="mb-4 border-b border-neutral-400 pb-2">
          <h1 className="text-xl font-bold">Harmonogram – {event.name}</h1>
          <p className="text-sm text-neutral-700">
            {[event.startsOn === event.endsOn ? formatDate(event.startsOn) : `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`, event.venue, company.companyName].filter(Boolean).join(' · ')}
          </p>
        </header>
        {[...days].map(([day, stages]) => (
          <section key={day} className="mb-5 break-inside-avoid">
            <h2 className="mb-1 text-base font-bold">{formatDate(day)}</h2>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(3, stages.size)}, minmax(0, 1fr))` }}>
              {[...stages].map(([stage, list]) => (
                <div key={stage}>
                  {(stages.size > 1 || stage) && <p className="mb-1 text-xs font-bold tracking-wide uppercase">{stage || 'Bez pódia'}</p>}
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {list.map((item) => (
                        <tr key={item.id} className="border-b border-neutral-300 align-top">
                          <td className="w-24 py-1 pr-2 font-mono whitespace-nowrap">{item.endsAt ? `${item.startsAt}–${item.endsAt}` : item.startsAt}</td>
                          <td className="py-1">
                            <span className={item.kind === 'act' ? 'font-bold' : ''}>{item.title}</span>
                            <span className="block text-xs text-neutral-600">{[SCHEDULE_KIND_LABELS[item.kind], item.note].filter(Boolean).join(' · ')}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>
        ))}
      </PaperSheet>
    </div>
  )
}
