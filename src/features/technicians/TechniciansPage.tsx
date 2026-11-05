import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { ServiceTabs } from '@/components/layout/ModuleTabs'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { can } from '@/lib/permissions'
import { TechnicianCard } from './TechnicianCard'
import { deleteTechnician, saveTechnician, technicianKeys, useTechnicians } from './api'
import {
  matchesTechnician,
  SCOPE_LABELS,
  servesFor,
  sortTechnicians,
  TECHNICIAN_SCOPES,
  technicianSchema,
  type Technician,
  type TechnicianFormValues,
  type TechnicianScope,
} from './model'
import { tx, tf } from '@/lib/i18n'

function TechnicianForm({ companyId, current, onDone }: { companyId: string; current: Technician | null; onDone: () => void }) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TechnicianFormValues>({
    resolver: zodResolver(technicianSchema),
    defaultValues: {
      name: current?.name ?? '',
      firm: current?.firm ?? '',
      phone: current?.phone ?? '',
      email: current?.email ?? '',
      address: current?.address ?? '',
      scope: current?.scope ?? 'both',
      specialization: current?.specialization ?? '',
      note: current?.note ?? '',
    },
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: technicianKeys.list(companyId) })
  const save = useMutation({ mutationFn: (values: TechnicianFormValues) => saveTechnician(companyId, current?.id ?? null, values), onSuccess: async () => (await refresh(), onDone()) })
  const remove = useMutation({ mutationFn: () => deleteTechnician(companyId, current!.id), onSuccess: async () => (await refresh(), onDone()) })

  return (
    <form onSubmit={handleSubmit((values) => save.mutate(values))} className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tx('Meno *')} autoFocus error={errors.name?.message} {...register('name')} />
        <Field label={tx('Firma / servis')} placeholder={tx('napr. AV Servis s.r.o.')} error={errors.firm?.message} {...register('firm')} />
        <Field label={tx('Telefón')} type="tel" error={errors.phone?.message} {...register('phone')} />
        <Field label={tx('E-mail')} type="email" error={errors.email?.message} {...register('email')} />
        <SelectField label={tx('Servisuje')} error={errors.scope?.message} {...register('scope')}>
          {TECHNICIAN_SCOPES.map((scope) => (
            <option key={scope} value={scope}>
              {tx(SCOPE_LABELS[scope])}
            </option>
          ))}
        </SelectField>
        <Field label={tx('Na čo je')} placeholder={tx('napr. Yamaha mixy, Robe svetlá / Ford Transit')} error={errors.specialization?.message} {...register('specialization')} />
        <Field label={tx('Adresa')} className="sm:col-span-2" error={errors.address?.message} {...register('address')} />
      </div>
      <TextareaField label={tx('Poznámka')} rows={2} error={errors.note?.message} {...register('note')} />
      {(save.isError || remove.isError) && (
        <p role="alert" className="text-sm text-destructive">{tx('Nepodarilo sa uložiť. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.')}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={save.isPending}>
          {save.isPending ? tx('Ukladám…') : current ? tx('Uložiť') : tx('Pridať technika')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>{tx('Zrušiť')}</Button>
        {current && (
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(tf('Odstrániť technika {0}? Pri servisných záznamoch a autách sa odkaz len zruší.', current.name))) remove.mutate()
            }}
          >
            <Trash2 className="size-4" aria-hidden />{tx('Odstrániť')}</Button>
        )}
      </div>
    </form>
  )
}

/** Adresár servisných technikov pre techniku a autá. */
export function TechniciansPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const canEdit = can(company, 'service.edit') || can(company, 'vehicles.edit')
  const technicians = useTechnicians(companyId)
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<TechnicianScope | ''>('')
  const [editing, setEditing] = useState<string | 'new' | null>(null)

  if (!can(company, 'service.view') && !can(company, 'vehicles.view')) return <ErrorBlock message={tx('Na servisných technikov nemáte oprávnenie.')} />
  if (technicians.isPending) return <LoadingBlock />
  if (technicians.isError) return <ErrorBlock message={tx('Technikov sa nepodarilo načítať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.')} onRetry={() => void technicians.refetch()} />

  const visible = sortTechnicians(technicians.data).filter(
    (technician) => matchesTechnician(technician, search) && (!scope || scope === 'both' ? true : servesFor(technician, scope)),
  )

  return (
    <>
      <ServiceTabs />
      <PageHeader
        title={tx('Servisní technici')}
        description={tx('Kto opravuje techniku a autá')}
        action={
          canEdit && editing !== 'new' ? (
            <Button onClick={() => setEditing('new')}>
              <Plus className="size-4" aria-hidden />{tx('Pridať technika')}</Button>
          ) : undefined
        }
      />

      {editing === 'new' && (
        <div className="mb-4">
          <TechnicianForm companyId={companyId} current={null} onDone={() => setEditing(null)} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" aria-hidden />
          <Field
            label={tx('Hľadať')}
            hideLabel
            type="search"
            placeholder={tx('Meno, firma, značka, telefón')}
            className="[&_input]:pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <SelectField label={tx('Servisuje')} hideLabel className="w-48" value={scope} onChange={(event) => setScope(event.target.value as TechnicianScope | '')}>
          <option value="">{tx('Všetci')}</option>
          <option value="equipment">{tx('Na techniku')}</option>
          <option value="vehicles">{tx('Na autá')}</option>
        </SelectField>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-8 text-center text-sm text-muted-foreground">
          {technicians.data.length === 0 ? tx('Zatiaľ žiadni technici. Pridajte servis, kam nosíte techniku alebo autá.') : tx('Nikto nezodpovedá hľadaniu.')}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((technician) => (
            <li key={technician.id}>
              {editing === technician.id ? (
                <TechnicianForm companyId={companyId} current={technician} onDone={() => setEditing(null)} />
              ) : (
                <TechnicianCard
                  technician={technician}
                  actions={
                    canEdit && (
                      <Button variant="ghost" size="sm" aria-label={tf('Upraviť {0}', technician.name)} onClick={() => setEditing(technician.id)}>
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                    )
                  }
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
