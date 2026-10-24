import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { LICENCES } from '@/features/staff/model'
import { NameDayField } from '@/features/staff/NameDayField'
import { SOCIAL_NETWORKS } from '@/features/staff/socials'
import { cn } from '@/lib/utils'
import { profileComplete, profileKeys, savePersonalProfile, usePersonalProfile, type PersonalProfile } from './api'

/** Môj profil pre všetky firmy: zadám raz, do kariet zamestnanca vo firmách sa prepíše sám. */
export function ProfileForm({ userId, accountEmail }: { userId: string; accountEmail: string }) {
  const queryClient = useQueryClient()
  const profile = usePersonalProfile(userId)
  const [draft, setDraft] = useState<PersonalProfile | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [saved, setSaved] = useState(false)
  const values: PersonalProfile = draft ?? { ...(profile.data ?? { fullName: '', phone: '', email: '', birthDate: '', nameDay: '', licences: [], homeAddress: '', socials: {} }) }
  const set = (patch: Partial<PersonalProfile>) => {
    setSaved(false)
    setDraft({ ...values, ...patch })
  }
  const save = useMutation({
    mutationFn: () => savePersonalProfile(userId, values, { exists: profile.data?.exists ?? false, homeAddress: profile.data?.homeAddress ?? '' }),
    onSuccess: async (found) => {
      setNotFound(!found)
      setSaved(true)
      setDraft(null)
      // Karty zamestnanca vo firmách sa zmenili v databáze – načítajú sa znova.
      await queryClient.invalidateQueries({ queryKey: profileKeys.mine(userId) })
      await queryClient.invalidateQueries({ queryKey: ['company'] })
    },
  })

  if (profile.isPending) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Načítavam profil…</p>
  if (profile.isError) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Osobný profil zatiaľ nie je dostupný. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.</p>

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <UserRound className="mt-0.5 size-4 shrink-0" aria-hidden />
        Zadáte raz a platí vo všetkých firmách – do vašej karty zamestnanca sa prepíše samo. Adresu domov vidíte len vy a kto spravuje tím.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Meno a priezvisko *" maxLength={120} autoComplete="name" value={values.fullName} onChange={(e) => set({ fullName: e.target.value })} />
        <Field label="Telefón *" type="tel" maxLength={40} autoComplete="tel" value={values.phone} onChange={(e) => set({ phone: e.target.value })} />
        <Field label="E-mail na kontakt" type="email" maxLength={120} placeholder={accountEmail} value={values.email} onChange={(e) => set({ email: e.target.value })} />
        <Field label="Dátum narodenia" type="date" value={values.birthDate} onChange={(e) => set({ birthDate: e.target.value })} />
        <NameDayField value={values.nameDay} onChange={(nameDay) => set({ nameDay })} />
        <Field label="Adresa domov (pre prácu doma)" maxLength={200} autoComplete="street-address" placeholder="ulica, mesto" value={values.homeAddress} onChange={(e) => set({ homeAddress: e.target.value })} />
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Vodičský preukaz</legend>
        <div className="flex flex-wrap gap-1.5">
          {LICENCES.map((licence) => {
            const on = values.licences.includes(licence)
            return (
              <button
                key={licence}
                type="button"
                aria-pressed={on}
                onClick={() => set({ licences: on ? values.licences.filter((item) => item !== licence) : [...values.licences, licence] })}
                className={cn('h-9 min-w-11 rounded-lg border px-2 text-sm font-medium', on ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
              >
                {licence}
              </button>
            )
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Sociálne siete</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {SOCIAL_NETWORKS.map((network) => (
            <Field
              key={network.key}
              label={network.label}
              maxLength={200}
              placeholder={network.key === 'web' ? 'www.mojweb.sk' : 'meno alebo odkaz'}
              value={values.socials[network.key] ?? ''}
              onChange={(e) => set({ socials: { ...values.socials, [network.key]: e.target.value } })}
            />
          ))}
        </div>
      </fieldset>
      {notFound && <p className="text-sm text-accent">Adresu domov sa nepodarilo nájsť na mape – napíšte ju presnejšie (ulica, číslo, mesto).</p>}
      {save.isError && <p role="alert" className="text-sm text-destructive">Profil sa nepodarilo uložiť.</p>}
      {saved && !save.isPending && <p role="status" className="text-sm text-muted-foreground">Uložené – karty zamestnanca vo firmách sú aktualizované.</p>}
      <Button type="submit" className="self-start" disabled={save.isPending || !profileComplete(values) || draft === null}>
        {save.isPending ? 'Ukladám…' : 'Uložiť profil'}
      </Button>
    </form>
  )
}
