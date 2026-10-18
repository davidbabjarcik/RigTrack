import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Field } from '@/components/ui/field'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { useEquipmentLookups } from '@/features/equipment/useEquipmentLookups'
import { cn } from '@/lib/utils'
import { can } from '@/lib/permissions'
import { MemberDevicesSection } from '@/features/devices/MemberDevicesSection'
import { matchesNetwork, networkRows } from './model'

/** Tabuľka IP a MAC adries techniky s vyhľadávaním a upozornením na rovnaké adresy. */
export function NetworkPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const [query, setQuery] = useState('')
  const list = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const cases = useCases(companyId)
  const { locations } = useEquipmentLookups(companyId)

  const rows = networkRows(list.data ?? [])
  const visible = rows.filter((row) => matchesNetwork(row, query))
  const conflicts = rows.filter((row) => row.duplicateIp).length
  const whereIs = (row: (typeof rows)[number]) =>
    cases.data?.find((box) => box.id === row.caseId)?.name ?? locations.find((location) => location.id === row.locationId)?.name ?? ''

  return (
    <>
      <Link to="/equipment" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Technika
      </Link>
      <PageHeader title="IP a MAC adresy" description={list.data ? `${rows.length} zariadení s adresou` : undefined} />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" aria-hidden />
        <Field
          label="Hľadať IP, MAC alebo zariadenie"
          hideLabel
          type="search"
          placeholder="napr. 192.168.1. alebo 4D:5E alebo pult"
          autoComplete="off"
          className="[&_input]:pl-9"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {conflicts > 0 && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          Niektoré IP adresy má viac zariadení ({conflicts}). V jednej sieti by sa bili – sú označené červenou.
        </p>
      )}

      {list.isPending ? (
        <LoadingBlock />
      ) : list.isError ? (
        <ErrorBlock message="Techniku sa nepodarilo načítať." onRetry={() => void list.refetch()} />
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface px-6 py-12 text-center text-sm text-muted-foreground">
          Žiadna technika nemá zadanú IP ani MAC adresu. Zadáte ich pri technike v časti Sieť.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-surface">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">IP</th>
                <th className="px-4 py-2 font-medium">MAC</th>
                <th className="px-4 py-2 font-medium">Zariadenie</th>
                <th className="px-4 py-2 font-medium">Kde je</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map((row) => (
                <tr key={row.id} className="hover:bg-muted">
                  <td className={cn('px-4 py-2 font-mono whitespace-nowrap', row.duplicateIp && 'font-semibold text-destructive')}>
                    {row.ipAddress || '—'}
                  </td>
                  <td className={cn('px-4 py-2 font-mono whitespace-nowrap', row.duplicateMac && 'font-semibold text-destructive')}>
                    {row.macAddress || '—'}
                  </td>
                  <td className="px-4 py-2">
                    <Link to={`/equipment/${row.id}`} className="font-medium hover:underline">
                      {row.name}
                    </Link>
                    {(row.manufacturer || row.model) && (
                      <span className="block text-muted-foreground">{[row.manufacturer, row.model].filter(Boolean).join(' ')}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{whereIs(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nič sa nenašlo.</p>}
        </div>
      )}

      <MemberDevicesSection companyId={companyId} query={query} canManage={can(company, 'staff.manage')} />
    </>
  )
}
