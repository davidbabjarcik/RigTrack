import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Laptop, Pencil, Plus, Smartphone, Tablet, Trash2, Wifi, X, type LucideIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useNetworks } from '@/features/networks/api'
import { deleteDevice, deviceKeys, isDuplicateMac, saveDevice, useDevices } from './api'
import { DEVICE_KIND_LABELS, DEVICE_KINDS, deviceSchema, isRandomMac, type DeviceFormInput, type DeviceFormValues, type DeviceKind, type MemberDevice } from './model'

const DEVICE_ICONS: Record<DeviceKind, LucideIcon> = { phone: Smartphone, laptop: Laptop, tablet: Tablet, other: Wifi }

function DeviceForm({ companyId, userId, current, onDone }: { companyId: string; userId: string; current: MemberDevice | null; onDone: () => void }) {
  const queryClient = useQueryClient()
  const ssidListId = useId()
  const companyNetworks = useNetworks(companyId)
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DeviceFormInput, unknown, DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: current
      ? { kind: current.kind, name: current.name, mac: current.mac, ethernetMac: current.ethernetMac, note: current.note, networks: current.networks }
      : { kind: 'phone', name: '', mac: '', ethernetMac: '', note: '', networks: [] },
  })
  const networks = useFieldArray({ control, name: 'networks' })
  const save = useMutation({
    mutationFn: (values: DeviceFormValues) => saveDevice(companyId, current?.id ?? null, values, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: deviceKeys.list(companyId) })
      onDone()
    },
  })
  return (
    <form onSubmit={handleSubmit((values) => save.mutate(values))} className="mt-3 flex flex-col gap-3 rounded-lg border p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField label="Druh" {...register('kind')}>
          {DEVICE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {DEVICE_KIND_LABELS[kind]}
            </option>
          ))}
        </SelectField>
        <Field label="Názov" placeholder="napr. iPhone 15, MacBook" error={errors.name?.message} {...register('name')} />
        <Field label="MAC Wi-Fi" placeholder="AA:BB:CC:DD:EE:FF" autoComplete="off" autoCapitalize="characters" error={errors.mac?.message} {...register('mac')} />
      </div>
      <Field
        label="MAC ethernet / LAN (nepovinné)"
        placeholder="napr. notebook s káblom"
        autoComplete="off"
        autoCapitalize="characters"
        className="sm:w-1/2"
        error={errors.ethernetMac?.message}
        {...register('ethernetMac')}
      />
      <Field label="Poznámka" placeholder="nepovinné" error={errors.note?.message} {...register('note')} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Wi-Fi siete (IP adresa a MAC v danej sieti)</legend>
        {networks.fields.map((field, index) => (
          <div key={field.id} className="grid items-start gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
            <Field label="Sieť (SSID / názov)" list={ssidListId} autoComplete="off" error={errors.networks?.[index]?.ssid?.message} {...register(`networks.${index}.ssid`)} />
            <Field label="IP adresa (pevná)" placeholder="prázdne pri DHCP" inputMode="decimal" autoComplete="off" error={errors.networks?.[index]?.ip?.message} {...register(`networks.${index}.ip`)} />
            <Field
              label="MAC v tejto sieti"
              placeholder="ak je iná (súkromná)"
              autoComplete="off"
              autoCapitalize="characters"
              error={errors.networks?.[index]?.mac?.message}
              {...register(`networks.${index}.mac`)}
            />
            <span className="flex flex-col gap-1 text-sm sm:mt-6">
              <select aria-label="Pripojenie" className="h-9 rounded-lg border bg-surface px-2" {...register(`networks.${index}.via`)}>
                <option value="wifi">Wi-Fi</option>
                <option value="ethernet">Kábel (LAN)</option>
              </select>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="size-4" {...register(`networks.${index}.dhcp`)} />
                DHCP
              </label>
            </span>
            <Button variant="ghost" size="sm" className="sm:mt-7" aria-label="Odobrať sieť" onClick={() => networks.remove(index)}>
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
        <datalist id={ssidListId}>
          {(companyNetworks.data ?? []).map((network) => (
            <option key={network.id} value={network.ssid} />
          ))}
        </datalist>
        <Button variant="outline" size="sm" className="self-start" disabled={networks.fields.length >= 20} onClick={() => networks.append({ ssid: '', ip: '', mac: '', dhcp: false, via: 'wifi' })}>
          <Plus className="size-4" aria-hidden />
          Pridať Wi-Fi sieť
        </Button>
      </fieldset>

      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          {isDuplicateMac(save.error) ? 'Toto zariadenie (MAC) už vo firme niekto zapísal.' : 'Nepodarilo sa uložiť. Ak ste ešte nespustili migrácie 0051 a 0052, urobte to.'}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={save.isPending}>
          {save.isPending ? 'Ukladám…' : current ? 'Uložiť' : 'Pridať zariadenie'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Zrušiť
        </Button>
      </div>
    </form>
  )
}

/** Riadok zariadenia (aj v sieťovej tabuľke). */
export function DeviceRow({
  device,
  owner,
  onEdit,
  onDelete,
  deleting,
}: {
  device: MemberDevice
  owner?: string
  onEdit?: () => void
  onDelete?: () => void
  deleting?: boolean
}) {
  const Icon = DEVICE_ICONS[device.kind]
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{device.name}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {[owner, DEVICE_KIND_LABELS[device.kind], device.note].filter(Boolean).join(' · ')}
        </span>
        {device.networks.map((network, index) => (
          <span key={index} className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
            <Wifi className="size-3.5" aria-hidden />
            <span className="font-medium text-foreground">{network.ssid}</span>
            {network.ip ? <span className="font-mono">{network.ip}</span> : network.dhcp && <span>DHCP</span>}
            {network.via === 'ethernet' && <span>kábel</span>}
            {network.mac && network.mac !== device.mac && <span className="font-mono">{network.mac}</span>}
          </span>
        ))}
      </span>
      <span className="shrink-0 text-right font-mono text-sm">
        {device.mac}
        {device.ethernetMac && <span className="block text-xs text-muted-foreground">LAN {device.ethernetMac}</span>}
        {isRandomMac(device.mac) && <span className="block font-sans text-xs text-amber-700 dark:text-amber-300">súkromná (náhodná) adresa</span>}
      </span>
      {onEdit && (
        <Button variant="ghost" size="sm" aria-label={`Upraviť ${device.name}`} onClick={onEdit}>
          <Pencil className="size-4" aria-hidden />
        </Button>
      )}
      {onDelete && (
        <Button variant="ghost" size="sm" aria-label={`Odstrániť ${device.name}`} disabled={deleting} onClick={onDelete}>
          <Trash2 className="size-4" aria-hidden />
        </Button>
      )}
    </li>
  )
}

/** Zariadenia jedného člena so zoznamom a pridaním (v Nastaveniach svoje, v karte zamestnanca jeho). */
export function DeviceList({ companyId, userId, canEdit, empty }: { companyId: string; userId: string; canEdit: boolean; empty?: string }) {
  const queryClient = useQueryClient()
  const devices = useDevices(companyId)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const remove = useMutation({
    mutationFn: (id: string) => deleteDevice(companyId, id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: deviceKeys.list(companyId) }),
  })
  const mine = (devices.data ?? []).filter((device) => device.userId === userId)
  return (
    <>
      {devices.isError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          Zariadenia sa nepodarilo načítať. Ak ste ešte nespustili migráciu 0051, urobte to.
        </p>
      )}
      {mine.length > 0 ? (
        <ul className="mt-3 divide-y overflow-hidden rounded-lg border bg-surface">
          {mine.map((device) =>
            editing === device.id ? (
              <li key={device.id} className="p-2">
                <DeviceForm companyId={companyId} userId={userId} current={device} onDone={() => setEditing(null)} />
              </li>
            ) : (
            <DeviceRow
              key={device.id}
              device={device}
              onEdit={canEdit ? () => setEditing(device.id) : undefined}
              deleting={remove.isPending}
              onDelete={
                canEdit
                  ? () => {
                      if (window.confirm(`Odstrániť zariadenie ${device.name}?`)) remove.mutate(device.id)
                    }
                  : undefined
              }
            />
            ),
          )}
        </ul>
      ) : (
        devices.isSuccess && empty && <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      )}
      {canEdit &&
        (editing === 'new' ? (
          <DeviceForm companyId={companyId} userId={userId} current={null} onDone={() => setEditing(null)} />
        ) : (
          <Button variant="outline" size="sm" className="mt-3" disabled={devices.isError} onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden />
            Pridať zariadenie
          </Button>
        ))}
    </>
  )
}

/** Moje zariadenia (mobil, notebook, iPad) s MAC adresou, napr. na povolenie v sieti na akciách. */
export function MyDevicesSettings({ companyId, userId }: { companyId: string; userId: string }) {
  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="text-sm text-muted-foreground">
        Zapíšte svoje mobily, notebooky a tablety s MAC adresou a pri každej Wi-Fi sieti aj IP adresu. Nie je to technika firmy – uvidí ich len
        admin a skladník (v Sieťach a vo vašej karte zamestnanca), napr. keď treba zariadenia povoliť v sieti na akcii.
      </p>
      <details className="mt-2 text-sm text-muted-foreground">
        <summary className="cursor-pointer text-accent">Kde nájdem MAC adresu?</summary>
        <ul className="mt-1 list-disc pl-5">
          <li>iPhone / iPad: Nastavenia → Všeobecné → Informácie → Adresa Wi-Fi.</li>
          <li>Android: Nastavenia → Informácie o telefóne → Stav (alebo Wi-Fi → sieť → Rozšírené).</li>
          <li>Windows: Nastavenia → Sieť → Wi-Fi → Vlastnosti hardvéru → Fyzická adresa (MAC).</li>
          <li>Mac: Systémové nastavenia → Wi-Fi → Podrobnosti → Hardvér → Adresa MAC.</li>
          <li>Mobily používajú pre každú Wi-Fi „súkromnú adresu“. Pre firemnú sieť ju vypnite, inak sa MAC mení.</li>
        </ul>
      </details>
      <DeviceList companyId={companyId} userId={userId} canEdit />
    </div>
  )
}
