import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, FileUp } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import type { Equipment } from '@/features/equipment/model'
import { formatDate } from '@/lib/format'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { CompanyEvent } from '../model'
import { useEvents } from '../useEvents'
import { aliasKeys, createImportedEquipment, fetchAliases, rememberAliases, writeToEvent } from './api'
import {
  distribute,
  htmlReportLines,
  kindForSection,
  matchReportItem,
  normalizeName,
  ownedUnderName,
  parseReportLines,
  type EquipmentReport,
  type Match,
} from './equipmentReport'

/** Rozhodnutie pri riadku: technika (id), nová technika, nepridávať, alebo ešte nerozhodnuté. */
const NEW = 'new'
const SKIP = 'skip'

type Row = { key: number; section: string; name: string; quantity: number; match: Match; decision: string }

async function readReport(file: File): Promise<EquipmentReport> {
  if (/\.html?$/i.test(file.name) || file.type === 'text/html') return parseReportLines(htmlReportLines(await file.text()))
  // Čítanie PDF je veľká knižnica; stiahne sa až tu.
  const { extractPdfLines } = await import('@/features/orders/import/pdf')
  return parseReportLines(await extractPdfLines(file))
}

function Review({ companyId, event, report, equipment, aliases }: { companyId: string; event: CompanyEvent; report: EquipmentReport; equipment: Equipment[]; aliases: Map<string, string> }) {
  const company = useCompany().active!
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const canCreate = can(company, 'equipment.edit')
  const [remember, setRemember] = useState(true)
  const [rows, setRows] = useState<Row[]>(() =>
    report.items.map((item, key) => {
      const match = matchReportItem(item.name, equipment, aliases)
      return { key, ...item, match, decision: match.status === 'unknown' ? '' : match.equipmentId }
    }),
  )
  const update = (key: number, patch: Partial<Row>) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  const itemOf = (id: string) => equipment.find((item) => item.id === id)
  const undecided = rows.filter((row) => row.decision === '')
  const options = [...equipment].sort((a, b) => a.name.localeCompare(b.name, 'sk'))

  const save = useMutation({
    mutationFn: async () => {
      const quantities = new Map<string, number>()
      const pairs: { alias: string; equipmentId: string }[] = []
      for (const row of rows) {
        if (row.decision === SKIP || row.quantity < 1) continue
        if (row.decision === NEW) {
          const id = await createImportedEquipment(companyId, { name: row.name, kind: kindForSection(row.section), quantity: row.quantity })
          quantities.set(id, (quantities.get(id) ?? 0) + row.quantity)
          pairs.push({ alias: normalizeName(row.name), equipmentId: id })
          continue
        }
        const target = itemOf(row.decision)
        if (!target) continue
        for (const [id, count] of distribute(row.quantity, target, equipment)) quantities.set(id, (quantities.get(id) ?? 0) + count)
        // Pamätá sa len to, čo sa nenašlo samo podľa názvu.
        if (!(row.match.status === 'known' && row.match.via === 'name' && row.match.equipmentId === target.id)) {
          pairs.push({ alias: normalizeName(row.name), equipmentId: target.id })
        }
      }
      await writeToEvent(companyId, event, quantities)
      if (remember) await rememberAliases(companyId, pairs)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] })
      navigate(`/events/${event.id}`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: aliasKeys.list(companyId) }),
  })

  const count = (status: Match['status']) => rows.filter((row) => row.match.status === status).length

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border bg-surface p-4 text-sm">
        <p className="font-medium">{report.title || 'Equipment Report'}</p>
        {report.subtitle && <p className="text-muted-foreground">{report.subtitle}</p>}
        <p className="mt-2">
          {rows.length} položiek: <span className="text-emerald-700 dark:text-emerald-400">{count('known')} poznám</span>,{' '}
          <span className="text-amber-700 dark:text-amber-300">{count('suggested')} návrh</span>,{' '}
          <span className="text-destructive">{count('unknown')} nepoznám</span>. Skontrolujte priradenie a počty, až potom zapíšte.
        </p>
      </div>

      {undecided.length > 0 && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <span>
            Tieto predmety nepoznám: <strong>{undecided.map((row) => row.name).join(', ')}</strong>. Priraďte ich k našej technike,
            {canCreate ? ' pridajte ako novú techniku' : ''} alebo zvoľte „Nepridávať“.
          </span>
        </div>
      )}

      <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
        {rows.map((row) => {
          const target = row.decision && row.decision !== NEW && row.decision !== SKIP ? itemOf(row.decision) : undefined
          const owned = target ? ownedUnderName(target, equipment) : null
          const tone =
            row.decision === ''
              ? 'border-l-destructive'
              : row.match.status === 'suggested' && row.decision === row.match.equipmentId
                ? 'border-l-amber-500'
                : row.decision === SKIP
                  ? 'border-l-muted'
                  : 'border-l-emerald-500'
          return (
            <li key={row.key} className={cn('flex flex-wrap items-end gap-3 border-l-4 px-4 py-3', tone)}>
              <Field
                label="Počet"
                type="number"
                min={0}
                className="w-20"
                value={row.quantity}
                onChange={(event) => update(row.key, { quantity: Math.max(0, Math.floor(Number(event.target.value) || 0)) })}
              />
              <div className="min-w-48 flex-1">
                <p className="text-xs text-muted-foreground">{row.section}</p>
                <p className="font-medium break-words">{row.name}</p>
                {row.match.status === 'suggested' && row.decision === row.match.equipmentId && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">Návrh podľa podobného názvu – skontrolujte.</p>
                )}
                {row.decision === '' && <p className="text-xs text-destructive">Predmet nepoznám.</p>}
              </div>
              <label className="flex min-w-56 flex-1 flex-col gap-1.5 text-sm font-medium">
                Naša technika
                <select
                  className="h-11 w-full rounded-lg border bg-surface px-3 text-base"
                  value={row.decision}
                  onChange={(event) => update(row.key, { decision: event.target.value })}
                >
                  <option value="">— vyberte —</option>
                  <option value={SKIP}>Nepridávať</option>
                  {canCreate && <option value={NEW}>＋ Pridať ako novú techniku</option>}
                  {options.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.manufacturer || item.model ? ` (${[item.manufacturer, item.model].filter(Boolean).join(' ')})` : ''}
                    </option>
                  ))}
                </select>
                {owned !== null && (
                  <span className={cn('text-xs font-normal', owned < row.quantity ? 'text-destructive' : 'text-muted-foreground')}>
                    máme {owned} ks{owned < row.quantity ? ' – málo' : ''}
                  </span>
                )}
              </label>
            </li>
          )
        })}
      </ul>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
        Zapamätať priradenia pre ďalší import
      </label>

      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          Zápis sa nepodaril. Ak ste ešte nespustili migráciu 0040, urobte to.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button disabled={undecided.length > 0 || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Zapisujem…' : 'Skontrolované – zapísať na event'}
        </Button>
        <Link to={`/events/${event.id}`} className="inline-flex h-10 items-center px-3 text-sm text-muted-foreground hover:text-foreground">
          Zrušiť
        </Link>
      </div>
    </div>
  )
}

/** Import techniky na event z Equipment Reportu (Capture) v HTML alebo PDF, s kontrolou pred zápisom. */
export function EventImportPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const events = useEvents(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const aliases = useQuery({ queryKey: aliasKeys.list(companyId), queryFn: () => fetchAliases(companyId) })
  const fileInput = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [report, setReport] = useState<EquipmentReport | null>(null)
  const read = useMutation({
    mutationFn: readReport,
    onSuccess: (result) => setReport(result.items.length > 0 ? result : null),
  })

  const event = events.data?.find((candidate) => candidate.id === id)
  const back = (
    <Link to={`/events/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      Event
    </Link>
  )

  if (!can(company, 'events.edit')) return <ErrorBlock message="Na úpravu eventov nemáte oprávnenie." />
  if (events.isPending || equipment.isPending || aliases.isPending) return <LoadingBlock />
  if (aliases.isError) return <ErrorBlock message="Import sa nepodarilo pripraviť. Ak ste ešte nespustili migráciu 0040, urobte to." />
  if (!event || !equipment.data) {
    return (
      <>
        {back}
        <ErrorBlock message="Tento event neexistuje alebo k nemu nemáte prístup." />
      </>
    )
  }

  const pick = (file: File | undefined) => {
    if (file && !read.isPending) read.mutate(file)
  }

  return (
    <>
      {back}
      <PageHeader title="Import techniky" description={`${event.name} · ${formatDate(event.startsOn)}`} />
      {!report ? (
        <div
          onDragOver={(dragEvent: DragEvent) => {
            dragEvent.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(dragEvent: DragEvent) => {
            dragEvent.preventDefault()
            setDragging(false)
            pick(dragEvent.dataTransfer.files[0])
          }}
          className={cn('rounded-xl border-2 border-dashed bg-surface p-8 text-center', dragging && 'border-accent bg-accent/10')}
        >
          <input
            ref={fileInput}
            type="file"
            accept=".htm,.html,.pdf,text/html,application/pdf"
            className="sr-only"
            tabIndex={-1}
            onChange={(changeEvent) => {
              const file = changeEvent.target.files?.[0]
              changeEvent.target.value = ''
              pick(file)
            }}
          />
          <FileUp className="mx-auto size-7 text-muted-foreground" aria-hidden />
          <p className="mt-2 font-medium">Pretiahnite sem Equipment Report z Capture (HTML alebo PDF)</p>
          <p className="mt-1 text-sm text-muted-foreground">Nič sa nezapíše, kým zoznam neskontrolujete. Súbor sa číta vo vašom prehliadači.</p>
          <Button variant="outline" size="sm" className="mt-3" disabled={read.isPending} onClick={() => fileInput.current?.click()}>
            {read.isPending ? 'Čítam…' : 'alebo vybrať súbor'}
          </Button>
          {(read.isError || (read.isSuccess && !report)) && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              V súbore som nenašiel žiadnu techniku. Je to Equipment Report z Capture?
            </p>
          )}
        </div>
      ) : (
        <Review companyId={companyId} event={event} report={report} equipment={equipment.data.filter((item) => item.status !== 'retired')} aliases={aliases.data} />
      )}
    </>
  )
}
