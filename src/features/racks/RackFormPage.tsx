import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { caseTitle } from '@/features/cases/model'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { useEvents } from '@/features/events/useEvents'
import { formatDate, todayIso } from '@/lib/format'
import { tx } from '@/lib/i18n'
import { createRack, fetchRacks, rackKeys, updateRack } from './api'
import { EMPTY_RACK, rackFields, RACK_RAIL_LABELS, RACK_RAILS, RACK_TYPE_LABELS, RACK_TYPES, type RackFields } from './model'

const numberOrNull = (value: string) => (value.trim() === '' ? null : Number(value.replace(',', '.')))

function RackForm({ companyId, id, start }: { companyId: string; id: string | null; start: RackFields }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const cases = useCases(companyId)
  const events = useEvents(companyId)
  const [fields, setFields] = useState(start)
  const [problem, setProblem] = useState('')
  const set = (patch: Partial<RackFields>) => setFields((current) => ({ ...current, ...patch }))
  const save = useMutation({
    mutationFn: () => (id ? updateRack(companyId, id, fields).then(() => id) : createRack(companyId, fields)),
    onSuccess: async (savedId) => {
      await queryClient.invalidateQueries({ queryKey: rackKeys.list(companyId) })
      navigate(`/racks/${savedId}`)
    },
  })
  const racksInStock = (cases.data ?? []).filter((item) => item.kind === 'rack')
  const today = todayIso()
  const events_ = (events.data ?? []).filter((item) => item.endsOn >= today || item.id === fields.eventId).sort((a, b) => a.startsOn.localeCompare(b.startsOn))

  function submit(event: FormEvent) {
    event.preventDefault()
    const bad =
      !fields.name.trim()
        ? tx('Zadajte názov racku.')
        : !Number.isInteger(fields.units) || fields.units < 2 || fields.units > 48
          ? tx('Výška racku je 2 až 48 U.')
          : fields.depthMm !== null && (!Number.isFinite(fields.depthMm) || fields.depthMm < 100 || fields.depthMm > 1500)
            ? tx('Hĺbka je 100 až 1500 mm.')
            : [fields.maxLoadKg, fields.ownWeightKg].some((value) => value !== null && (!Number.isFinite(value) || value < 0 || value >= 10000))
              ? tx('Hmotnosť zadajte v kg (0 až 9999).')
              : ''
    setProblem(bad)
    if (!bad) save.mutate()
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 rounded-xl border bg-surface p-4 sm:grid-cols-2">
      <Field label={tx('Názov *')} className="sm:col-span-2" maxLength={120} placeholder={tx('napr. FOH rack, Amp rack 4× zosilňovač')} value={fields.name} onChange={(e) => set({ name: e.target.value })} />
      <SelectField label={tx('Typ')} value={fields.rackType} onChange={(e) => set({ rackType: e.target.value as RackFields['rackType'] })}>
        {RACK_TYPES.map((type) => (
          <option key={type} value={type}>
            {tx(RACK_TYPE_LABELS[type])}
          </option>
        ))}
      </SelectField>
      <Field label={tx('Výška (U) *')} type="number" inputMode="numeric" min={2} max={48} value={Number.isFinite(fields.units) ? fields.units : ''} onChange={(e) => set({ units: e.target.valueAsNumber })} />
      <Field label={tx('Použiteľná hĺbka (mm)')} type="number" inputMode="numeric" min={100} max={1500} value={fields.depthMm ?? ''} onChange={(e) => set({ depthMm: numberOrNull(e.target.value) })} />
      <SelectField label={tx('Lišty')} value={fields.rails} onChange={(e) => set({ rails: e.target.value as RackFields['rails'] })}>
        {RACK_RAILS.map((rails) => (
          <option key={rails} value={rails}>
            {tx(RACK_RAIL_LABELS[rails])}
          </option>
        ))}
      </SelectField>
      <Field label={tx('Max. nosnosť (kg)')} type="number" inputMode="decimal" min={0} step="0.1" value={fields.maxLoadKg ?? ''} onChange={(e) => set({ maxLoadKg: numberOrNull(e.target.value) })} />
      <Field label={tx('Vlastná hmotnosť racku (kg)')} type="number" inputMode="decimal" min={0} step="0.1" value={fields.ownWeightKg ?? ''} onChange={(e) => set({ ownWeightKg: numberOrNull(e.target.value) })} />
      <SelectField label={tx('Fyzický rack zo skladu (nepovinné)')} value={fields.caseId ?? ''} onChange={(e) => set({ caseId: e.target.value || null })}>
        <option value="">{tx('— bez väzby —')}</option>
        {racksInStock.map((item) => (
          <option key={item.id} value={item.id}>
            {caseTitle(item)}
            {item.rackUnits ? ` (${item.rackUnits} U)` : ''}
          </option>
        ))}
      </SelectField>
      <SelectField label={tx('Akcia (nepovinné)')} value={fields.eventId ?? ''} onChange={(e) => set({ eventId: e.target.value || null })}>
        <option value="">{tx('— bez akcie —')}</option>
        {events_.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} ({formatDate(item.startsOn)})
          </option>
        ))}
      </SelectField>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" className="size-4" checked={fields.isTemplate} onChange={(e) => set({ isTemplate: e.target.checked })} />
        {tx('Šablóna (napr. „FOH rack“ – dá sa neskôr vložiť do akcie)')}
      </label>
      <TextareaField label={tx('Poznámka')} className="sm:col-span-2" rows={3} maxLength={2000} value={fields.note} onChange={(e) => set({ note: e.target.value })} />
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" disabled={save.isPending}>{save.isPending ? tx('Ukladám…') : tx('Uložiť')}</Button>
        <Link to={id ? `/racks/${id}` : '/racks'} className="inline-flex h-11 items-center rounded-lg px-4 text-sm font-medium hover:bg-muted">{tx('Zrušiť')}</Link>
      </div>
      {(problem || save.isError) && <p role="alert" className="text-sm text-destructive sm:col-span-2">{problem || tx('Rack sa nepodarilo uložiť.')}</p>}
    </form>
  )
}

/** Nový rack (/racks/new) alebo úprava jeho údajov (/racks/:id/edit). Osadenie sa upravuje v editore racku. */
export function RackFormPage() {
  const { id } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const racks = useQuery({ queryKey: rackKeys.list(companyId), queryFn: () => fetchRacks(companyId), enabled: Boolean(id) })
  const current = id ? racks.data?.find((rack) => rack.id === id) : undefined

  let body
  if (id && racks.isPending) body = <LoadingBlock />
  else if (id && (racks.isError || !current)) body = <ErrorBlock message={tx('Tento rack neexistuje alebo k nemu nemáte prístup.')} />
  else {
    body = <RackForm key={id ?? 'new'} companyId={companyId} id={id ?? null} start={current ? rackFields(current) : EMPTY_RACK} />
  }
  return (
    <>
      <Link to={id ? `/racks/${id}` : '/racks'} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {id ? tx('Späť na rack') : tx('Racky')}
      </Link>
      <PageHeader title={id ? tx('Upraviť rack') : tx('Nový rack')} />
      {body}
    </>
  )
}
