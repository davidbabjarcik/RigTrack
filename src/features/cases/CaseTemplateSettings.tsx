import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { addCaseTemplate, caseTemplateKeys, deleteCaseTemplate, describeTemplate, fetchCaseTemplates } from './templates'
import { tx, tf } from '@/lib/i18n'

const EMPTY = { name: '', labelCategory: '', weightKg: '', widthCm: '', lengthCm: '', depthCm: '' }
const optional = (text: string) => {
  const value = Number(text.replace(',', '.'))
  return text.trim() !== '' && Number.isFinite(value) && value > 0 ? value : null
}

/** Správa šablón cases: typ case s rozmermi, z ktorého sa potom zakladajú nové cases. */
export function CaseTemplateSettings({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(EMPTY)
  const templates = useQuery({ queryKey: caseTemplateKeys.list(companyId), queryFn: () => fetchCaseTemplates(companyId) })
  const refresh = () => queryClient.invalidateQueries({ queryKey: caseTemplateKeys.list(companyId) })
  const add = useMutation({
    mutationFn: () =>
      addCaseTemplate(companyId, {
        name: form.name,
        labelCategory: form.labelCategory,
        weightKg: optional(form.weightKg),
        widthCm: optional(form.widthCm),
        lengthCm: optional(form.lengthCm),
        depthCm: optional(form.depthCm),
      }),
    onSuccess: () => setForm(EMPTY),
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: (id: string) => deleteCaseTemplate(companyId, id), onSettled: refresh })
  const set = (key: keyof typeof EMPTY) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }))

  function submit(event: FormEvent) {
    event.preventDefault()
    if (form.name.trim()) add.mutate()
  }
  const duplicate = (add.error as { code?: string } | null)?.code === '23505'

  return (
    <>
      {templates.isError && (
        <p role="alert" className="mb-3 text-sm text-destructive">{tx('Šablóny sa nepodarilo načítať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.')}</p>
      )}
      {(templates.data ?? []).length > 0 && (
        <ul className="mb-3 divide-y overflow-hidden rounded-xl border bg-surface">
          {(templates.data ?? []).map((template) => (
            <li key={template.id} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{template.name}</span>
                <span className="block truncate text-sm text-muted-foreground">{describeTemplate(template) || tx('bez rozmerov')}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={tf('Odstrániť šablónu: {0}', template.name)}
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm(tf('Odstrániť šablónu „{0}“? Cases, ktoré z nej vznikli, ostanú.', template.name))) remove.mutate(template.id)
                }}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="grid items-end gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-3 lg:grid-cols-6">
        <Field label={tx('Názov šablóny')} placeholder={tx('napr. Thon case 120')} maxLength={120} className="sm:col-span-3 lg:col-span-2" value={form.name} onChange={set('name')} />
        <Field label={tx('Šírka (cm)')} inputMode="decimal" value={form.widthCm} onChange={set('widthCm')} />
        <Field label={tx('Dĺžka (cm)')} inputMode="decimal" value={form.lengthCm} onChange={set('lengthCm')} />
        <Field label={tx('Hĺbka (cm)')} inputMode="decimal" value={form.depthCm} onChange={set('depthCm')} />
        <Field label={tx('Hmotnosť (kg)')} inputMode="decimal" value={form.weightKg} onChange={set('weightKg')} />
        <Field label={tx('Kategória na štítku')} placeholder={tx('napr. Light')} maxLength={40} className="sm:col-span-2" value={form.labelCategory} onChange={set('labelCategory')} />
        <Button type="submit" disabled={add.isPending || !form.name.trim()}>{tx('Pridať šablónu')}</Button>
      </form>
      <p className="mt-2 text-sm text-muted-foreground">{tx('Pri novom case potom stačí vybrať šablónu a rozmery sa doplnia samy. Hmotnosť je hmotnosť prázdneho case.')}</p>
      {(add.isError || remove.isError) && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {duplicate ? tx('Šablóna s týmto názvom už existuje.') : tx('Zmenu sa nepodarilo uložiť.')}
        </p>
      )}
    </>
  )
}
