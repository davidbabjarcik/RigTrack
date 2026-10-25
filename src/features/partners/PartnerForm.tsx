import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building, Search, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, TextareaField } from '@/components/ui/field'
import { VatPayerField } from '@/features/companies/VatPayerField'
import { useAuth } from '@/features/auth/auth-context'
import { companyKeys } from '@/features/companies/api'
import { createPartnerCompany } from '@/features/companies/partnerCompany'
import { cn } from '@/lib/utils'
import { deletePartner, findRigTrackCompanies, linkPartnerCompany, partnerKeys, savePartner, type Partner, type PartnerFields } from './api'

type AppChoice = 'none' | 'linked' | 'found'
const CHOICES: { id: AppChoice; label: string; hint: string }[] = [
  { id: 'none', label: 'Nepoužívajú', hint: '' },
  { id: 'linked', label: 'Už majú firmu v RigTracku', hint: 'Nájdeme ju podľa IČO alebo názvu a prepojíme.' },
  { id: 'found', label: 'Založiť im firmu', hint: 'Budete v nej admin a pozvete ich ľudí; IČO, DIČ a adresa sa prenesú.' },
]

/** Pridanie a úprava firmy / skupiny (organizátor, partner) aj s väzbou na RigTrack. Vráti id po uložení. */
export function PartnerForm({ companyId, current, onDone }: { companyId: string; current: Partner | null; onDone: (id?: string) => void }) {
  const queryClient = useQueryClient()
  const userId = useAuth().session?.user.id ?? ''
  const [fields, setFields] = useState<PartnerFields>({
    name: current?.name ?? '',
    legalName: current?.legalName ?? '',
    ico: current?.ico ?? '',
    dic: current?.dic ?? '',
    icDph: current?.icDph ?? '',
    ceo: current?.ceo ?? '',
    address: current?.address ?? '',
    usesApp: current?.usesApp ?? false,
    note: current?.note ?? '',
  })
  const linkable = current?.linkedCompanyId !== undefined || !current
  const [choice, setChoice] = useState<AppChoice>(current?.linkedCompanyId || current?.usesApp ? 'linked' : 'none')
  const [picked, setPicked] = useState<string | null>(current?.linkedCompanyId ?? null)
  const [lookup, setLookup] = useState({ ico: '', name: '', legalName: '' })
  const found = useQuery({
    queryKey: ['rigtrack-companies', lookup],
    queryFn: () => findRigTrackCompanies(lookup.ico, lookup.name, lookup.legalName),
    enabled: Boolean(lookup.ico || lookup.name || lookup.legalName),
    retry: false,
  })
  const search = () => setLookup({ ico: fields.ico.trim(), name: fields.name.trim(), legalName: (fields.legalName ?? '').trim() })
  // Firma s rovnakým IČO / názvom už v RigTracku je – ponúkneme prepojenie aj keď je zvolené „Nepoužívajú“.
  const matches = (found.data ?? []).filter((company) => company.id !== companyId)

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: partnerKeys.list(companyId) }),
      queryClient.invalidateQueries({ queryKey: companyKeys.memberships(userId) }),
    ])
  const save = useMutation({
    mutationFn: async () => {
      const id = await savePartner(companyId, current?.id ?? null, { ...fields, usesApp: choice !== 'none' })
      if (!linkable) return id
      const linked = current?.linkedCompanyId ?? null
      if (choice === 'linked' && picked && picked !== linked) await linkPartnerCompany(id, picked)
      if (choice === 'none' && linked) await linkPartnerCompany(id, null)
      if (choice === 'found' && !linked) await createPartnerCompany(id)
      return id
    },
    onSuccess: async (id) => (await refresh(), onDone(id)),
  })
  const remove = useMutation({ mutationFn: () => deletePartner(current!.id), onSuccess: async () => (await refresh(), onDone()) })
  const set = (patch: Partial<PartnerFields>) => setFields({ ...fields, ...patch })
  function submit(event: FormEvent) {
    event.preventDefault()
    if (fields.name.trim()) save.mutate()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Názov firmy / skupiny *" placeholder="ako firmu voláte" autoFocus maxLength={160} value={fields.name} onChange={(event) => set({ name: event.target.value })} onBlur={search} />
        <Field label="Obchodné meno" placeholder="napr. Firma s.r.o." maxLength={160} value={fields.legalName} onChange={(event) => set({ legalName: event.target.value })} onBlur={search} />
        <Field label="IČO" maxLength={20} value={fields.ico} onChange={(event) => set({ ico: event.target.value })} onBlur={search} />
        <Field label="DIČ" maxLength={20} value={fields.dic} onChange={(event) => set({ dic: event.target.value })} />
        <VatPayerField value={fields.icDph ?? ''} onChange={(icDph) => set({ icDph })} />
        <Field label="CEO / konateľ" maxLength={120} value={fields.ceo} onChange={(event) => set({ ceo: event.target.value })} />
        <Field label="Adresa" className="sm:col-span-2" placeholder="napr. Ulica 1, Mesto" maxLength={200} value={fields.address} onChange={(event) => set({ address: event.target.value })} />
      </div>

      {linkable && (
        <fieldset className="rounded-lg border p-3">
          <legend className="px-1 text-sm font-medium">RigTrack</legend>
          <div role="radiogroup" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1 sm:inline-flex">
            {CHOICES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={choice === item.id}
                onClick={() => {
                  setChoice(item.id)
                  if (item.id === 'linked') search()
                }}
                className={cn('rounded-md px-3 py-1.5 text-sm font-medium', choice === item.id ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                {item.label}
              </button>
            ))}
          </div>
          {CHOICES.find((item) => item.id === choice)?.hint && <p className="mt-2 text-xs text-muted-foreground">{CHOICES.find((item) => item.id === choice)!.hint}</p>}

          {choice === 'none' && matches.length > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 p-2 text-sm">
              <Building className="size-4 text-accent" aria-hidden />
              Firma „{matches[0].name}“ už v RigTracku je.
              <Button size="sm" variant="outline" onClick={() => (setChoice('linked'), setPicked(matches[0].id))}>
                Prepojiť
              </Button>
            </p>
          )}

          {choice === 'linked' && (
            <div className="mt-2 flex flex-col gap-2">
              {current?.linkedCompanyId && picked === current.linkedCompanyId && <p className="text-sm text-muted-foreground">Prepojené s ich firmou v RigTracku.</p>}
              {found.isFetching ? (
                <p className="text-sm text-muted-foreground">Hľadám…</p>
              ) : matches.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {matches.map((company) => (
                    <li key={company.id}>
                      <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted">
                        <input type="radio" name="rigtrack-company" className="size-4" checked={picked === company.id} onChange={() => setPicked(company.id)} />
                        <span className="font-medium">{company.name}</span>
                        {company.legalName && company.legalName !== company.name && <span className="text-muted-foreground">({company.legalName})</span>}
                      </label>
                    </li>
                  ))}
                </ul>
              ) : (
                !current?.linkedCompanyId && (
                  <p className="text-sm text-muted-foreground">
                    {lookup.ico || lookup.name ? 'V RigTracku sme firmu s týmto IČO ani názvom nenašli. Doplňte IČO, alebo im ju založte.' : 'Zadajte názov alebo IČO a stlačte Hľadať.'}
                  </p>
                )
              )}
              <Button size="sm" variant="outline" className="self-start" onClick={search}>
                <Search className="size-4" aria-hidden />
                Hľadať v RigTracku
              </Button>
            </div>
          )}
          {choice === 'found' && current?.linkedCompanyId && <p className="mt-2 text-sm text-muted-foreground">Už sú prepojení s firmou v RigTracku.</p>}
        </fieldset>
      )}

      <TextareaField label="Poznámka" rows={2} maxLength={1000} value={fields.note} onChange={(event) => set({ note: event.target.value })} />
      {(save.isError || remove.isError) && <p className="text-sm text-destructive">Nepodarilo sa uložiť. Táto časť databázy ešte nemusí byť pripravená – kontaktujte vývojára aplikácie.</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={!fields.name.trim() || save.isPending || (choice === 'linked' && !picked && !current?.linkedCompanyId)}>
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
