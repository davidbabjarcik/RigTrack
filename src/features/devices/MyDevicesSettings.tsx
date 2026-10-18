import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Laptop, Plus, Smartphone, Tablet, Trash2, Wifi, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { deleteDevice, deviceKeys, isDuplicateMac, saveDevice, useDevices } from './api'
import { DEVICE_KIND_LABELS, DEVICE_KINDS, deviceSchema, isRandomMac, type DeviceFormInput, type DeviceFormValues, type DeviceKind, type MemberDevice } from './model'

const DEVICE_ICONS: Record<DeviceKind, LucideIcon> = { phone: Smartphone, laptop: Laptop, tablet: Tablet, other: Wifi }

function DeviceForm({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeviceFormInput, unknown, DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: { kind: 'phone', name: '', mac: '', note: '' },
  })
  const save = useMutation({
    mutationFn: (values: DeviceFormValues) => saveDevice(companyId, null, values),
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
        <Field label="MAC adresa" placeholder="AA:BB:CC:DD:EE:FF" autoComplete="off" autoCapitalize="characters" error={errors.mac?.message} {...register('mac')} />
      </div>
      <Field label="Poznámka" placeholder="nepovinné" error={errors.note?.message} {...register('note')} />
      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          {isDuplicateMac(save.error) ? 'Toto zariadenie (MAC) už vo firme niekto zapísal.' : 'Nepodarilo sa uložiť. Ak ste ešte nespustili migráciu 0051, urobte to.'}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={save.isPending}>
          {save.isPending ? 'Ukladám…' : 'Pridať zariadenie'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Zrušiť
        </Button>
      </div>
    </form>
  )
}

/** Riadok zariadenia (aj v sieťovej tabuľke). */
export function DeviceRow({ device, owner, onDelete, deleting }: { device: MemberDevice; owner?: string; onDelete?: () => void; deleting?: boolean }) {
  const Icon = DEVICE_ICONS[device.kind]
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{device.name}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {[owner, DEVICE_KIND_LABELS[device.kind], device.note].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="shrink-0 text-right font-mono text-sm">
        {device.mac}
        {isRandomMac(device.mac) && <span className="block font-sans text-xs text-amber-700 dark:text-amber-300">súkromná (náhodná) adresa</span>}
      </span>
      {onDelete && (
        <Button variant="ghost" size="sm" aria-label={`Odstrániť ${device.name}`} disabled={deleting} onClick={onDelete}>
          <Trash2 className="size-4" aria-hidden />
        </Button>
      )}
    </li>
  )
}

/** Moje zariadenia (mobil, notebook, iPad) s MAC adresou, napr. na povolenie v sieti na akciách. */
export function MyDevicesSettings({ companyId, userId }: { companyId: string; userId: string }) {
  const queryClient = useQueryClient()
  const devices = useDevices(companyId)
  const [adding, setAdding] = useState(false)
  const remove = useMutation({
    mutationFn: (id: string) => deleteDevice(companyId, id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: deviceKeys.list(companyId) }),
  })
  const mine = (devices.data ?? []).filter((device) => device.userId === userId)

  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="text-sm text-muted-foreground">
        Zapíšte svoje mobily, notebooky a tablety s MAC adresou (Wi-Fi). Uvidí ich len admin a skladník, napr. keď treba zariadenia povoliť v
        sieti na akcii.
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
      {devices.isError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          Zariadenia sa nepodarilo načítať. Ak ste ešte nespustili migráciu 0051, urobte to.
        </p>
      )}
      {mine.length > 0 && (
        <ul className="mt-3 divide-y overflow-hidden rounded-lg border">
          {mine.map((device) => (
            <DeviceRow
              key={device.id}
              device={device}
              deleting={remove.isPending}
              onDelete={() => {
                if (window.confirm(`Odstrániť zariadenie ${device.name}?`)) remove.mutate(device.id)
              }}
            />
          ))}
        </ul>
      )}
      {adding ? (
        <DeviceForm companyId={companyId} onDone={() => setAdding(false)} />
      ) : (
        <Button variant="outline" size="sm" className="mt-3" disabled={devices.isError} onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden />
          Pridať zariadenie
        </Button>
      )}
    </div>
  )
}
