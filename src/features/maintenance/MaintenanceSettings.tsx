import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Gauge, Pencil, ShieldCheck, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { EQUIPMENT_KINDS, KIND_LABELS, formatNumber } from '@/features/equipment/model'
import { useEquipmentLookups } from '@/features/equipment/useEquipmentLookups'
import { errorDetail } from '@/lib/supabase/errors'
import { deleteMaintenanceRule, maintenanceKeys, saveMaintenanceRule, useMaintenanceRules, type MaintenanceRule, type MaintenanceRuleInput } from './api'

const EMPTY: MaintenanceRuleInput = {
  kind: 'hours',
  name: '',
  counter: '',
  limitHours: null,
  warnPercent: 90,
  intervalMonths: 12,
  warnDays: 30,
  kinds: [],
  categoryIds: [],
  equipmentIds: [],
  createTask: false,
  note: '',
}

/** Rýchle predvoľby, aby sa nemuselo všetko písať. */
const PRESETS: { label: string; rule: Partial<MaintenanceRuleInput> }[] = [
  { label: 'Výbojka 1 500 h', rule: { kind: 'hours', name: 'Výbojka', counter: 'Výbojka', limitHours: 1500, kinds: ['light'] } },
  { label: 'Servis každých 500 h', rule: { kind: 'hours', name: 'Servis podľa hodín', counter: '', limitHours: 500 } },
  { label: 'Revízia káblov 12 mes.', rule: { kind: 'revision', name: 'Revízia káblov', intervalMonths: 12, kinds: ['cable'] } },
  { label: 'Revízia spotrebičov 12 mes.', rule: { kind: 'revision', name: 'Revízia elektrospotrebičov', intervalMonths: 12, kinds: ['appliance', 'it'] } },
]

const parseNumber = (value: string) => (value.trim() === '' ? null : Number(value.replace(',', '.')))

/**
 * Nastavenia → Limity a revízie: limity hodín (výbojka, servis podľa hodín) a revízie (elektro, kontroly)
 * s vlastným intervalom, upozornením vopred a pre ktorú techniku platia. Smie ten, kto má maintenance.manage.
 */
export function MaintenanceSettings({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient()
  const rules = useMaintenanceRules(companyId)
  const { categories } = useEquipmentLookups(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<MaintenanceRuleInput>(EMPTY)
  const [limit, setLimit] = useState('')
  const [picker, setPicker] = useState('')

  const refresh = () => queryClient.invalidateQueries({ queryKey: maintenanceKeys.all(companyId) })
  const save = useMutation({
    mutationFn: (rule: MaintenanceRuleInput) => saveMaintenanceRule(companyId, editing === 'new' ? null : editing, rule),
    onSuccess: () => setEditing(null),
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: (id: string) => deleteMaintenanceRule(companyId, id), onSettled: refresh })

  const gear = (equipment.data ?? []).filter((item) => item.status !== 'retired')
  const nameOf = (id: string) => gear.find((item) => item.id === id)?.name ?? 'zmazaná technika'

  function open(rule: MaintenanceRule | null, preset?: Partial<MaintenanceRuleInput>) {
    const next = rule ? { ...rule } : { ...EMPTY, ...preset }
    setForm(next)
    setLimit(next.limitHours !== null ? String(next.limitHours) : '')
    setEditing(rule ? rule.id : 'new')
    save.reset()
  }

  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
  const limitValue = parseNumber(limit)
  const valid =
    form.name.trim() !== '' &&
    (form.kind === 'hours' ? limitValue !== null && Number.isFinite(limitValue) && limitValue > 0 : (form.intervalMonths ?? 0) >= 1)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (valid) save.mutate({ ...form, limitHours: form.kind === 'hours' ? limitValue : null })
  }

  const scopeText = (rule: MaintenanceRuleInput) => {
    const parts = [
      ...rule.kinds.map((kind) => KIND_LABELS[kind as keyof typeof KIND_LABELS] ?? kind),
      ...rule.categoryIds.map((id) => categories.find((item) => item.id === id)?.name ?? 'kategória'),
      ...rule.equipmentIds.map(nameOf),
    ]
    return parts.length > 0 ? parts.join(', ') : 'všetka technika'
  }

  if (rules.isError) return <p className="text-sm text-destructive">Limity sa nepodarilo načítať. {errorDetail(rules.error)}</p>

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        <strong>Limit hodín</strong> sleduje počítadlo (prevádzkové hodiny alebo napr. Výbojka) – po výmene alebo servise sa počíta odznova.{' '}
        <strong>Revízia</strong> má interval v mesiacoch (napr. elektro revízia káblov). Upozornenie príde tým, čo smú limity nastavovať,
        a zodpovedným za daný druh techniky; prehľad je v Kontrolách.
      </p>

      {(rules.data ?? []).length > 0 && (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {(rules.data ?? []).map((rule) => (
            <li key={rule.id} className="flex items-start gap-3 px-4 py-3">
              {rule.kind === 'hours' ? <Gauge className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden /> : <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{rule.name}</p>
                <p className="text-sm text-muted-foreground">
                  {rule.kind === 'hours'
                    ? `${rule.counter || 'Prevádzkové hodiny'} · limit ${formatNumber(rule.limitHours ?? 0)} h · upozorniť pri ${rule.warnPercent} %`
                    : `každých ${rule.intervalMonths} mes. · upozorniť ${rule.warnDays} dní vopred`}
                  {rule.createTask && ' · vytvorí úlohu'}
                </p>
                <p className="truncate text-sm text-muted-foreground">Pre: {scopeText(rule)}</p>
              </div>
              <Button size="sm" variant="ghost" className="size-8 p-0" aria-label={`Upraviť ${rule.name}`} onClick={() => open(rule)}>
                <Pencil className="size-4" aria-hidden />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="size-8 p-0"
                aria-label={`Zmazať ${rule.name}`}
                disabled={remove.isPending}
                onClick={() => window.confirm(`Zmazať „${rule.name}“ aj so zápismi výmen a revízií?`) && remove.mutate(rule.id)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {editing === null ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => open(null)}>
            Pridať limit alebo revíziu
          </Button>
          {PRESETS.map((preset) => (
            <Button key={preset.label} size="sm" variant="outline" onClick={() => open(null, preset.rule)}>
              + {preset.label}
            </Button>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Typ" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as MaintenanceRule['kind'] })}>
              <option value="hours">Limit hodín (výmena / servis)</option>
              <option value="revision">Revízia / pravidelná kontrola</option>
            </SelectField>
            <Field label="Názov" required maxLength={80} placeholder={form.kind === 'hours' ? 'napr. Výbojka' : 'napr. Revízia káblov'} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          {form.kind === 'hours' ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field
                label="Počítadlo"
                maxLength={40}
                list="maintenance-counters"
                placeholder="prázdne = prevádzkové hodiny"
                value={form.counter}
                onChange={(e) => setForm({ ...form, counter: e.target.value })}
              />
              <datalist id="maintenance-counters">
                <option value="Výbojka" />
                <option value="Lampa" />
                <option value="Laser" />
              </datalist>
              <Field label="Limit (h)" required inputMode="decimal" placeholder="napr. 1500" value={limit} onChange={(e) => setLimit(e.target.value)} />
              <Field
                label="Upozorniť pri (%)"
                type="number"
                min={1}
                max={100}
                value={form.warnPercent}
                onChange={(e) => setForm({ ...form, warnPercent: Math.min(100, Math.max(1, Number(e.target.value) || 90)) })}
              />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Interval (mesiace)"
                type="number"
                min={1}
                max={240}
                required
                value={form.intervalMonths ?? ''}
                onChange={(e) => setForm({ ...form, intervalMonths: e.target.value === '' ? null : Math.min(240, Math.max(1, Number(e.target.value))) })}
              />
              <Field
                label="Upozorniť vopred (dni)"
                type="number"
                min={0}
                max={365}
                value={form.warnDays}
                onChange={(e) => setForm({ ...form, warnDays: Math.min(365, Math.max(0, Number(e.target.value) || 0)) })}
              />
            </div>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Pre ktorú techniku (nič nevybraté = všetka)</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {EQUIPMENT_KINDS.map((kind) => (
                <label key={kind} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4" checked={form.kinds.includes(kind)} onChange={() => setForm({ ...form, kinds: toggle(form.kinds, kind) })} />
                  {KIND_LABELS[kind]}
                </label>
              ))}
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t pt-2">
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4" checked={form.categoryIds.includes(category.id)} onChange={() => setForm({ ...form, categoryIds: toggle(form.categoryIds, category.id) })} />
                    {category.name}
                  </label>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-end gap-2 border-t pt-2">
              <SelectField label="Len vybraná technika" className="min-w-0 flex-1 sm:max-w-sm" value={picker} onChange={(e) => setPicker(e.target.value)}>
                <option value="">— vyberte techniku —</option>
                {gear
                  .filter((item) => !form.equipmentIds.includes(item.id))
                  .sort((a, b) => a.name.localeCompare(b.name, 'sk'))
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </SelectField>
              <Button
                size="sm"
                variant="outline"
                disabled={!picker}
                onClick={() => {
                  setForm({ ...form, equipmentIds: [...form.equipmentIds, picker] })
                  setPicker('')
                }}
              >
                Pridať
              </Button>
            </div>
            {form.equipmentIds.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {form.equipmentIds.map((id) => (
                  <li key={id} className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm">
                    {nameOf(id)}
                    <button type="button" aria-label={`Odobrať ${nameOf(id)}`} onClick={() => setForm({ ...form, equipmentIds: form.equipmentIds.filter((item) => item !== id) })}>
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm text-muted-foreground">Ak vyberiete druh aj kategóriu, musí technika spĺňať oboje. Limit hodín sa týka len techniky, ktorá to počítadlo už má odčítané (alebo je vybraná).</p>
          </fieldset>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={form.createTask} onChange={(e) => setForm({ ...form, createTask: e.target.checked })} />
            Po prekročení limitu / termínu vytvoriť aj úlohu (kategória Servis)
          </label>
          <TextareaField label="Poznámka" rows={2} maxLength={500} placeholder="napr. revíziu robí firma XY, tel. …" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />

          {save.isError && (
            <p role="alert" className="text-sm text-destructive">
              {/maintenance_rules/.test(String(save.error?.message ?? '')) ? 'Limity ešte databáza nepozná – spustite v Supabase supabase/update-all.sql (migrácia 0122).' : `Nepodarilo sa uložiť. ${errorDetail(save.error)}`}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!valid || save.isPending}>
              {save.isPending ? 'Ukladám…' : 'Uložiť'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
              Zrušiť
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
