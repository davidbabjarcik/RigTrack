import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Plus, Speaker, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import type { Membership } from '@/features/companies/company-context'
import { DEVICE_KIND_LABELS, DEVICE_KINDS, normalizeMac, type DeviceKind } from '@/features/devices/model'
import { addDeviceToCompanies, myDeviceKeys, removeDevice, useMyDevices } from './devices'
import { createOwnEverywhere, myEquipmentKeys, useMyEquipment } from './myEquipment'

const EMPTY = { kind: 'phone' as DeviceKind, name: '', mac: '', ethernetMac: '' }

/** Moje zariadenia s MAC adresou – zapíšu sa naraz do všetkých mojich firiem (siete ostávajú pre každú firmu zvlášť). */
export function MyDevicesEverywhere({ userId, memberships }: { userId: string; memberships: Membership[] }) {
  const queryClient = useQueryClient()
  const devices = useMyDevices(userId)
  const [form, setForm] = useState(EMPTY)
  const [skipped, setSkipped] = useState<string[]>([])
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: myDeviceKeys.all(userId) }), queryClient.invalidateQueries({ queryKey: ['company'] })])
  const allIds = memberships.map((item) => item.companyId)
  const nameOf = (companyId: string) => memberships.find((item) => item.companyId === companyId)?.companyName ?? 'firma'
  const mac = normalizeMac(form.mac)
  const ethernet = form.ethernetMac.trim() ? normalizeMac(form.ethernetMac) : ''

  const add = useMutation({
    mutationFn: ({ companyIds, device }: { companyIds: string[]; device: typeof form & { note: string } }) => addDeviceToCompanies(companyIds, device),
    onSuccess: (failed) => {
      setSkipped(failed)
      setForm(EMPTY)
    },
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: removeDevice, onSettled: refresh })
  // Výkonný notebook či tablet sa dá dať na event – založí sa ako moja vlastná technika (druh IT).
  const gear = useMyEquipment(userId)
  const asGear = useMutation({
    mutationFn: (device: { name: string; companyIds: string[] }) => createOwnEverywhere(device.companyIds, { name: device.name, kind: 'it', quantity: 1 }),
    onSettled: () => Promise.all([queryClient.invalidateQueries({ queryKey: myEquipmentKeys.all(userId) }), queryClient.invalidateQueries({ queryKey: ['company'] })]),
  })
  const inGear = (name: string) => (gear.data ?? []).some(({ original }) => original.name.toLowerCase() === name.toLowerCase())

  if (devices.isError) return null
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!mac || ethernet === null || !form.name.trim()) return
    add.mutate({ companyIds: allIds, device: { ...form, name: form.name.trim(), mac, ethernetMac: ethernet, note: '' } })
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
      <p className="text-sm text-muted-foreground">Mobil, notebook, tablet s MAC adresou – zapíšu sa do všetkých vašich firiem naraz. IP adresy v sieťach doplníte v danej firme.</p>
      {(devices.data ?? []).length > 0 && (
        <ul className="divide-y rounded-lg border text-sm">
          {devices.data!.map((device) => {
            const missing = allIds.filter((id) => !device.companyIds.includes(id))
            return (
              <li key={device.mac} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{device.name}</span> <span className="text-muted-foreground">· {DEVICE_KIND_LABELS[device.kind]} · <span className="font-mono">{device.mac}</span></span>
                  {missing.length > 0 && <span className="block text-xs text-accent">chýba vo firme: {missing.map(nameOf).join(', ')}</span>}
                </span>
                {inGear(device.name) ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Check className="size-3.5" aria-hidden />v technike
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Pridať ako moju vlastnú techniku (dá sa dať na event)"
                    disabled={asGear.isPending || gear.isError}
                    onClick={() => asGear.mutate({ name: device.name, companyIds: device.companyIds })}
                  >
                    <Speaker className="size-4" aria-hidden />
                    Aj do techniky
                  </Button>
                )}
                {missing.length > 0 && (
                  <Button size="sm" variant="outline" disabled={add.isPending} onClick={() => add.mutate({ companyIds: missing, device: { ...device, note: device.note } })}>
                    Pridať všade
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Zmazať ${device.name}`}
                  disabled={remove.isPending}
                  onClick={() => window.confirm(`Zmazať „${device.name}“ zo všetkých firiem?`) && remove.mutate(device.rowIds)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
      {memberships.length > 0 && (
        <form onSubmit={submit} className="grid gap-2 rounded-lg border border-dashed p-3 sm:grid-cols-2 lg:grid-cols-[10rem_1fr_1fr_1fr_auto] lg:items-end">
          <SelectField label="Druh" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as DeviceKind })}>
            {DEVICE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {DEVICE_KIND_LABELS[kind]}
              </option>
            ))}
          </SelectField>
          <Field label="Názov" maxLength={80} placeholder="napr. iPhone 15" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Field label="MAC Wi-Fi" autoComplete="off" placeholder="AA:BB:CC:DD:EE:FF" value={form.mac} onChange={(e) => setForm({ ...form, mac: e.target.value })} />
          <Field label="MAC LAN (nepovinné)" autoComplete="off" value={form.ethernetMac} onChange={(e) => setForm({ ...form, ethernetMac: e.target.value })} />
          <Button type="submit" className="sm:col-span-2 sm:justify-self-start lg:col-span-1" disabled={add.isPending || !mac || ethernet === null || !form.name.trim()}>
            <Plus className="size-4" aria-hidden />
            Pridať
          </Button>
        </form>
      )}
      {form.mac.trim() !== '' && !mac && <p className="text-sm text-destructive">MAC zadajte v tvare AA:BB:CC:DD:EE:FF.</p>}
      {skipped.length > 0 && <p className="text-sm text-accent">Vo firme {skipped.map(nameOf).join(', ')} sa nezapísalo – túto MAC tam už má niekto zapísanú.</p>}
      {remove.isError && <p className="text-sm text-destructive">Zariadenie sa nepodarilo zmazať.</p>}
      {asGear.isError && <p className="text-sm text-destructive">Do techniky sa nepodarilo pridať. Táto časť databázy ešte nemusí byť pripravená.</p>}
    </div>
  )
}
