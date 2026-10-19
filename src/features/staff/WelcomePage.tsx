import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { saveStaff, setStaffPhoto, staffKeys } from './api'
import { useStaff } from './useStaff'

/**
 * Úvodný dotazník po prvom prihlásení do firmy: telefón, e-mail, fotka, pozícia, narodeniny.
 * Všetko sa zapíše do karty zamestnanca (Zamestnanci); neskôr sa dá upraviť tam.
 */
export function WelcomePage() {
  const company = useCompany().active!
  const session = useAuth().session!
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const staff = useStaff(company.companyId)
  const me = staff.people.find((person) => person.memberId === session.user.id)
  const [fields, setFields] = useState<{ phone: string; email: string; position: string; birthDate: string } | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const save = useMutation({
    mutationFn: async (skip: boolean) => {
      const values = fields ?? { phone: me?.phone ?? '', email: me?.email || session.user.email || '', position: me?.position ?? '', birthDate: me?.birthDate ?? '' }
      const staffId = await saveStaff(company.companyId, me?.staffId ?? null, session.user.id, {
        name: '',
        position: skip ? (me?.position ?? '') : values.position,
        phone: skip ? (me?.phone ?? '') : values.phone,
        email: skip ? (me?.email ?? '') : values.email,
        skills: me?.skills ?? '',
        note: me?.note ?? '',
        active: me?.active ?? true,
        ...(skip ? {} : { birthDate: values.birthDate }),
        onboarded: true,
      })
      if (!skip && photo) await setStaffPhoto(company.companyId, staffId, photo)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: staffKeys.list(company.companyId) })
      navigate('/', { replace: true })
    },
  })

  if (staff.isPending) return <LoadingBlock />
  const values = fields ?? { phone: me?.phone ?? '', email: me?.email || session.user.email || '', position: me?.position ?? '', birthDate: me?.birthDate ?? '' }
  const set = (patch: Partial<typeof values>) => setFields({ ...values, ...patch })
  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate(false)
  }

  return (
    <>
      <PageHeader title={`Vitajte vo firme ${company.companyName}`} description="Doplňte pár údajov o sebe. Uvidia ich kolegovia v Zamestnancoch." />
      <form onSubmit={submit} className="flex max-w-xl flex-col gap-4 rounded-xl border bg-surface p-4">
        <div className="flex items-center gap-4">
          <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
            {photo ? <img src={URL.createObjectURL(photo)} alt="Vaša fotka" className="size-full object-cover" /> : <Camera className="size-6 text-muted-foreground" aria-hidden />}
          </span>
          <Button variant="outline" size="sm" onClick={() => input.current?.click()}>
            <Camera className="size-4" aria-hidden />
            {photo ? 'Zmeniť fotku' : 'Pridať fotku'}
          </Button>
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) setPhoto(file)
            }}
          />
        </div>
        <Field label="Telefón" type="tel" autoComplete="tel" maxLength={40} value={values.phone} onChange={(event) => set({ phone: event.target.value })} />
        <Field label="E-mail na kontakt" type="email" autoComplete="email" maxLength={120} value={values.email} onChange={(event) => set({ email: event.target.value })} />
        <Field label="Pozícia" placeholder="napr. Osvetľovač, Zvukár, Stagehand, Vodič" maxLength={80} value={values.position} onChange={(event) => set({ position: event.target.value })} />
        <Field label="Dátum narodenia (nepovinné)" type="date" value={values.birthDate} onChange={(event) => set({ birthDate: event.target.value })} />
        <p className="text-xs text-muted-foreground">Rolu v aplikácii (čo smiete) nastavuje admin firmy. Ďalšie údaje (meniny, vodičák, zariadenia) doplníte v Zamestnancoch.</p>
        {save.isError && (
          <p role="alert" className="text-sm text-destructive">
            Uloženie zlyhalo. Ak admin ešte nespustil migráciu 0057, skúste to neskôr.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Ukladám…' : 'Uložiť a pokračovať'}
          </Button>
          <Button variant="ghost" disabled={save.isPending} onClick={() => save.mutate(true)}>
            Teraz nie
          </Button>
        </div>
      </form>
    </>
  )
}
