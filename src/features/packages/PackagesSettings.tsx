import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, Pencil, Plus, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { useCases } from '@/features/cases/useCases'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import type { Equipment } from '@/features/equipment/model'
import { deletePackage, fetchPackages, packageKeys, savePackage } from './api'
import { describePackage, PACKAGE_CATEGORIES, packageSchema, type EquipmentPackage, type PackageValues } from './model'

const EMPTY: PackageValues = { name: '', category: '', note: '', items: [], cases: [] }

function PackageForm({
  companyId,
  initial,
  equipment,
  cases,
  onDone,
}: {
  companyId: string
  initial: EquipmentPackage | null
  equipment: Equipment[]
  cases: { id: string; name: string }[]
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const categoryList = useId()
  const [values, setValues] = useState<PackageValues>(initial ?? EMPTY)
  const set = (patch: Partial<PackageValues>) => setValues((current) => ({ ...current, ...patch }))
  const parsed = packageSchema.safeParse(values)
  const save = useMutation({
    mutationFn: () => savePackage(companyId, initial?.id ?? null, packageSchema.parse(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: packageKeys.list(companyId) })
      onDone()
    },
  })
  const duplicate = (save.error as { code?: string } | null)?.code === '23505'

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Názov *" placeholder="napr. Malý zvukový balík" maxLength={120} value={values.name} onChange={(event) => set({ name: event.target.value })} />
        <Field label="Kategória" list={categoryList} placeholder="napr. Zvuk" maxLength={60} value={values.category} onChange={(event) => set({ category: event.target.value })} />
        <datalist id={categoryList}>
          {PACKAGE_CATEGORIES.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Celé cases</legend>
        {values.cases.map((caseId, index) => (
          <div key={index} className="flex items-end gap-2">
            <SelectField label="Case" hideLabel className="flex-1" value={caseId} onChange={(event) => set({ cases: values.cases.map((id, i) => (i === index ? event.target.value : id)) })}>
              <option value="">— vyberte case —</option>
              {cases.map((box) => (
                <option key={box.id} value={box.id}>
                  {box.name}
                </option>
              ))}
            </SelectField>
            <Button variant="ghost" aria-label={`Odobrať case ${index + 1}`} onClick={() => set({ cases: values.cases.filter((_, i) => i !== index) })}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="self-start" onClick={() => set({ cases: [...values.cases, ''] })}>
          <Plus className="size-4" aria-hidden />
          Pridať case
        </Button>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Technika</legend>
        {values.items.map((item, index) => (
          <div key={index} className="flex items-end gap-2">
            <SelectField
              label="Technika"
              hideLabel
              className="flex-1"
              value={item.equipmentId}
              onChange={(event) => set({ items: values.items.map((other, i) => (i === index ? { ...other, equipmentId: event.target.value } : other)) })}
            >
              <option value="">— vyberte techniku —</option>
              {equipment.map((piece) => (
                <option key={piece.id} value={piece.id}>
                  {piece.name} ({piece.quantity} ks)
                </option>
              ))}
            </SelectField>
            <Field
              label="Počet"
              hideLabel
              type="number"
              min={1}
              className="w-24"
              value={Number.isFinite(item.quantity) ? item.quantity : ''}
              onChange={(event) =>
                set({ items: values.items.map((other, i) => (i === index ? { ...other, quantity: event.target.value === '' ? Number.NaN : Number(event.target.value) } : other)) })
              }
            />
            <Button variant="ghost" aria-label={`Odobrať techniku ${index + 1}`} onClick={() => set({ items: values.items.filter((_, i) => i !== index) })}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="self-start" onClick={() => set({ items: [...values.items, { equipmentId: '', quantity: 1 }] })}>
          <Plus className="size-4" aria-hidden />
          Pridať techniku
        </Button>
      </fieldset>

      <TextareaField label="Poznámka" rows={2} maxLength={500} value={values.note} onChange={(event) => set({ note: event.target.value })} />

      {!parsed.success && values.name.trim() !== '' && <p className="text-sm text-destructive">Pri každom riadku vyberte techniku alebo case a zadajte počet.</p>}
      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          {duplicate ? 'Balík s týmto názvom už existuje.' : 'Uloženie zlyhalo. Ak ste ešte nespustili migráciu 0045, urobte to.'}
        </p>
      )}
      <div className="flex gap-2">
        <Button disabled={!parsed.success || values.items.length + values.cases.length === 0 || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Ukladám…' : 'Uložiť balík'}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Zrušiť
        </Button>
      </div>
    </div>
  )
}

/** Správa balíkov techniky (sady na event a výpožičku). */
export function PackagesSettings({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient()
  const packages = useQuery({ queryKey: packageKeys.list(companyId), queryFn: () => fetchPackages(companyId) })
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const cases = useCases(companyId)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const remove = useMutation({
    mutationFn: (id: string) => deletePackage(companyId, id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: packageKeys.list(companyId) }),
  })

  if (packages.isError) return <p className="text-sm text-destructive">Balíky sa nepodarilo načítať. Ak ste ešte nespustili migráciu 0045, urobte to.</p>
  if (!packages.data || !equipment.data || !cases.data) return <p className="text-sm text-muted-foreground">Načítavam…</p>
  const lendable = [...equipment.data].filter((item) => item.status !== 'retired').sort((a, b) => a.name.localeCompare(b.name, 'sk'))
  const caseList = [...cases.data].sort((a, b) => a.name.localeCompare(b.name, 'sk'))
  const form = (initial: EquipmentPackage | null) => (
    <PackageForm key={initial?.id ?? 'new'} companyId={companyId} initial={initial} equipment={lendable} cases={caseList} onDone={() => setEditing(null)} />
  )

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Balík je vopred poskladaná sada techniky a cases, napr. „Malý zvukový balík“. Pri evente alebo výpožičke ho pridáte jedným klikom.
      </p>
      {packages.data.length > 0 && (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {packages.data.map((pkg) =>
            editing === pkg.id ? (
              <li key={pkg.id} className="p-2">
                {form(pkg)}
              </li>
            ) : (
              <li key={pkg.id} className="flex items-center gap-3 px-4 py-3">
                <Package className="size-5 shrink-0 text-accent" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {pkg.name}
                    {pkg.category && <span className="ml-2 text-xs font-normal text-muted-foreground">{pkg.category}</span>}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">{describePackage(pkg, equipment.data, cases.data)}</span>
                </span>
                <Button variant="ghost" size="sm" aria-label={`Upraviť balík ${pkg.name}`} onClick={() => setEditing(pkg.id)}>
                  <Pencil className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Zmazať balík ${pkg.name}`}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Zmazať balík „${pkg.name}“? Technika ostane, zmaže sa len balík.`)) remove.mutate(pkg.id)
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            ),
          )}
        </ul>
      )}
      {editing === 'new' ? (
        form(null)
      ) : (
        <Button variant="outline" className="self-start" onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden />
          Nový balík
        </Button>
      )}
    </div>
  )
}
