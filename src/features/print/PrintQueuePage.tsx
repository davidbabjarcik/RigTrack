import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Briefcase, Printer, Speaker, Tag, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { caseTitle } from '@/features/cases/model'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { printKeys, removeFromPrintQueue, useCompanyPrefs, usePrintQueue, type PrintItem } from './api'

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
  const ids = (list: PrintItem[]) => [...new Set(list.map((item) => item.targetId))].join(',')
  const a4 = (prefs.qrTarget ?? 'a4') === 'a4'

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
        description={`Štítky na tlač naraz – QR ${a4 ? 'na A4' : 'na Brother'}, adresy a módy na Brother (nastavíte v Nastavenia → Zoznamy → Tlač)`}
        action={
          items.length > 0 && (
            <Button variant="outline" disabled={remove.isPending} onClick={() => window.confirm('Všetko je vytlačené? Fronta sa vyprázdni.') && remove.mutate(items.map((item) => item.id))}>
              <Trash2 className="size-4" aria-hidden />
              Vytlačené – vyprázdniť
            </Button>
          )
        }
      />
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-8 text-center text-sm text-muted-foreground">
          Fronta je prázdna. Štítky pridáte tlačidlom „Do tlače“ pri technike alebo case, alebo napíšte @toprint do políčka.
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
          {group('Štítky na pásku Brother (adresy, módy, odber)', <Tag className="size-5 text-accent" aria-hidden />, tape, printLink(`/labels/tape?ids=${ids(tape.filter((item) => item.kind === 'equipment'))}&back=/print`, 'Na Brother'))}
        </>
      )}
    </>
  )
}
