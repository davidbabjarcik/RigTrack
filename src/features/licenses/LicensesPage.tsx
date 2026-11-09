import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppWindow, ArrowLeft, Copy, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { formatDate, formatMoney, todayIso } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { VALIDITY_CLASS, validity } from '@/lib/validity'
import { deleteLicense, licenseKeys, saveLicense, useLicenseKeys, useLicenses, type License, type LicenseFields } from './api'

const EMPTY: LicenseFields = { name: '', edition: '', seats: 1, account: '', purchasedOn: null, expiresOn: null, price: null, equipmentId: null, note: '', licenseKey: '' }

type Computer = { id: string; name: string }

function LicenseForm({ companyId, current, currentKey, canKeys, computers, onDone }: { companyId: string; current: License | null; currentKey: string; canKeys: boolean; computers: Computer[]; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [fields, setFields] = useState<LicenseFields>(current ? { ...current, licenseKey: currentKey } : EMPTY)
  const [price, setPrice] = useState(current?.price === null || current?.price === undefined ? '' : String(current.price).replace('.', ','))
  const priceValue = price.trim() === '' ? null : Number(price.replace(',', '.'))
  const datesOk = !fields.purchasedOn || !fields.expiresOn || fields.expiresOn >= fields.purchasedOn
  const valid = fields.name.trim() !== '' && Number.isInteger(fields.seats) && fields.seats >= 1 && fields.seats <= 9999 && (priceValue === null || (Number.isFinite(priceValue) && priceValue >= 0)) && datesOk
  const save = useMutation({
    mutationFn: () => saveLicense(companyId, current?.id ?? null, { ...fields, price: priceValue }, canKeys),
    onSuccess: onDone,
    onSettled: () => queryClient.invalidateQueries({ queryKey: licenseKeys.list(companyId) }),
  })
  const set = (patch: Partial<LicenseFields>) => setFields((value) => ({ ...value, ...patch }))
  function submit(event: FormEvent) {
    event.preventDefault()
    if (valid) save.mutate()
  }
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2">
      <Field label={tx('Program *')} autoFocus placeholder={tx('napr. program na mix, vizualizácia svetiel')} maxLength={120} value={fields.name} onChange={(e) => set({ name: e.target.value })} />
      <Field label={tx('Edícia alebo verzia')} placeholder={tx('napr. Pro, verzia 12')} maxLength={80} value={fields.edition} onChange={(e) => set({ edition: e.target.value })} />
      <Field label={tx('Počet inštalácií')} type="number" inputMode="numeric" min={1} max={9999} step={1} value={Number.isNaN(fields.seats) ? '' : fields.seats} onChange={(e) => set({ seats: e.target.valueAsNumber })} />
      <Field label={tx('Účet (na koho je kúpená)')} placeholder={tx('napr. e-mail firmy')} maxLength={200} value={fields.account} onChange={(e) => set({ account: e.target.value })} />
      <Field label={tx('Kúpená')} type="date" value={fields.purchasedOn ?? ''} onChange={(e) => set({ purchasedOn: e.target.value || null })} />
      <Field
        label={tx('Platí do (prázdne = trvalá)')}
        type="date"
        value={fields.expiresOn ?? ''}
        error={datesOk ? undefined : tx('Platnosť nemôže skončiť pred kúpou.')}
        onChange={(e) => set({ expiresOn: e.target.value || null })}
      />
      <Field label={tx('Cena (€)')} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
      <SelectField label={tx('Na počítači (z techniky)')} value={fields.equipmentId ?? ''} onChange={(e) => set({ equipmentId: e.target.value || null })}>
        <option value="">{tx('— žiadny —')}</option>
        {computers.map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </SelectField>
      {canKeys && (
        <Field label={tx('Licenčný kľúč')} className="sm:col-span-2" autoComplete="off" spellCheck={false} maxLength={1000} value={fields.licenseKey} onChange={(e) => set({ licenseKey: e.target.value })} />
      )}
      <Field label={tx('Poznámka')} className="sm:col-span-2" maxLength={1000} value={fields.note} onChange={(e) => set({ note: e.target.value })} />
      {save.isError && <p role="alert" className="text-sm text-destructive sm:col-span-2">{tx('Uloženie zlyhalo. Skúste to znova.')}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={!valid || save.isPending}>
          {current ? tx('Uložiť') : tx('Pridať licenciu')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>{tx('Zrušiť')}</Button>
      </div>
    </form>
  )
}

function KeyLine({ value }: { value: string }) {
  const [shown, setShown] = useState(false)
  const [copied, setCopied] = useState(false)
  return (
    <span className="mt-1 flex flex-wrap items-center gap-2 text-sm">
      <span className="font-mono break-all">{shown ? value : '••••••••••••'}</span>
      <Button variant="ghost" size="sm" aria-label={shown ? tx('Skryť kľúč') : tx('Ukázať kľúč')} onClick={() => setShown(!shown)}>
        {shown ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </Button>
      <Button variant="ghost" size="sm" aria-label={tx('Kopírovať kľúč')} onClick={() => void navigator.clipboard?.writeText(value).then(() => setCopied(true))}>
        <Copy className="size-4" aria-hidden />
        {copied && <span className="text-xs">{tx('Skopírované')}</span>}
      </Button>
    </span>
  )
}

function validityText(expiresOn: string | null, today: string) {
  const state = validity(expiresOn, today)
  if (state === 'none') return tx('trvalá')
  if (state === 'expired') return tf('skončila {0}', formatDate(expiresOn!))
  if (state === 'soon') return tf('končí {0}', formatDate(expiresOn!))
  return tf('platí do {0}', formatDate(expiresOn!))
}

/** Licencie kúpených programov: koľko inštalácií, na koho účet, dokedy platí, na ktorom počítači. Kľúč vidí len ten, kto upravuje techniku. */
export function LicensesPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const canEdit = can(company, 'equipment.edit')
  const queryClient = useQueryClient()
  const licenses = useLicenses(companyId)
  const keys = useLicenseKeys(companyId, canEdit)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const [editing, setEditing] = useState<string | null>(null)
  const remove = useMutation({
    mutationFn: deleteLicense,
    onSettled: () => queryClient.invalidateQueries({ queryKey: licenseKeys.list(companyId) }),
  })
  const today = todayIso()
  const computers: Computer[] = (equipment.data ?? []).map((item) => ({ id: item.id, name: item.name })).sort((a, b) => a.name.localeCompare(b.name, 'sk'))
  const computerName = new Map(computers.map((item) => [item.id, item.name]))
  const keyOf = (id: string) => keys.data?.get(id) ?? ''
  const ending = (licenses.data ?? []).filter((license) => ['soon', 'expired'].includes(validity(license.expiresOn, today)))

  return (
    <>
      <Link to="/equipment" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />{tx('Technika')}</Link>
      <PageHeader
        title={tx('Licencie programov')}
        description={tx('Aké programy máme kúpené, koľko inštalácií, na koho účet a dokedy platia.')}
        action={
          canEdit &&
          editing === null && (
            <Button onClick={() => setEditing('new')}>
              <Plus className="size-4" aria-hidden />{tx('Pridať')}</Button>
          )
        }
      />
      {editing === 'new' && (
        <div className="mb-4">
          <LicenseForm companyId={companyId} current={null} currentKey="" canKeys={canEdit} computers={computers} onDone={() => setEditing(null)} />
        </div>
      )}
      {ending.length > 0 && (
        <p role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {tf('Treba predĺžiť: {0}', ending.map((license) => license.name).join(', '))}
        </p>
      )}
      {licenses.isPending ? (
        <LoadingBlock />
      ) : licenses.isError ? (
        <ErrorBlock message={tx('Licencie sa nepodarilo načítať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.')} onRetry={() => void licenses.refetch()} />
      ) : licenses.data.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-12 text-center">
          <p className="font-medium">{tx('Zatiaľ žiadne licencie')}</p>
          {canEdit && <p className="mt-1 text-sm text-muted-foreground">{tx('Pridajte programy, ktoré máte kúpené – napr. na mix, svetlá alebo strih videa.')}</p>}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {licenses.data.map((license) =>
            editing === license.id ? (
              <li key={license.id}>
                <LicenseForm companyId={companyId} current={license} currentKey={keyOf(license.id)} canKeys={canEdit} computers={computers} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={license.id} className="flex items-start gap-3 rounded-xl border bg-surface px-4 py-3">
                <AppWindow className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium break-words">{[license.name, license.edition].filter(Boolean).join(' · ')}</span>
                  <span className="block text-sm text-muted-foreground">
                    {[
                      tf('{0} inštal.', license.seats),
                      license.account,
                      license.purchasedOn && tf('kúpená {0}', formatDate(license.purchasedOn)),
                      license.price !== null && formatMoney(license.price, 'EUR'),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  <span className={cn('block text-sm', VALIDITY_CLASS[validity(license.expiresOn, today)])}>{validityText(license.expiresOn, today)}</span>
                  {license.equipmentId && computerName.get(license.equipmentId) && (
                    <Link to={`/equipment/${license.equipmentId}`} className="block text-sm text-accent hover:underline">
                      {tf('na počítači {0}', computerName.get(license.equipmentId)!)}
                    </Link>
                  )}
                  {license.note && <span className="block text-sm text-muted-foreground break-words">{license.note}</span>}
                  {canEdit && keyOf(license.id) && <KeyLine value={keyOf(license.id)} />}
                </span>
                {canEdit && (
                  <>
                    <Button variant="ghost" size="sm" disabled={!keys.isSuccess} aria-label={tf('Upraviť {0}', license.name)} onClick={() => setEditing(license.id)}>
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={tf('Odstrániť {0}', license.name)}
                      disabled={remove.isPending}
                      onClick={() => window.confirm(tf('Odstrániť licenciu {0}?', license.name)) && remove.mutate(license.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </>
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </>
  )
}
