import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { profileKey, saveProfile, useCompanyProfile, type CompanyProfile } from './profile'

/** Údaje o firme: IČO, DIČ, adresa, CEO, kontakt a adresa skladu (odkiaľ sa rátajú km na akcie). */
export function CompanyProfileSettings({ companyId, canEdit }: { companyId: string; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const profile = useCompanyProfile(companyId)
  const [draft, setDraft] = useState<CompanyProfile | null>(null)
  const save = useMutation({
    mutationFn: (values: CompanyProfile) => saveProfile(companyId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileKey(companyId) })
      setDraft(null)
    },
  })
  if (profile.isPending) return <p className="text-sm text-muted-foreground">Načítavam…</p>
  if (profile.isError) return <p className="text-sm text-destructive">Údaje o firme sa nepodarilo načítať. Ak ste ešte nespustili migráciu 0059, urobte to.</p>
  const values = draft ?? profile.data
  const set = (patch: Partial<CompanyProfile>) => setDraft({ ...values, ...patch })
  const field = (label: string, key: keyof CompanyProfile, extra: { placeholder?: string; type?: string; className?: string } = {}) => (
    <Field label={label} disabled={!canEdit} value={values[key]} onChange={(event) => set({ [key]: event.target.value })} {...extra} />
  )
  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate(values)
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {field('Obchodné meno', 'legalName', { placeholder: 'napr. JEF Production s.r.o.', className: 'sm:col-span-2' })}
        {field('IČO', 'ico')}
        {field('DIČ', 'dic')}
        {field('IČ DPH', 'icDph')}
        {field('CEO / konateľ', 'ceoName')}
        {field('Sídlo / adresa', 'address', { className: 'sm:col-span-2' })}
        {field('Telefón', 'phone', { type: 'tel' })}
        {field('E-mail', 'email', { type: 'email' })}
        {field('Web', 'web', { placeholder: 'https://', className: 'sm:col-span-2' })}
        {field('Adresa skladu', 'warehouseAddress', { placeholder: 'napr. Šarišská, Stropkov', className: 'sm:col-span-2' })}
      </div>
      <p className="text-xs text-muted-foreground">Z adresy skladu sa pri evente vypočítajú kilometre na akciu. Údaje môže meniť admin firmy.</p>
      {save.isError && <p className="text-sm text-destructive">Uloženie zlyhalo.</p>}
      {canEdit && (
        <Button type="submit" size="sm" className="self-start" disabled={!draft || save.isPending}>
          {save.isPending ? 'Ukladám…' : 'Uložiť údaje o firme'}
        </Button>
      )}
    </form>
  )
}
