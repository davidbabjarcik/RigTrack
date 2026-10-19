import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bandage, Hammer, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { fetchEvents, eventKeys } from '@/features/events/api'
import { formatDate, formatMoney, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { isAdminRole } from '@/lib/roles'
import { errorDetail } from '@/lib/supabase/errors'
import { cn } from '@/lib/utils'
import {
  deleteIncident,
  INCIDENT_KIND_LABELS,
  INCIDENT_KINDS,
  incidentKeys,
  incidentStats,
  PAID_BY,
  PAID_BY_LABELS,
  saveIncident,
  SEVERITIES,
  SEVERITY_LABELS,
  useIncidents,
  type Incident,
  type IncidentFields,
} from './api'

const EMPTY: IncidentFields = {
  kind: 'damage',
  occurredOn: todayIso(),
  memberId: null,
  personName: '',
  eventId: null,
  equipmentId: null,
  title: '',
  description: '',
  severity: 'minor',
  cost: null,
  paidBy: '',
  resolved: false,
}

function IncidentForm({ companyId, current, preset, onDone }: { companyId: string; current: Incident | null; preset: Partial<IncidentFields>; onDone: () => void }) {
  const queryClient = useQueryClient()
  const company = useCompany().active!
  const members = useMembers(companyId)
  const events = useQuery({ queryKey: eventKeys.list(companyId), queryFn: () => fetchEvents(companyId), enabled: can(company, 'events.view') })
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: can(company, 'equipment.view') })
  const [fields, setFields] = useState<IncidentFields>(current ?? { ...EMPTY, ...preset })
  const set = (patch: Partial<IncidentFields>) => setFields((value) => ({ ...value, ...patch }))
  const save = useMutation({
    mutationFn: () => saveIncident(companyId, current?.id ?? null, fields),
    onSuccess: onDone,
    onSettled: () => queryClient.invalidateQueries({ queryKey: incidentKeys.list(companyId) }),
  })
  function submit(event: FormEvent) {
    event.preventDefault()
    if (fields.title.trim()) save.mutate()
  }
  const recentEvents = (events.data ?? []).filter((event) => event.startsOn <= todayIso()).sort((a, b) => b.startsOn.localeCompare(a.startsOn)).slice(0, 60)
  return (
    <form onSubmit={submit} className="mb-4 grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2">
      <div className="flex gap-2 sm:col-span-2" role="group" aria-label="Druh">
        {INCIDENT_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={fields.kind === kind}
            onClick={() => set({ kind })}
            className={cn('h-9 rounded-lg border px-3 text-sm font-medium', fields.kind === kind ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
          >
            {INCIDENT_KIND_LABELS[kind]}
          </button>
        ))}
      </div>
      <Field label="Čo sa stalo *" className="sm:col-span-2" placeholder={fields.kind === 'injury' ? 'napr. porezaný prst pri stavbe' : 'napr. spadnutý reflektor, rozbitá šošovka'} maxLength={200} value={fields.title} onChange={(e) => set({ title: e.target.value })} />
      <SelectField label="Koho sa to týka" value={fields.memberId ?? ''} onChange={(e) => set({ memberId: e.target.value || null })}>
        <option value="">— nikoho / externista —</option>
        {(members.data ?? []).map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.fullName || member.email}
          </option>
        ))}
      </SelectField>
      {!fields.memberId && <Field label="Meno (externista)" maxLength={120} value={fields.personName} onChange={(e) => set({ personName: e.target.value })} />}
      <Field label="Kedy" type="date" value={fields.occurredOn} onChange={(e) => set({ occurredOn: e.target.value })} />
      <SelectField label="Závažnosť" value={fields.severity} onChange={(e) => set({ severity: e.target.value as IncidentFields['severity'] })}>
        {SEVERITIES.map((value) => (
          <option key={value} value={value}>
            {SEVERITY_LABELS[value]}
          </option>
        ))}
      </SelectField>
      {events.data && (
        <SelectField label="Na evente" value={fields.eventId ?? ''} onChange={(e) => set({ eventId: e.target.value || null })}>
          <option value="">— mimo eventu —</option>
          {recentEvents.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name} ({formatDate(event.startsOn)})
            </option>
          ))}
        </SelectField>
      )}
      {fields.kind === 'damage' && equipment.data && (
        <SelectField label="Poškodená technika" value={fields.equipmentId ?? ''} onChange={(e) => set({ equipmentId: e.target.value || null })}>
          <option value="">— žiadna / iné —</option>
          {equipment.data.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </SelectField>
      )}
      <Field label="Náklady (€)" type="number" inputMode="decimal" min={0} step="0.01" value={fields.cost ?? ''} onChange={(e) => set({ cost: Number.isNaN(e.target.valueAsNumber) ? null : e.target.valueAsNumber })} />
      <SelectField label="Kto platí" value={fields.paidBy} onChange={(e) => set({ paidBy: e.target.value as IncidentFields['paidBy'] })}>
        {PAID_BY.map((value) => (
          <option key={value} value={value}>
            {PAID_BY_LABELS[value]}
          </option>
        ))}
      </SelectField>
      <TextareaField label="Podrobnosti" className="sm:col-span-2" rows={3} maxLength={2000} value={fields.description} onChange={(e) => set({ description: e.target.value })} />
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" className="size-4" checked={fields.resolved} onChange={(e) => set({ resolved: e.target.checked })} />
        Vyriešené (zaplatené, opravené, vyliečené)
      </label>
      {save.isError && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          Nepodarilo sa uložiť. {errorDetail(save.error)}
        </p>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={!fields.title.trim() || save.isPending}>
          Uložiť
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Zrušiť
        </Button>
      </div>
    </form>
  )
}

/** Škody a úrazy: zápis, prehľad a štatistiky po ľuďoch. Úrazy vidí len admin, dotknutý a autor. */
export function IncidentsPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const admin = isAdminRole(company.role)
  const userId = useAuth().session?.user.id
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const incidents = useIncidents(companyId)
  const members = useMembers(companyId)
  const [editing, setEditing] = useState<string | null>(params.get('new') ? 'new' : null)
  const [kind, setKind] = useState<'' | Incident['kind']>('')
  const [year, setYear] = useState(todayIso().slice(0, 4))
  const remove = useMutation({ mutationFn: deleteIncident, onSettled: () => queryClient.invalidateQueries({ queryKey: incidentKeys.list(companyId) }) })
  const preset: Partial<IncidentFields> = { memberId: params.get('member'), eventId: params.get('event') }

  if (incidents.isPending) return <LoadingBlock />
  if (incidents.isError) return <ErrorBlock message="Škody a úrazy sa nepodarilo načítať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie." onRetry={() => void incidents.refetch()} />

  const nameOf = (id: string) => memberName(members.data, id) || 'bývalý člen'
  const years = [...new Set([todayIso().slice(0, 4), ...incidents.data.map((item) => item.occurredOn.slice(0, 4))])].sort().reverse()
  const visible = incidents.data.filter((item) => (!kind || item.kind === kind) && item.occurredOn.startsWith(year))
  const stats = incidentStats(incidents.data, year, nameOf)

  return (
    <>
      <PageHeader
        title="Škody a úrazy"
        description={admin ? 'Čo sa pokazilo alebo komu sa niečo stalo' : 'Úrazy vidí len admin, dotknutý človek a ten, kto ich zapísal'}
        action={
          editing === null && (
            <Button onClick={() => setEditing('new')}>
              <Plus className="size-4" aria-hidden />
              Zapísať
            </Button>
          )
        }
      />
      {editing === 'new' && <IncidentForm companyId={companyId} current={null} preset={preset} onDone={() => setEditing(null)} />}

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <SelectField label="Rok" hideLabel className="w-36" value={year} onChange={(e) => setYear(e.target.value)}>
          {years.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
          <option value="">Celé obdobie</option>
        </SelectField>
        <SelectField label="Druh" hideLabel className="w-40" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="">Škody aj úrazy</option>
          {INCIDENT_KINDS.map((value) => (
            <option key={value} value={value}>
              {INCIDENT_KIND_LABELS[value]}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Škody', String(stats.damages)],
          ['Úrazy', String(stats.injuries)],
          ['Náklady', formatMoney(stats.cost, 'EUR')],
          ['Nevyriešené', String(stats.open)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-surface p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {stats.byPerson.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Po ľuďoch</h2>
          <ul className="divide-y rounded-xl border bg-surface text-sm">
            {stats.byPerson.map((person) => (
              <li key={person.key} className="flex justify-between gap-3 px-4 py-2.5">
                <span>{person.name}</span>
                <span className="text-muted-foreground">
                  {[person.damages > 0 && `škody ${person.damages}`, person.injuries > 0 && `úrazy ${person.injuries}`, person.cost > 0 && formatMoney(person.cost, 'EUR')].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-12 text-center">
          <p className="font-medium">Nič zapísané</p>
          <p className="mt-1 text-sm text-muted-foreground">Keď sa niečo rozbije alebo sa niekto zraní, zapíšte to tu.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((item) =>
            editing === item.id ? (
              <li key={item.id}>
                <IncidentForm companyId={companyId} current={item} preset={{}} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={item.id} className="flex items-start gap-3 rounded-xl border bg-surface px-4 py-3">
                {item.kind === 'injury' ? <Bandage className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden /> : <Hammer className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium break-words">
                    {item.title}
                    {item.resolved ? <span className="ml-2 text-xs font-normal text-emerald-700 dark:text-emerald-400">vyriešené</span> : <span className="ml-2 text-xs font-normal text-accent">otvorené</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {[
                      INCIDENT_KIND_LABELS[item.kind],
                      formatDate(item.occurredOn),
                      item.memberId ? nameOf(item.memberId) : item.personName,
                      SEVERITY_LABELS[item.severity].toLowerCase(),
                      item.cost !== null && formatMoney(item.cost, 'EUR'),
                      item.paidBy && `platí: ${PAID_BY_LABELS[item.paidBy].toLowerCase()}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {item.eventId && (
                    <Link to={`/events/${item.eventId}`} className="text-sm text-accent hover:underline">
                      Event
                    </Link>
                  )}
                  {item.equipmentId && (
                    <Link to={`/equipment/${item.equipmentId}`} className="ml-3 text-sm text-accent hover:underline">
                      Technika
                    </Link>
                  )}
                  {item.description && <p className="mt-1 text-sm whitespace-pre-wrap">{item.description}</p>}
                </div>
                {(admin || item.createdBy === userId) && (
                  <span className="flex gap-1">
                    <Button variant="ghost" size="sm" aria-label={`Upraviť ${item.title}`} onClick={() => setEditing(item.id)}>
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                    <Button variant="ghost" size="sm" aria-label={`Zmazať ${item.title}`} onClick={() => window.confirm('Zmazať záznam?') && remove.mutate(item.id)}>
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </span>
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </>
  )
}
