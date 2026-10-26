import { useQuery } from '@tanstack/react-query'
import { errorDetail } from '@/lib/supabase/errors'
import { AlertTriangle, Fingerprint, Laptop, ListOrdered, Plus, Search, Speaker, UserRoundPlus, Wifi, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { useDevices } from '@/features/devices/api'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { useStaff } from '@/features/staff/useStaff'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { fetchGuestDevices, fetchRouterLogins, networkKeys, useNetworks } from './api'
import { GuestDeviceForm } from './GuestDeviceForm'
import { addressRows, matchesAddress, suggestFreeIp } from './model'
import { WifiCard } from './WifiCard'
import { WifiForm } from './WifiForm'

const TABS: { id: 'wifi' | 'ip' | 'mac'; label: string; icon: LucideIcon }[] = [
  { id: 'wifi', label: 'Wi-Fi siete', icon: Wifi },
  { id: 'ip', label: 'IP tabuľka', icon: ListOrdered },
  { id: 'mac', label: 'MAC adresy', icon: Fingerprint },
]
type Tab = (typeof TABS)[number]['id']

/** Poradie IP adries podľa čísel (192.168.1.9 pred 192.168.1.10); bez IP na koniec. */
const ipKey = (ip: string) => (ip ? ip.split('.').map((part) => part.padStart(3, '0')).join('.') : '~')

/** Siete firmy: Wi-Fi (heslá, QR na pripojenie, routery) a všetky IP / MAC adresy techniky aj zariadení členov. */
export function NetworksPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const canEdit = can(company, 'equipment.edit')
  // Oprávnenia sietí (0103): IP a MAC adresy, správa routerov.
  const canAddresses = can(company, 'networks.addresses')
  const canAdmin = can(company, 'networks.admin')
  const networks = useNetworks(companyId)
  const logins = useQuery({ queryKey: networkKeys.logins(companyId), queryFn: () => fetchRouterLogins(companyId), enabled: canAdmin, retry: false })
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: can(company, 'equipment.view') })
  const devices = useDevices(companyId)
  const guests = useQuery({ queryKey: networkKeys.guests(companyId), queryFn: () => fetchGuestDevices(companyId), enabled: canEdit, retry: false })
  const [guestEditing, setGuestEditing] = useState<string | 'new' | null>(null)
  const staff = useStaff(companyId)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [query, setQuery] = useState('')
  const [networkFilter, setNetworkFilter] = useState('')
  // Čo chcem vidieť: Wi-Fi siete, IP tabuľku alebo MAC adresy (v adrese, aby sa dalo vrátiť).
  const [params, setParams] = useSearchParams()
  const tabs = TABS.filter((item) => item.id === 'wifi' || canAddresses)
  const tab: Tab = tabs.find((item) => item.id === params.get('tab'))?.id ?? 'wifi'

  const allNetworks = networks.data ?? []
  const items = equipment.data ?? []
  const loginOf = (id: string) => logins.data?.find((login) => login.networkId === id)
  const owner = (userId: string) => {
    const person = staff.people.find((candidate) => candidate.memberId === userId)
    return { name: person?.name ?? 'Bývalý člen', to: person ? `/staff/${person.key}` : null }
  }
  const rows = addressRows(items, devices.data ?? [], allNetworks, owner, guests.data ?? [])
  const filtered = rows.filter((row) => matchesAddress(row, query) && (!networkFilter || (networkFilter === 'none' ? !row.networkId : row.networkId === networkFilter)))
  const visible =
    tab === 'mac'
      ? filtered.filter((row) => row.mac).sort((a, b) => a.mac.localeCompare(b.mac))
      : filtered.filter((row) => row.ip || row.dhcp).sort((a, b) => ipKey(a.ip).localeCompare(ipKey(b.ip)))
  const conflicts = rows.filter((row) => row.duplicateIp).length
  const selected = allNetworks.find((network) => network.id === networkFilter)
  const freeIp = selected ? suggestFreeIp(selected, rows.filter((row) => row.networkId === selected.id).map((row) => row.ip)) : null
  const networkName = (id: string | null) => allNetworks.find((network) => network.id === id)?.ssid
  const freeIn = (networkId: string) => {
    const network = allNetworks.find((item) => item.id === networkId)
    return network ? suggestFreeIp(network, rows.filter((row) => row.networkId === network.id).map((row) => row.ip)) : null
  }
  const editedGuest = guests.data?.find((guest) => guest.id === guestEditing) ?? null

  return (
    <>
      <PageHeader
        title="Siete"
        description="Wi-Fi siete, routery a všetky IP / MAC adresy"
        action={
          !canEdit ? undefined : tab === 'wifi' ? (
            editing !== 'new' && !networks.isError ? (
              <Button onClick={() => setEditing('new')}>
                <Plus className="size-4" aria-hidden />
                Pridať Wi-Fi sieť
              </Button>
            ) : undefined
          ) : guestEditing !== 'new' && !guests.isError ? (
            <Button onClick={() => setGuestEditing('new')}>
              <UserRoundPlus className="size-4" aria-hidden />
              Pridať hosťa
            </Button>
          ) : undefined
        }
      />

      <div role="tablist" aria-label="Čo zobraziť" className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((item) => {
          const count = item.id === 'wifi' ? allNetworks.length : item.id === 'ip' ? rows.filter((row) => row.ip || row.dhcp).length : rows.filter((row) => row.mac).length
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setParams(item.id === 'wifi' ? {} : { tab: item.id }, { replace: true })}
              className={cn(
                'inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors',
                tab === item.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-surface text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
              <span className="tabular-nums opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      {tab === 'wifi' && (
      <section aria-label="Wi-Fi siete">
        {editing === 'new' && (
          <div className="mb-3">
            <WifiForm companyId={companyId} current={null} login={undefined} equipment={items} onDone={() => setEditing(null)} />
          </div>
        )}
        {networks.isPending ? (
          <LoadingBlock />
        ) : networks.isError ? (
          <ErrorBlock message={`Siete sa nepodarilo načítať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie. ${errorDetail(networks.error)}`} onRetry={() => void networks.refetch()} />
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
                    showAddresses={canAddresses}
                    equipment={items.find((item) => item.id === network.equipmentId)}
                    onEdit={canEdit ? () => setEditing(network.id) : undefined}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      {tab !== 'wifi' && (
      <section aria-label={tab === 'ip' ? 'IP tabuľka' : 'MAC adresy'}>
        {guestEditing && (guestEditing === 'new' || editedGuest) && (
          <GuestDeviceForm
            key={guestEditing}
            companyId={companyId}
            current={editedGuest}
            networks={allNetworks}
            suggestIp={freeIn}
            onDone={() => setGuestEditing(null)}
          />
        )}
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
        {freeIp && tab === 'ip' && (
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
            Zatiaľ žiadne adresy. IP a MAC sa zadávajú pri technike (časť Sieť), pri zariadeniach členov (Nastavenia → Účet) a pre hostí tlačidlom „Pridať hosťa“.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-surface">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">{tab === 'ip' ? 'IP' : 'MAC'}</th>
                  <th className="px-4 py-2 font-medium">{tab === 'ip' ? 'MAC' : 'IP'}</th>
                  <th className="px-4 py-2 font-medium">Zariadenie</th>
                  <th className="px-4 py-2 font-medium">Sieť</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((row) => {
                  const Icon = row.source === 'equipment' ? Speaker : row.source === 'guest' ? UserRoundPlus : Laptop
                  const ipCell = (
                    <td className={cn('px-4 py-2 font-mono whitespace-nowrap', row.duplicateIp && 'font-semibold text-destructive', tab === 'mac' && 'text-muted-foreground')}>
                      {row.ip ? `${row.ip}${row.prefix ? `/${row.prefix}` : ''}` : row.dhcp ? <span className="font-sans text-muted-foreground">DHCP</span> : '—'}
                    </td>
                  )
                  const macCell = (
                    <td className={cn('px-4 py-2 font-mono whitespace-nowrap', row.duplicateMac && 'font-semibold text-destructive', tab === 'ip' && 'text-muted-foreground')}>
                      {row.mac || '—'}
                      {row.mac && row.iface && (
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-sans text-xs text-muted-foreground" title={row.iface === 'lan' ? 'MAC ethernetovej (LAN) karty' : 'MAC Wi-Fi karty'}>
                          {row.iface === 'lan' ? 'LAN' : 'Wi-Fi'}
                        </span>
                      )}
                    </td>
                  )
                  return (
                    <tr key={row.key} className="hover:bg-muted">
                      {tab === 'ip' ? (
                        <>
                          {ipCell}
                          {macCell}
                        </>
                      ) : (
                        <>
                          {macCell}
                          {ipCell}
                        </>
                      )}
                      <td className="px-4 py-2">
                        <span className="flex items-start gap-2">
                          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label={row.source === 'equipment' ? 'Technika' : row.source === 'guest' ? 'Hosť' : 'Zariadenie člena'} />
                          <span>
                            {row.guestId ? (
                              <button type="button" className="text-left font-medium hover:underline" onClick={() => setGuestEditing(row.guestId!)}>
                                {row.name}
                              </button>
                            ) : row.to ? (
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
          Ikona reproduktora = technika firmy, notebook = zariadenie člena, osoba s plusom = hosť. Zariadenia členov vidí admin a skladník (ostatní len svoje).
        </p>
      </section>
      )}
    </>
  )
}
