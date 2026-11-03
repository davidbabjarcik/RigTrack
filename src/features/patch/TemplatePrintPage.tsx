import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { lastAddress, sortDmx } from './dmx'
import { usePatchTemplates } from './dmxApi'
import { PATCH_SOURCE_LABELS } from './model'

const PRINT_CSS = `
@page { size: A4; margin: 12mm; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; } }
@media print { html, body { background: #fff !important; } }
`
const th = 'border border-neutral-400 bg-neutral-100 px-2 py-1 text-left'
const td = 'border border-neutral-400 px-2 py-1'

/** Šablóna patch listu (zvuk alebo DMX) na A4 – na tlač alebo PDF. /patch/:id/print */
export function TemplatePrintPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const templates = usePatchTemplates(company.companyId)
  if (templates.isPending) return <LoadingBlock />
  const template = templates.data?.find((item) => item.id === id)
  if (!template) return <ErrorBlock message="Šablóna neexistuje alebo k nej nemáte prístup." />

  return (
    <div className="min-h-dvh bg-white p-6 text-black">
      <style>{PRINT_CSS}</style>
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Link to="/patch" className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black">
          <ArrowLeft className="size-4" aria-hidden />
          Šablóny patch listov
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden />
          Tlačiť / PDF
        </Button>
      </div>
      <header className="mb-4 border-b border-neutral-400 pb-2">
        <h1 className="text-xl font-bold">
          {template.kind === 'sound' ? 'Patch list' : 'DMX patch'} – {template.name}
        </h1>
        <p className="text-sm text-neutral-700">{[template.note, company.companyName].filter(Boolean).join(' · ')}</p>
      </header>
      {template.kind === 'sound' ? (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={th}>Kanál</th>
              <th className={th}>Čo</th>
              <th className={th}>Stagebox</th>
              <th className={th}>Vstup</th>
              <th className={th}>Zdroj</th>
              <th className={th}>48V</th>
              <th className={th}>Poznámka</th>
            </tr>
          </thead>
          <tbody>
            {[...template.lines]
              .sort((a, b) => a.channel - b.channel)
              .map((line, index) => (
                <tr key={index}>
                  <td className={`${td} font-bold tabular-nums`}>{line.channel}</td>
                  <td className={td}>{line.name}</td>
                  <td className={td}>{line.stagebox}</td>
                  <td className={`${td} tabular-nums`}>{line.stageboxInput ?? ''}</td>
                  <td className={td}>{PATCH_SOURCE_LABELS[line.source]}</td>
                  <td className={td}>{line.phantom ? '48V' : ''}</td>
                  <td className={td}>{line.note}</td>
                </tr>
              ))}
          </tbody>
        </table>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={th}>Linka</th>
              <th className={th}>Adresa</th>
              <th className={th}>Kanály</th>
              <th className={th}>Svetlo</th>
              <th className={th}>Mód</th>
              <th className={th}>Poznámka</th>
            </tr>
          </thead>
          <tbody>
            {sortDmx(template.lines).map((line, index) => (
              <tr key={index}>
                <td className={td}>{line.universe}</td>
                <td className={`${td} font-bold tabular-nums`}>{line.address ? `${line.address}–${lastAddress(line)}` : '–'}</td>
                <td className={`${td} tabular-nums`}>{line.channels}</td>
                <td className={td}>{line.name}</td>
                <td className={td}>{line.mode}</td>
                <td className={td}>{line.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
