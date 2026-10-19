import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, TextareaField } from '@/components/ui/field'
import { deletePartner, partnerKeys, savePartner, type Partner, type PartnerFields } from './api'

/** Pridanie a úprava firmy / skupiny (organizátor, partner). Vráti id po uložení. */
export function PartnerForm({ companyId, current, onDone }: { companyId: string; current: Partner | null; onDone: (id?: string) => void }) {
  const queryClient = useQueryClient()
  const [fields, setFields] = useState<PartnerFields>({
    name: current?.name ?? '',
    ico: current?.ico ?? '',
    dic: current?.dic ?? '',
    address: current?.address ?? '',
    usesApp: current?.usesApp ?? false,
    note: current?.note ?? '',
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: partnerKeys.list(companyId) })
  const save = useMutation({ mutationFn: () => savePartner(companyId, current?.id ?? null, fields), onSuccess: async (id) => (await refresh(), onDone(id)) })
  const remove = useMutation({ mutationFn: () => deletePartner(current!.id), onSuccess: async () => (await refresh(), onDone()) })
  const set = (patch: Partial<PartnerFields>) => setFields({ ...fields, ...patch })
  function submit(event: FormEvent) {
    event.preventDefault()
    if (fields.name.trim()) save.mutate()
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Názov firmy / skupiny *" placeholder="napr. JESKO" className="sm:col-span-2" autoFocus maxLength={160} value={fields.name} onChange={(event) => set({ name: event.target.value })} />
        <Field label="IČO" maxLength={20} value={fields.ico} onChange={(event) => set({ ico: event.target.value })} />
        <Field label="DIČ" maxLength={20} value={fields.dic} onChange={(event) => set({ dic: event.target.value })} />
        <Field label="Adresa" className="sm:col-span-2" placeholder="napr. Medzilaborce" maxLength={200} value={fields.address} onChange={(event) => set({ address: event.target.value })} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" checked={fields.usesApp} onChange={(event) => set({ usesApp: event.target.checked })} />
        Používa aj RigTrack
      </label>
      <TextareaField label="Poznámka" rows={2} maxLength={1000} value={fields.note} onChange={(event) => set({ note: event.target.value })} />
      {(save.isError || remove.isError) && <p className="text-sm text-destructive">Nepodarilo sa uložiť. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={!fields.name.trim() || save.isPending}>
          {current ? 'Uložiť' : 'Pridať firmu'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDone()}>
          Zrušiť
        </Button>
        {current && (
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(`Odstrániť ${current.name} aj s kontaktmi?`)) remove.mutate()
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Odstrániť
          </Button>
        )}
      </div>
    </form>
  )
}
