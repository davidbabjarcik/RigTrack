import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useCases } from '@/features/cases/useCases'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { AUDIO_TYPE_LABELS, AUDIO_TYPES, EQUIPMENT_KINDS, KIND_LABELS, type Equipment, type Lookup } from '@/features/equipment/model'
import { useEquipmentLookups } from '@/features/equipment/useEquipmentLookups'
import { fetchRules, MATCHER_LABELS, MATCHER_TYPES, ruleKeys, rulesSchema, saveRules, type AmountMode, type EventRule, type Matcher, type MatcherType } from './rules'

type Options = { equipment: Equipment[]; categories: Lookup[]; cases: { id: string; name: string }[] }

/** Výber podmienky: druh podmienky a potom konkrétna hodnota (technika, kategória, case…) alebo text. */
function MatcherField({ label, value, options, onChange }: { label: string; value: Matcher; options: Options; onChange: (value: Matcher) => void }) {
  const choices: { id: string; name: string }[] =
    value.type === 'equipment'
      ? options.equipment
      : value.type === 'category'
        ? options.categories
        : value.type === 'case'
          ? options.cases
          : value.type === 'kind'
            ? EQUIPMENT_KINDS.map((kind) => ({ id: kind, name: KIND_LABELS[kind] }))
            : value.type === 'audioType'
              ? AUDIO_TYPES.map((type) => ({ id: type, name: AUDIO_TYPE_LABELS[type] }))
              : []
  return (
    <fieldset className="grid min-w-0 flex-1 grid-cols-[9rem_1fr] items-end gap-2">
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <SelectField label="Podľa" hideLabel value={value.type} onChange={(event) => onChange({ type: event.target.value as MatcherType, value: '' })}>
        {MATCHER_TYPES.map((type) => (
          <option key={type} value={type}>
            {MATCHER_LABELS[type]}
          </option>
        ))}
      </SelectField>
      {value.type === 'name' ? (
        <Field label="Text v názve" hideLabel placeholder="napr. NL4 alebo pasív" maxLength={120} value={value.value} onChange={(event) => onChange({ ...value, value: event.target.value })} />
      ) : (
        <SelectField label="Hodnota" hideLabel value={value.value} onChange={(event) => onChange({ ...value, value: event.target.value })}>
          <option value="">— vyberte —</option>
          {choices.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.name}
            </option>
          ))}
        </SelectField>
      )}
    </fieldset>
  )
}

const newId = () => Math.random().toString(36).slice(2, 10)

function Editor({ companyId, initial, options }: { companyId: string; initial: EventRule[]; options: Options }) {
  const queryClient = useQueryClient()
  const [rules, setRules] = useState(initial)
  const change = (index: number, patch: Partial<EventRule>) => setRules(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)))
  const valid = rulesSchema.safeParse(rules).success
  const save = useMutation({
    mutationFn: () => saveRules(companyId, rules),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ruleKeys.list(companyId) }),
  })

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Keď je na evente alebo vo výpožičke niečo, čo pravidlo spúšťa, a chýba to, čo k tomu treba, ukáže sa pripomienka. Napríklad:
        typ zvuku Reprobox → technika Kábel NL4, na každý kus 1 (4 repráky = 4 káble); kategória Svetlá → case Háky, aspoň jeden.
      </p>
      {rules.map((rule, index) => (
        <div key={rule.id} className="flex flex-col gap-3 rounded-xl border bg-surface p-3">
          <div className="flex flex-col gap-3 md:flex-row">
            <MatcherField label="Keď je na evente / vo výpožičke" value={rule.when} options={options} onChange={(when) => change(index, { when })} />
            <MatcherField label="pripomeň, ak chýba" value={rule.need} options={options} onChange={(need) => change(index, { need })} />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <SelectField
              label="Koľko treba"
              className="w-48"
              value={rule.amount.mode}
              onChange={(event) => change(index, { amount: { ...rule.amount, mode: event.target.value as AmountMode } })}
            >
              <option value="any">aspoň jeden kus</option>
              <option value="perPiece">na každý kus</option>
            </SelectField>
            {rule.amount.mode === 'perPiece' && (
              <Field
                label="Koľko na kus"
                type="number"
                min={0.1}
                step={0.5}
                className="w-28"
                value={Number.isFinite(rule.amount.factor) ? rule.amount.factor : ''}
                onChange={(event) => change(index, { amount: { ...rule.amount, factor: event.target.value === '' ? Number.NaN : Number(event.target.value) } })}
              />
            )}
            <Field
              label="Vlastný text (nepovinné)"
              className="flex-1"
              placeholder="napr. Berieš pasívne repro – nezabudni kabeláž NL4"
              maxLength={200}
              value={rule.message}
              onChange={(event) => change(index, { message: event.target.value })}
            />
            <Button variant="ghost" aria-label={`Odobrať pravidlo ${index + 1}`} onClick={() => setRules(rules.filter((_, i) => i !== index))}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => setRules([...rules, { id: newId(), when: { type: 'audioType', value: 'amplifier' }, need: { type: 'name', value: '' }, amount: { mode: 'perPiece', factor: 1 }, message: '' }])}
      >
        <Plus className="size-4" aria-hidden />
        Pridať pravidlo
      </Button>
      {!valid && rules.length > 0 && <p className="text-sm text-destructive">Pri každom pravidle vyberte obe hodnoty a pri „na každý kus“ zadajte počet.</p>}
      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          Uloženie zlyhalo. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.
        </p>
      )}
      {save.isSuccess && <p role="status" className="text-sm text-muted-foreground">Uložené.</p>}
      <Button className="self-start" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? 'Ukladám…' : 'Uložiť pripomienky'}
      </Button>
    </div>
  )
}

/** Nastavenie pripomienok pri eventoch. */
export function RulesSettings({ companyId }: { companyId: string }) {
  const rules = useQuery({ queryKey: ruleKeys.list(companyId), queryFn: () => fetchRules(companyId) })
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const cases = useCases(companyId)
  const { categories } = useEquipmentLookups(companyId)
  if (rules.isError) return <p className="text-sm text-destructive">Pripomienky sa nepodarilo načítať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.</p>
  if (!rules.data || !equipment.data || !cases.data) return <p className="text-sm text-muted-foreground">Načítavam…</p>
  const byName = <T extends { name: string }>(list: T[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, 'sk'))
  return (
    <Editor
      companyId={companyId}
      initial={rules.data}
      options={{ equipment: byName(equipment.data.filter((item) => item.status !== 'retired')), categories: byName(categories), cases: byName(cases.data) }}
    />
  )
}
