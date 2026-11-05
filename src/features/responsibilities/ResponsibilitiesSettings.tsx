import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2, UserCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useCases } from '@/features/cases/useCases'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { EQUIPMENT_KINDS, KIND_LABELS } from '@/features/equipment/model'
import { cn } from '@/lib/utils'
import { deleteResponsibility, responsibilityKeys, saveResponsibility, useResponsibilities, type Responsibility, type ResponsibilityFields } from './api'
import { tx, tf } from '@/lib/i18n'

const EMPTY: ResponsibilityFields = { name: '', kinds: [], caseIds: [], memberIds: [], hoursEveryDays: null, checkEveryDays: null, note: '' }
const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
const chip = (on: boolean) =>
  cn('rounded-full border px-2.5 py-1 text-xs font-medium', on ? 'border-primary bg-primary text-primary-foreground' : 'bg-surface text-muted-foreground hover:bg-muted hover:text-foreground')

/** Admin: kto za čo zodpovedá (druh techniky alebo konkrétne case) a čo má robiť (hodiny, kontroly). */
export function ResponsibilitiesSettings({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient()
  const list = useResponsibilities(companyId)
  const members = useMembers(companyId)
  const cases = useCases(companyId)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [fields, setFields] = useState<ResponsibilityFields>(EMPTY)
  const [caseSearch, setCaseSearch] = useState('')
  const refresh = () => queryClient.invalidateQueries({ queryKey: responsibilityKeys.list(companyId) })
  const save = useMutation({ mutationFn: () => saveResponsibility(companyId, editing === 'new' ? null : editing, fields), onSuccess: () => setEditing(null), onSettled: refresh })
  const remove = useMutation({ mutationFn: (id: string) => deleteResponsibility(companyId, id), onSettled: refresh })
  const set = (patch: Partial<ResponsibilityFields>) => setFields({ ...fields, ...patch })
  const caseName = (id: string) => cases.data?.find((item) => item.id === id)?.name ?? 'case'
  const open = (item: Responsibility | null) => {
    setFields(item ? { ...item } : EMPTY)
    setCaseSearch('')
    setEditing(item?.id ?? 'new')
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    if (fields.name.trim()) save.mutate()
  }

  if (list.isError) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">{tx('Zodpovednosti zatiaľ nie sú dostupné – treba spustiť migráciu 0089.')}</p>

  const foundCases = (cases.data ?? [])
    .filter((item) => !fields.caseIds.includes(item.id) && caseSearch.trim() && item.name.toLowerCase().includes(caseSearch.trim().toLowerCase()))
    .slice(0, 8)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{tx('Kto za čo zodpovedá – napr. svetlá, zvuk alebo konkrétne case. Zodpovedný vidí na Prehľade, čo treba urobiť (odčítať prevádzkové hodiny, skontrolovať case), a raz denne mu príde upozornenie. Pri case a technike je vidno, kto za ňu zodpovedá.')}</p>
      {(list.data ?? []).length > 0 && (
        <ul className="divide-y rounded-xl border bg-surface">
          {list.data!.map((item) => (
            <li key={item.id} className="flex flex-wrap items-start gap-3 p-3">
              <UserCheck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">{item.name}</p>
                <p className="text-muted-foreground">
                  {[...item.kinds.map((kind) => KIND_LABELS[kind as keyof typeof KIND_LABELS] ?? kind), ...item.caseIds.map(caseName)].join(', ') || tx('bez rozsahu')}
                </p>
                <p className="text-muted-foreground">
                  {item.memberIds.map((id) => memberName(members.data, id) || tx('bývalý člen')).join(', ') || 'nikto'}
                </p>
              </div>
              <Button variant="ghost" size="sm" aria-label={tf('Upraviť {0}', item.name)} onClick={() => open(item)}>
                <Pencil className="size-4" aria-hidden />
              </Button>
              <Button variant="ghost" size="sm" aria-label={tf('Zmazať {0}', item.name)} disabled={remove.isPending} onClick={() => window.confirm(tf('Zmazať zodpovednosť „{0}“?', item.name)) && remove.mutate(item.id)}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <form onSubmit={submit} className="flex flex-col gap-4 rounded-xl border bg-surface p-4">
          <Field label={tx('Názov *')} placeholder={tx('napr. Svetlá, Zvuk, Case LED')} maxLength={80} autoFocus value={fields.name} onChange={(event) => set({ name: event.target.value })} />
          <fieldset>
            <legend className="mb-1 text-sm font-medium">{tx('Za akú techniku (druh)')}</legend>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT_KINDS.map((kind) => (
                <button key={kind} type="button" aria-pressed={fields.kinds.includes(kind)} className={chip(fields.kinds.includes(kind))} onClick={() => set({ kinds: toggle(fields.kinds, kind) })}>
                  {tx(KIND_LABELS[kind])}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1 text-sm font-medium">{tx('Alebo / aj konkrétne case a racky')}</legend>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {fields.caseIds.map((id) => (
                <button key={id} type="button" className={chip(true)} aria-label={tf('Odobrať {0}', caseName(id))} onClick={() => set({ caseIds: toggle(fields.caseIds, id) })}>
                  {caseName(id)} ×
                </button>
              ))}
            </div>
            <Field label={tx('Pridať case')} hideLabel placeholder={tx('Hľadať case podľa názvu…')} value={caseSearch} onChange={(event) => setCaseSearch(event.target.value)} />
            {foundCases.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {foundCases.map((item) => (
                  <button key={item.id} type="button" className={chip(false)} onClick={() => (set({ caseIds: [...fields.caseIds, item.id] }), setCaseSearch(''))}>
                    + {item.name}
                  </button>
                ))}
              </div>
            )}
          </fieldset>
          <fieldset>
            <legend className="mb-1 text-sm font-medium">{tx('Kto zodpovedá')}</legend>
            <div className="flex flex-wrap gap-1.5">
              {(members.data ?? []).map((member) => (
                <button
                  key={member.userId}
                  type="button"
                  aria-pressed={fields.memberIds.includes(member.userId)}
                  className={chip(fields.memberIds.includes(member.userId))}
                  onClick={() => set({ memberIds: toggle(fields.memberIds, member.userId) })}
                >
                  {member.fullName || member.email}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-muted-foreground">{tx('Zodpovedným appka pripomenie odčítať prevádzkové hodiny a skontrolovať cases podľa Úrovní kontroly (Nastavenia → Pripomienky) – pri technike je úroveň hodín, pri case úroveň kontroly.')}</p>
          <Field label={tx('Poznámka')} maxLength={500} value={fields.note} onChange={(event) => set({ note: event.target.value })} />
          {save.isError && <p className="text-sm text-destructive">{tx('Nepodarilo sa uložiť.')}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!fields.name.trim() || save.isPending}>{tx('Uložiť')}</Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>{tx('Zrušiť')}</Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" size="sm" className="self-start" onClick={() => open(null)}>
          <Plus className="size-4" aria-hidden />{tx('Pridať zodpovednosť')}</Button>
      )}
    </div>
  )
}
