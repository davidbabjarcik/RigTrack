import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { normalizeMac } from '@/features/devices/model'
import { deleteGuestDevice, networkKeys, saveGuestDevice } from './api'
import type { GuestDevice, WifiNetwork } from './model'

const EMPTY: Omit<GuestDevice, 'id'> = { personName: '', contact: '', deviceName: '', mac: '', ip: '', networkId: null, note: '', validUntil: null }
const IP = /^(\d{1,3}\.){3}\d{1,3}$/

/** Zariadenie hosťa (napr. hosťujúci zvukár): kto, kontakt, aké zariadenie, MAC a prípadne pevná IP. */
export function GuestDeviceForm({
  companyId,
  current,
  networks,
  suggestIp,
  onDone,
}: {
  companyId: string
  current: GuestDevice | null
  networks: WifiNetwork[]
  /** Navrhne voľnú IP v zvolenej sieti. */
  suggestIp: (networkId: string) => string | null
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<Omit<GuestDevice, 'id'>>(current ?? EMPTY)
  const set = (patch: Partial<typeof values>) => setValues({ ...values, ...patch })
  const mac = values.mac.trim() ? normalizeMac(values.mac) : ''
  const ipOk = !values.ip.trim() || IP.test(values.ip.trim())
  const valid = values.personName.trim() !== '' && mac !== null && ipOk && (mac !== '' || values.ip.trim() !== '')
  const refresh = () => queryClient.invalidateQueries({ queryKey: networkKeys.guests(companyId) })
  const save = useMutation({ mutationFn: () => saveGuestDevice(companyId, current?.id ?? null, { ...values, mac: mac ?? '' }), onSuccess: onDone, onSettled: refresh })
  const remove = useMutation({ mutationFn: () => deleteGuestDevice(companyId, current!.id), onSuccess: onDone, onSettled: refresh })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (valid) save.mutate()
  }
  const free = values.networkId ? suggestIp(values.networkId) : null

  return (
    <form onSubmit={submit} className="mb-3 grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
      <p className="text-sm font-medium sm:col-span-2 lg:col-span-3">{current ? 'Upraviť zariadenie hosťa' : 'Pridať zariadenie hosťa'}</p>
      <Field label="Meno a priezvisko *" maxLength={120} autoComplete="off" value={values.personName} onChange={(e) => set({ personName: e.target.value })} />
      <Field label="Kontakt (telefón / e-mail)" maxLength={120} autoComplete="off" value={values.contact} onChange={(e) => set({ contact: e.target.value })} />
      <Field label="Zariadenie" maxLength={80} placeholder="napr. MacBook, iPad s mixom" value={values.deviceName} onChange={(e) => set({ deviceName: e.target.value })} />
      <Field label="MAC adresa" autoComplete="off" placeholder="AA:BB:CC:DD:EE:FF" value={values.mac} onChange={(e) => set({ mac: e.target.value })} />
      <SelectField label="Sieť" value={values.networkId ?? ''} onChange={(e) => set({ networkId: e.target.value || null })}>
        <option value="">—</option>
        {networks.map((network) => (
          <option key={network.id} value={network.id}>
            {network.ssid}
          </option>
        ))}
      </SelectField>
      <div>
        <Field label="Pevná IP (prázdne = DHCP)" autoComplete="off" placeholder="192.168.1.50" value={values.ip} onChange={(e) => set({ ip: e.target.value })} />
        {free && !values.ip && (
          <button type="button" className="mt-1 text-xs text-accent hover:underline" onClick={() => set({ ip: free })}>
            Použiť voľnú {free}
          </button>
        )}
      </div>
      <Field label="Platí do (nepovinné)" type="date" value={values.validUntil ?? ''} onChange={(e) => set({ validUntil: e.target.value || null })} />
      <Field label="Poznámka" maxLength={300} className="sm:col-span-2" value={values.note} onChange={(e) => set({ note: e.target.value })} />
      {mac === null && <p className="text-sm text-destructive sm:col-span-2 lg:col-span-3">MAC zadajte v tvare AA:BB:CC:DD:EE:FF.</p>}
      {!ipOk && <p className="text-sm text-destructive sm:col-span-2 lg:col-span-3">IP zadajte v tvare 192.168.1.50.</p>}
      {(save.isError || remove.isError) && <p className="text-sm text-destructive sm:col-span-2 lg:col-span-3">Nepodarilo sa uložiť. Táto časť databázy ešte nemusí byť pripravená.</p>}
      <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={!valid || save.isPending}>
          {save.isPending ? 'Ukladám…' : 'Uložiť'}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Zrušiť
        </Button>
        {current && (
          <Button type="button" variant="ghost" className="ml-auto" disabled={remove.isPending} onClick={() => window.confirm(`Zmazať zariadenie hosťa ${current.personName}?`) && remove.mutate()}>
            <Trash2 className="size-4" aria-hidden />
            Zmazať
          </Button>
        )}
      </div>
    </form>
  )
}
