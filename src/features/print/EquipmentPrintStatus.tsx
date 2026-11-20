import { Printer } from 'lucide-react'
import { formatDate } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { usePrintedLabels } from './api'

/** Pri technike: či a kedy bol vytlačený QR štítok a štítok na pásku. */
export function EquipmentPrintStatus({ companyId, equipmentId }: { companyId: string; equipmentId: string }) {
  const printed = usePrintedLabels(companyId)
  // Bez migrácie 0123 (null) sa nič neukáže.
  if (!printed.data) return null
  const of = (label: 'qr' | 'tape') => printed.data!.find((item) => item.kind === 'equipment' && item.targetId === equipmentId && item.label === label)
  const describe = (name: string, record: ReturnType<typeof of>) =>
    record ? (record.printedAt ? tf('{0} vytlačený {1}', name, formatDate(record.printedAt.slice(0, 10))) : tf('{0} vytlačený', name)) : tf('{0} ešte nevytlačený', name)
  const tape = of('tape')
  return (
    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
      <Printer className="size-4 shrink-0" aria-hidden />
      {[describe(tx('QR štítok'), of('qr')), tape && describe(tx('Štítok na pásku'), tape)].filter(Boolean).join(' · ')}
    </p>
  )
}
