import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Briefcase, Printer, QrCode, Speaker, Tag, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { caseTitle } from '@/features/cases/model'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { addToPrintQueue, markPrinted, printKeys, removeFromPrintQueue, useCompanyPrefs, usePrintedLabels, usePrintQueue, type PrintItem } from './api'

/**
 * Tlačová fronta: štítky pridané cez „Do tlače“ alebo @toprint. QR idú na A4 alebo na Brother (podľa nastavenia firmy),
 * štítky na pásku (adresa, módy, odber) na Brother. Po vytlačení sa fronta vyprázdni.
 */
export function PrintQueuePage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const queryClient = useQueryClient()
  const queue = usePrintQueue(companyId)
  const prefs = useCompanyPrefs(companyId).data ?? {}
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const cases = useCases(companyId)
  const remove = useMutation({ mutationFn: (ids: string[]) => removeFromPrintQueue(companyId, ids), onSettled: () => queryClient.invalidateQueries({ queryKey: printKeys.queue(companyId) }) })
  const printed = usePrintedLabels(companyId)
  // Vytlačené: zapamätať (kvôli „Bez QR štítku“) a vyprázdniť frontu.
  const done = useMutation({
    mutationFn: async (list: PrintItem[]) => {
      await markPrinted(companyId, list.map((item) => ({ kind: item.kind, targetId: item.targetId, label: item.label }))).catch(() => undefined)
      await removeFromPrintQueue(companyId, list.map((item) => item.id))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: printKeys.queue(companyId) }),
  })
  const addMissing = useMutation({
    mutationFn: (list: { kind: PrintItem['kind']; targetId: string }[]) => addToPrintQueue(companyId, list),
    onSettled: () => queryClient.invalidateQueries({ queryKey: printKeys.queue(companyId) }),
  })
  const markMissing = useMutation({
    mutationFn: (list: { kind: PrintItem['kind']; targetId: string }[]) => markPrinted(companyId, list.map((item) => ({ ...item, label: 'qr' as const }))),
    onSettled: () => queryClient.invalidateQueries({ queryKey: printKeys.queue(companyId) }),
  })

  if (queue.isPending) return <LoadingBlock />
  if (queue.isError) return <ErrorBlock message="Tlačová fronta zatiaľ nie je dostupná – treba spustiť migráciu 0120 (supabase/update-all.sql)." />

  const items = queue.data
  const nameOf = (item: PrintItem) => {
    if (item.kind === 'case') {
      const box = cases.data?.find((candidate) => candidate.id === item.targetId)
      return box ? caseTitle(box) : 'Case (zmazaný)'
    }
    return equipment.data?.find((candidate) => candidate.id === item.targetId)?.name ?? 'Technika (zmazaná)'
  }
  const qrEquipment = items.filter((item) => item.label === 'qr' && item.kind === 'equipment')
  const qrCases = items.filter((item) => item.label === 'qr' && item.kind === 'case')
  const tape = items.filter((item) => item.label === 'tape')
  const caseLabels = items.filter((item) => item.label === 'case_label')
  const contents = items.filter((item) => item.label === 'content')
  const ids = (list: PrintItem[]) => [...new Set(list.map((item) => item.targetId))].join(',')
  const a4 = (prefs.qrTarget ?? 'a4') === 'a4'
  // Bez QR štítku: technika (okrem spotrebného materiálu) a cases, ktoré ešte nemajú vytlačený ani zaradený QR.
  const hasQr = new Set([...(printed.data ?? []), ...items].filter((item) => item.label === 'qr').map((item) => `${item.kind}|${item.targetId}`))
  const missingEquipment = (equipment.data ?? []).filter((item) => item.status !== 'retired' && item.kind !== 'consumable' && !hasQr.has(`equipment|${item.id}`))
  const missingCases = (cases.data ?? []).filter((item) => !hasQr.has(`case|${item.id}`))
  const missing = [...missingEquipment.map((item) => ({ kind: 'equipment' as const, targetId: item.id })), ...missingCases.map((item) => ({ kind: 'case' as const, targetId: item.id }))]
  const batchLink = (labels: PrintItem[], sheets: PrintItem[]) => `/print/batch?labels=${ids(labels)}&contents=${ids(sheets)}`

  const group = (title: string, icon: React.ReactNode, list: PrintItem[], actions: React.ReactNode) =>
    list.length > 0 && (
      <section className="mb-5 rounded-xl border bg-surface p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="flex flex-1 items-center gap-2 font-medium">
            {icon}
            {title} ({list.length})
          </h2>
          {actions}
        </div>
        <ul className="divide-y text-sm">
          {list.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-1.5">
              <Link to={item.kind === 'case' ? `/cases/${item.targetId}` : `/equipment/${item.targetId}`} className="min-w-0 flex-1 truncate hover:underline">
                {nameOf(item)}
              </Link>
              {item.note && <span className="truncate text-muted-foreground">{item.note}</span>}
              {/* Štítok a obsah case sa tlačia každý zvlášť (vlastná stránka s tlačou / PDF). */}
              {(item.label === 'case_label' || item.label === 'content') && (
                <Link to={`/cases/${item.targetId}/${item.label === 'content' ? 'content' : 'label'}`} className="inline-flex items-center gap-1 text-accent hover:underline">
                  <Printer className="size-4" aria-hidden />
                  Otvoriť a tlačiť
                </Link>
              )}
              <Button size="sm" variant="ghost" className="size-8 p-0" aria-label={`Odobrať z tlače: ${nameOf(item)}`} disabled={remove.isPending} onClick={() => remove.mutate([item.id])}>
                <X className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      </section>
    )
  const printLink = (to: string, label: string) => (
    <Link to={to} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90">
      <Printer className="size-4" aria-hidden />
      {label}
    </Link>
  )

  return (
    <>
      <PageHeader
        title="Tlač"
        description={`Štítky na tlač – QR ${a4 ? 'na A4' : 'na Brother'}, adresy a módy na Brother, štítky a obsah cases (nastavíte v Nastavenia → Zoznamy → Tlač)`}
        action={
          items.length > 0 && (
            <Button variant="outline" disabled={done.isPending} onClick={() => window.confirm('Všetko je vytlačené? Fronta sa vyprázdni.') && done.mutate(items)}>
              <Trash2 className="size-4" aria-hidden />
              Vytlačené – vyprázdniť
            </Button>
          )
        }
      />
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-8 text-center text-sm text-muted-foreground">
          Fronta je prázdna. Pri technike je tlačidlo „QR do tlače“, pri case na stránkach QR štítok, Štítok a Obsah; alebo napíšte @toprint do políčka.
        </p>
      ) : (
        <>
          {group(
            'QR štítky techniky',
            <Speaker className="size-5 text-accent" aria-hidden />,
            qrEquipment,
            a4 ? printLink(`/qr/equipment?ids=${ids(qrEquipment)}`, 'Tlačiť na A4') : printLink(`/labels/tape?ids=${ids(qrEquipment)}&back=/print`, 'Na Brother'),
          )}
          {group(
            'QR štítky cases',
            <Briefcase className="size-5 text-accent" aria-hidden />,
            qrCases,
            a4 ? printLink(`/qr/cases?ids=${ids(qrCases)}`, 'Tlačiť na A4') : printLink(`/labels/tape?cases=${ids(qrCases)}&back=/print`, 'Na Brother'),
          )}
          {caseLabels.length + contents.length > 1 && (
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
              <span className="flex-1">Štítky a obsahy cases môžete vytlačiť všetky naraz (alebo stiahnuť jedno PDF).</span>
              {printLink(batchLink(caseLabels, contents), 'Tlačiť všetko naraz')}
            </div>
          )}
          {group('Štítky cases', <Tag className="size-5 text-accent" aria-hidden />, caseLabels, caseLabels.length > 1 ? printLink(batchLink(caseLabels, []), 'Všetky štítky') : null)}
          {group('Obsah cases (hárky)', <Briefcase className="size-5 text-accent" aria-hidden />, contents, contents.length > 1 ? printLink(batchLink([], contents), 'Všetky obsahy') : null)}
          {group('Štítky na pásku Brother (adresy, módy, odber)', <Tag className="size-5 text-accent" aria-hidden />, tape, printLink(`/labels/tape?ids=${ids(tape.filter((item) => item.kind === 'equipment'))}&back=/print`, 'Na Brother'))}
        </>
      )}
      {printed.data && missing.length > 0 && (
        <section className="mt-6 rounded-xl border bg-surface p-4">
          <h2 className="mb-1 flex items-center gap-2 font-medium">
            <QrCode className="size-5 text-accent" aria-hidden />
            Bez QR štítku ({missing.length})
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Technika a cases, ktoré ešte nemajú vytlačený QR štítok
            {missingEquipment.length > 0 && missingCases.length > 0 && ` (${missingEquipment.length} techniky, ${missingCases.length} cases)`}. Štítok sa
            zapamätá po „Vytlačené – vyprázdniť“. Ak už nalepené sú, označte ich.
          </p>
          <ul className="mb-3 flex max-h-48 flex-col gap-0.5 overflow-y-auto text-sm">
            {[...missingCases.map((item) => ({ id: item.id, to: `/cases/${item.id}`, name: caseTitle(item) })), ...missingEquipment.map((item) => ({ id: item.id, to: `/equipment/${item.id}`, name: item.name }))].map((entry) => (
              <li key={entry.id}>
                <Link to={entry.to} className="hover:underline">
                  {entry.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={addMissing.isPending} onClick={() => addMissing.mutate(missing)}>
              <Printer className="size-4" aria-hidden />
              Pridať všetky do tlače
            </Button>
            <Button size="sm" variant="outline" disabled={markMissing.isPending} onClick={() => window.confirm(`Označiť ${missing.length} ako už olepené?`) && markMissing.mutate(missing)}>
              Už sú olepené – označiť
            </Button>
          </div>
        </section>
      )}
    </>
  )
}
