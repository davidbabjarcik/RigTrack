import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { History, Plus, Printer, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import type { CompanyEvent } from '@/features/events/model'
import { formatDate } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { DocSharesSection } from '@/features/shares/DocSharesSection'
import { deleteScheduleItem, fetchScheduleVersionCount, saveScheduleItem, saveScheduleVersion, scheduleKeys, useSchedule } from './api'
import { eventDays, groupSchedule, SCHEDULE_KIND_LABELS, SCHEDULE_KINDS, scheduleWarnings, type ScheduleFields, type ScheduleItem, type ScheduleKind } from './model'

function ItemForm({ initial, days, stages, onSave, onCancel, onDelete, saving }: { initial: ScheduleFields; days: string[]; stages: string[]; onSave: (fields: ScheduleFields) => void; onCancel: () => void; onDelete?: () => void; saving: boolean }) {
  const [fields, setFields] = useState(initial)
  const set = (patch: Partial<ScheduleFields>) => setFields((value) => ({ ...value, ...patch }))
  function submit(event: FormEvent) {
    event.preventDefault()
    if (fields.title.trim() && fields.startsAt && fields.day) onSave(fields)
  }
  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-2 rounded-xl border bg-surface p-3 sm:grid-cols-6">
      <SelectField label={tx('Deň')} value={fields.day} onChange={(e) => set({ day: e.target.value })}>
        {days.map((day) => (
          <option key={day} value={day}>{formatDate(day)}</option>
        ))}
      </SelectField>
      <Field label={tx('Od')} type="time" required value={fields.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
      <Field label={tx('Do')} type="time" value={fields.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
      <SelectField label={tx('Druh')} value={fields.kind} onChange={(e) => set({ kind: e.target.value as ScheduleKind })}>
        {SCHEDULE_KINDS.map((kind) => (
          <option key={kind} value={kind}>{tx(SCHEDULE_KIND_LABELS[kind])}</option>
        ))}
      </SelectField>
      <Field label={tx('Pódium (festival)')} list="schedule-stages" className="col-span-2" maxLength={40} placeholder={tx('napr. Hlavné, Malé')} value={fields.stage} onChange={(e) => set({ stage: e.target.value })} />
      <datalist id="schedule-stages">
        {stages.map((stage) => (
          <option key={stage} value={stage} />
        ))}
      </datalist>
      <Field label={tx('Názov')} className="col-span-2 sm:col-span-3" maxLength={120} autoFocus placeholder={tx('napr. Ukážková kapela, Soundcheck DJ')} value={fields.title} onChange={(e) => set({ title: e.target.value })} />
      <Field label={tx('Poznámka')} className="col-span-2 sm:col-span-3" maxLength={300} value={fields.note} onChange={(e) => set({ note: e.target.value })} />
      <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-6">
        <Button type="submit" size="sm" disabled={saving}>{tx('Uložiť')}</Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>{tx('Zrušiť')}</Button>
        {onDelete && (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={onDelete}>
            <Trash2 className="size-4" aria-hidden />{tx('Odstrániť')}
          </Button>
        )}
      </div>
    </form>
  )
}

/**
 * Harmonogram akcie: get-in, soundcheck, otvorenie, vystúpenia, prestavby, curfew… po dňoch. Pri viacerých pódiách
 * (festival) sú pódiá vedľa seba. Upozorní na prekryv na pódiu a krátku prestavbu medzi vystúpeniami.
 */
export function EventScheduleSection({ companyId, event, canEdit }: { companyId: string; event: CompanyEvent; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const schedule = useSchedule(companyId, event.id)
  const [editing, setEditing] = useState<string | null>(null)
  const refresh = () => queryClient.invalidateQueries({ queryKey: scheduleKeys.ofEvent(companyId, event.id) })
  const save = useMutation({ mutationFn: ({ id, fields }: { id: string | null; fields: ScheduleFields }) => saveScheduleItem(companyId, event.id, id, fields), onSuccess: () => setEditing(null), onSettled: refresh })
  const remove = useMutation({ mutationFn: deleteScheduleItem, onSuccess: () => setEditing(null), onSettled: refresh })
  const versions = useQuery({ queryKey: [...scheduleKeys.ofEvent(companyId, event.id), 'versions'], queryFn: () => fetchScheduleVersionCount(companyId, event.id) })
  const [notice, setNotice] = useState('')
  const version = useMutation({
    mutationFn: () => saveScheduleVersion(event.id),
    onSuccess: async (next) => {
      setNotice(tf('Uložená verzia {0} harmonogramu.', next))
      await versions.refetch()
      await queryClient.invalidateQueries({ queryKey: ['company', companyId, 'doc-shares'] })
    },
  })
  if (!schedule.data) return null
  const items = schedule.data
  const days = eventDays(event)
  const stages = [...new Set(items.map((item) => item.stage).filter(Boolean))]
  const warnings = scheduleWarnings(items)
  const flagged = new Set(warnings.flatMap((warning) => warning.ids))
  const last = items.at(-1)
  const blank: ScheduleFields = { day: last?.day ?? days[0], startsAt: last?.endsAt || '', endsAt: '', stage: last?.stage ?? '', kind: 'act', title: '', note: '' }
  const form = (item: ScheduleItem | null) => (
    <ItemForm initial={item ?? blank} days={[...new Set([...days, ...(item ? [item.day] : [])])]} stages={stages} saving={save.isPending} onSave={(fields) => save.mutate({ id: item?.id ?? null, fields })} onCancel={() => setEditing(null)} onDelete={item ? () => remove.mutate(item.id) : undefined} />
  )

  return (
    <>
    <CollapsibleSection
      id="event.schedule"
      title={tf('Harmonogram ({0})', items.length)}
      actions={
        items.length > 0 && (
          <LinkButton to={`/events/${event.id}/schedule`} variant="outline" size="sm">
            <Printer className="size-4" aria-hidden />{tx('Tlačiť')}
          </LinkButton>
        )
      }
    >
      {warnings.length > 0 && (
        <ul className="mb-2 text-sm text-amber-800 dark:text-amber-300">
          {warnings.map((warning) => (
            <li key={warning.text}>{warning.text}</li>
          ))}
        </ul>
      )}
      {[...groupSchedule(items)].map(([day, byStage]) => (
        <div key={day} className="mb-3">
          <h3 className="mb-1 text-sm font-semibold">{formatDate(day)}</h3>
          <div className={cn('grid gap-3', byStage.size > 1 && 'md:grid-cols-2 xl:grid-cols-3')}>
            {[...byStage].map(([stage, list]) => (
              <div key={stage}>
                {byStage.size > 1 || stage ? <p className="mb-1 text-xs font-medium text-muted-foreground">{stage || tx('Bez pódia')}</p> : null}
                <ul className="divide-y overflow-hidden rounded-xl border bg-surface text-sm">
                  {list.map((item) =>
                    editing === item.id ? (
                      <li key={item.id} className="p-2">{form(item)}</li>
                    ) : (
                      <li key={item.id}>
                        <button type="button" disabled={!canEdit} onClick={() => setEditing(item.id)} className={cn('flex w-full items-start gap-3 px-3 py-2 text-left enabled:hover:bg-muted', flagged.has(item.id) && 'bg-amber-50 dark:bg-amber-950')}>
                          <span className="w-24 shrink-0 font-mono">{item.endsAt ? `${item.startsAt}–${item.endsAt}` : item.startsAt}</span>
                          <span className="min-w-0 flex-1">
                            <span className={cn('block', item.kind === 'act' && 'font-semibold')}>{item.title}</span>
                            <span className="block text-xs text-muted-foreground">{[tx(SCHEDULE_KIND_LABELS[item.kind]), item.note].filter(Boolean).join(' · ')}</span>
                          </span>
                        </button>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
      {canEdit && editing === 'new' && <div className="mb-3">{form(null)}</div>}
      {canEdit && editing !== 'new' && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden />{tx('Pridať do harmonogramu')}
          </Button>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" disabled={version.isPending} onClick={() => version.mutate()}>
              <History className="size-4" aria-hidden />{tf('Uložiť verziu ({0})', versions.data ?? 0)}
            </Button>
          )}
        </div>
      )}
      {notice && <p role="status" className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">{notice}</p>}
      {items.length === 0 && editing !== 'new' && <p className="mt-2 text-sm text-muted-foreground">{tx('Podrobný časový plán: get-in, soundcheck, otvorenie, vystúpenia, prestavby a koniec. Pri festivale zadajte pódium – zobrazia sa vedľa seba.')}</p>}
      {(save.isError || remove.isError || version.isError) && <p role="alert" className="mt-2 text-sm text-destructive">{tx('Zmena sa nepodarila.')}</p>}
    </CollapsibleSection>
    {items.length > 0 && (
      <DocSharesSection companyId={companyId} docType="schedule" docId={event.id} canEdit={canEdit} hint={tx('Harmonogram pre kapely, klub alebo produkciu – odkaz len na čítanie s poslednou uloženou verziou (Uložiť verziu) a zmenami od posledného zobrazenia.')} />
    )}
    </>
  )
}
