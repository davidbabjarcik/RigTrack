import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import type { Equipment } from '@/features/equipment/model'
import { useCompany } from '@/features/companies/company-context'
import { can } from '@/lib/permissions'
import { deleteNetwork, networkKeys, saveNetwork } from './api'
import { parseWifiQr, SECURITY_LABELS, WIFI_SECURITIES, wifiSchema, type RouterLogin, type WifiFormValues, type WifiNetwork } from './model'
import { QrScanButton } from './QrScanButton'

type Props = {
  companyId: string
  current: WifiNetwork | null
  login: RouterLogin | undefined
  equipment: Equipment[]
  onDone: () => void
}

/** Pridanie a úprava Wi-Fi siete; údaje siete sa dajú načítať aj z QR kódu. */
export function WifiForm({ companyId, current, login, equipment, onDone }: Props) {
  const queryClient = useQueryClient()
  const [scanError, setScanError] = useState(false)
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<WifiFormValues>({
    resolver: zodResolver(wifiSchema),
    defaultValues: {
      ssid: current?.ssid ?? '',
      password: current?.password ?? '',
      security: current?.security ?? 'WPA',
      hidden: current?.hidden ?? false,
      subnet: current?.subnet ?? '',
      routerIp: current?.routerIp ?? '',
      managementIp: current?.managementIp ?? '',
      routerModel: current?.routerModel ?? '',
      dhcp: current?.dhcp ?? true,
      dhcpStart: current?.dhcpStart ?? '',
      dhcpEnd: current?.dhcpEnd ?? '',
      loginUser: login?.username ?? '',
      loginPassword: login?.password ?? '',
      equipmentId: current?.equipmentId ?? '',
      scope: current?.scope ?? 'equipment',
      keepPassword: Boolean(current?.passwordHidden),
      place: current?.place ?? '',
      note: current?.note ?? '',
    },
  })
  const dhcp = useWatch({ control, name: 'dhcp' })
  // Prihlásenie do routera len so „Správou sietí“ (inak by ho databáza aj tak neuložila).
  const canAdmin = can(useCompany().active!, 'networks.admin')
  const scope = useWatch({ control, name: 'scope' })
  const refresh = () => queryClient.invalidateQueries({ queryKey: networkKeys.list(companyId) })
  const save = useMutation({ mutationFn: (values: WifiFormValues) => saveNetwork(companyId, current?.id ?? null, values), onSuccess: async () => (await refresh(), onDone()) })
  const remove = useMutation({ mutationFn: () => deleteNetwork(companyId, current!.id), onSuccess: async () => (await refresh(), onDone()) })
  // Do výberu techniky najprv routery, mixy a sieťové veci (s IP), potom ostatné.
  const options = [...equipment].filter((item) => item.status !== 'retired').sort((a, b) => Number(Boolean(b.ipAddress)) - Number(Boolean(a.ipAddress)) || a.name.localeCompare(b.name, 'sk'))

  return (
    <form onSubmit={handleSubmit((values) => save.mutate(values))} className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <QrScanButton
          label="Načítať z QR kódu"
          onText={(text) => {
            const wifi = parseWifiQr(text)
            setScanError(!wifi)
            if (!wifi) return
            setValue('ssid', wifi.ssid, { shouldValidate: true })
            setValue('password', wifi.password)
            setValue('security', wifi.security)
            setValue('hidden', wifi.hidden)
          }}
        />
        {scanError && <span className="text-sm text-destructive">Toto nie je QR kód Wi-Fi siete.</span>}
      </div>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-medium">Wi-Fi</legend>
        <Field label="Názov siete (SSID) *" autoComplete="off" error={errors.ssid?.message} {...register('ssid')} />
        <Field
          label="Heslo"
          autoComplete="off"
          placeholder={current?.passwordHidden ? 'heslo nevidíte – prázdne = nemeniť' : undefined}
          error={errors.password?.message}
          {...register('password')}
        />
        <SelectField label="Zabezpečenie" error={errors.security?.message} {...register('security')}>
          {WIFI_SECURITIES.map((security) => (
            <option key={security} value={security}>
              {SECURITY_LABELS[security]}
            </option>
          ))}
        </SelectField>
        <label className="flex items-center gap-2 self-end pb-3 text-sm">
          <input type="checkbox" className="size-4" {...register('hidden')} />
          Skrytá sieť (nevysiela názov)
        </label>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-medium">Router a IP adresy</legend>
        <Field label="Model routera" placeholder="napr. Ubiquiti UniFi U6, TP-Link Archer" error={errors.routerModel?.message} {...register('routerModel')} />
        <SelectField label="Čia je sieť" {...register('scope')}>
          <option value="equipment">K technike (router v racku, mix…)</option>
          <option value="company">Sieť firmy (sídlo, kancelária, sklad)</option>
        </SelectField>
        <SelectField label="Patrí k technike" className={scope === 'company' ? 'hidden' : undefined} error={errors.equipmentId?.message} {...register('equipmentId')}>
          <option value="">— nie je priradená —</option>
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.ipAddress && ` · ${item.ipAddress}`}
            </option>
          ))}
        </SelectField>
        <Field label="IP rozsah" placeholder="192.168.1.0/24" autoComplete="off" error={errors.subnet?.message} {...register('subnet')} />
        <Field label="Gateway (router)" placeholder="192.168.1.1" autoComplete="off" inputMode="decimal" error={errors.routerIp?.message} {...register('routerIp')} />
        <Field label="IP správy routera" placeholder="ak je iná ako gateway" autoComplete="off" inputMode="decimal" error={errors.managementIp?.message} {...register('managementIp')} />
        <Field label="Kde je" placeholder="napr. FOH rack, sklad, kancelária" error={errors.place?.message} {...register('place')} />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" className="size-4" {...register('dhcp')} />
          DHCP zapnuté (router prideľuje adresy sám)
        </label>
        {dhcp && (
          <>
            <Field label="DHCP od" placeholder="192.168.1.100" inputMode="decimal" autoComplete="off" error={errors.dhcpStart?.message} {...register('dhcpStart')} />
            <Field label="DHCP do" placeholder="192.168.1.199" inputMode="decimal" autoComplete="off" error={errors.dhcpEnd?.message} {...register('dhcpEnd')} />
            <p className="text-xs text-muted-foreground sm:col-span-2">Pevné IP (mix, stagebox…) dávajte mimo tohto rozsahu, inak sa môžu biť.</p>
          </>
        )}
      </fieldset>

      <fieldset className={canAdmin ? 'grid gap-3 sm:grid-cols-2' : 'hidden'}>
        <legend className="mb-1 text-sm font-medium">Prihlásenie do správy routera</legend>
        <Field label="Meno" autoComplete="off" error={errors.loginUser?.message} {...register('loginUser')} />
        <Field label="Heslo" autoComplete="off" error={errors.loginPassword?.message} {...register('loginPassword')} />
        <p className="text-xs text-muted-foreground sm:col-span-2">Kto vidí heslo Wi-Fi, IP a MAC adresy a prihlásenie do správy, nastaví admin v Nastaveniach → Oprávnenia → Siete.</p>
      </fieldset>

      <TextareaField label="Poznámka" rows={2} error={errors.note?.message} {...register('note')} />

      {(save.isError || remove.isError) && (
        <p role="alert" className="text-sm text-destructive">
          Nepodarilo sa uložiť. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={save.isPending}>
          {save.isPending ? 'Ukladám…' : current ? 'Uložiť' : 'Pridať sieť'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Zrušiť
        </Button>
        {current && (
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(`Odstrániť sieť ${current.ssid}?`)) remove.mutate()
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Odstrániť
          </Button>
        )}
      </div>
    </form>
  )
}
