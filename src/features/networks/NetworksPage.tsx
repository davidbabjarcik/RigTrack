import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Laptop, Plus, Search, Speaker } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { useDevices } from '@/features/devices/api'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { useStaff } from '@/features/staff/useStaff'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { fetchRouterLogins, networkKeys, useNetworks } from './api'
import { addressRows, matchesAddress, suggestFreeIp } from './model'
import { WifiCard } from './WifiCard'
import { WifiForm } from './WifiForm'

/** Siete firmy: Wi-Fi (heslá, QR na pripojenie, routery) a všetky IP / MAC adresy techniky aj zariadení členov. */
export function NetworksPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const canEdit = can(company, 'equipment.edit')
  const networks = useNetworks(companyId)
  const logins = useQuery({ queryKey: networkKeys.logins(companyId), queryFn: () => fetchRouterLogins(companyId), enabled: canEdit, retry: false })
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: can(company, 'equipment.view') })
  const devices = useDevices(companyId)
  const staff = useStaff(companyId)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [query, setQuery] = useState('')
  const [networkFilter, setNetworkFilter] = useState('')

  const allNetworks = networks.data ?? []
  const items = equipment.data ?? []
  const loginOf = (id: string) => logins.data?.find((login) => login.networkId === id)
  const owner = (userId: string) => {
    const person = staff.people.find((candidate) => candidate.memberId === userId)
    return { name: person?.name ?? 'Bývalý člen', to: person ? `/staff/${person.key}` : null }
  }
  const rows = addressRows(items, devices.data ?? [], allNetworks, owner)
  const visible = rows.filter((row) => matchesAddress(row, query) && (!networkFilter || (networkFilter === 'none' ? !row.networkId : row.networkId === networkFilter)))
  const conflicts = rows.filter((row) => row.duplicateIp).length
  const selected = allNetworks.find((network) => network.id === networkFilter)
  const freeIp = selected ? suggestFreeIp(selected, rows.filter((row) => row.networkId === selected.id).map((row) => row.ip)) : null
  const networkName = (id: string | null) => allNetworks.find((network) => network.id === id)?.ssid

  return (
    <>
      <PageHeader
        title="Siete"
        description="Wi-Fi siete, routery a všetky IP / MAC adresy"
        action={
          canEdit && editing !== 'new' && !networks.isError ? (
            <Button onClick={() => setEditing('new')}>
              <Plus className="size-4" aria-hidden />
              Pridať Wi-Fi sieť
            </Button>
          ) : undefined
        }
      />

      <CollapsibleSection id="networks.wifi" title={`Wi-Fi siete (${allNetworks.length})`}>
        {editing === 'new' && (
          <div className="mb-3">
            <WifiForm companyId={companyId} current={null} login={undefined} equipment={items} onDone={() => setEditing(null)} />
          </div>
        )}
        {networks.isPending ? (
          <LoadingBlock />
        ) : networks.isError ? (
          <ErrorBlock message="Siete sa nepodarilo načítať. Ak ste ešte nespustili migráciu 0055, urobte to." onRetry={() => void networks.refetch()} />
        ) : allNetworks.length === 0 ? (
          editing !== 'new' && (
            <p className="rounded-xl border border-dashed bg-surface p-6 text-center text-sm text-muted-foreground">
              Zatiaľ žiadne Wi-Fi siete. Pridajte firemnú Wi-Fi alebo router k mixu – aj naskenovaním QR kódu.
            </p>
          )
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {allNetworks.map((network) => (
              <li key={network.id}>
                {editing === network.id ? (
                  <WifiForm companyId={companyId} current={network} login={loginOf(network.id)} equipment={items} onDone={() => setEditing(null)} />
                ) : (
                  <WifiCard
                    network={network}
                    login={loginOf(network.id)}
                    equipment={items.find((item) => item.id === network.equipmentId)}
                    onEdit={canEdit ? () => setEditing(network.id) : undefined}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection id="networks.addresses" title={`IP a MAC adresy (${rows.length})`}>
        <div className="mb-3 flex flex-wrap gap-2">
          <div className="relative min-w-56 flex-1">
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
          <SelectField label="Sieť" hideLabel className="w-56" value={networkFilter} onChange={(event) => setNetworkFilter(event.target.value)}>
            <option value="">Všetky siete</option>
            {allNetworks.map((network) => (
              <option key={network.id} value={network.id}>
                {network.ssid}
              </option>
            ))}
            <option value="none">Bez siete</option>
          </SelectField>
        </div>
        {freeIp && (
          <p className="mb-3 text-sm text-muted-foreground">
            Najbližšia voľná IP v sieti {selected?.ssid}: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{freeIp}</code>
          </p>
        )}
        {conflicts > 0 && (
          <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            Niektoré IP adresy má v tej istej sieti viac zariadení ({conflicts}). Bili by sa – sú označené červenou.
          </p>
        )}
        {equipment.isPending || devices.isPending ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-surface px-6 py-10 text-center text-sm text-muted-foreground">
            Zatiaľ žiadne adresy. IP a MAC sa zadávajú pri technike (časť Sieť) a pri zariadeniach členov (Nastavenia → Účet).
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-surface">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">IP</th>
                  <th className="px-4 py-2 font-medium">MAC</th>
                  <th className="px-4 py-2 font-medium">Zariadenie</th>
                  <th className="px-4 py-2 font-medium">Sieť</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((row) => {
                  const Icon = row.source === 'equipment' ? Speaker : Laptop
                  return (
                    <tr key={row.key} className="hover:bg-muted">
                      <td className={cn('px-4 py-2 font-mono whitespace-nowrap', row.duplicateIp && 'font-semibold text-destructive')}>{row.ip ? `${row.ip}${row.prefix ? `/${row.prefix}` : ''}` : row.dhcp ? <span className="font-sans text-muted-foreground">DHCP</span> : '—'}</td>
                      <td className={cn('px-4 py-2 font-mono whitespace-nowrap', row.duplicateMac && 'font-semibold text-destructive')}>{row.mac || '—'}</td>
                      <td className="px-4 py-2">
                        <span className="flex items-start gap-2">
                          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label={row.source === 'equipment' ? 'Technika' : 'Zariadenie člena'} />
                          <span>
                            {row.to ? (
                              <Link to={row.to} className="font-medium hover:underline">
                                {row.name}
                              </Link>
                            ) : (
                              <span className="font-medium">{row.name}</span>
                            )}
                            {row.detail && <span className="block text-muted-foreground">{row.detail}</span>}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{networkName(row.networkId) ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {visible.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nič sa nenašlo.</p>}
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Ikona reproduktora = technika firmy, notebook = zariadenie člena. Zariadenia členov vidí admin a skladník (ostatní len svoje).
        </p>
      </CollapsibleSection>
    </>
  )
}
