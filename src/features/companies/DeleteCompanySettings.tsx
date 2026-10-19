import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { companyKeys } from './api'
import { useCompany } from './company-context'
import { deleteCompany } from './deleteCompany'

/** Natrvalo zmaže firmu aj so všetkými údajmi a súbormi. Len pre admina, s potvrdením názvom. */
export function DeleteCompanySettings({ userId }: { userId: string }) {
  const company = useCompany().active!
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const matches = name.trim() === company.companyName.trim()

  const remove = useMutation({
    mutationFn: () => deleteCompany(company.companyId, name),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ['company', company.companyId] })
      await queryClient.invalidateQueries({ queryKey: companyKeys.memberships(userId) })
      navigate('/company/select', { replace: true })
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (matches && window.confirm(`Naozaj natrvalo zmazať firmu „${company.companyName}“? Toto sa nedá vrátiť.`)) remove.mutate()
  }

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <p className="font-medium">Zmazať firmu</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Natrvalo zmaže firmu „{company.companyName}“ a všetko v nej: techniku, cases, eventy, výpožičky, vozidlá, servis, zamestnancov, štatistiky,
        históriu zmien, fotky, dokumenty a prílohy. Všetci členovia k nej stratia prístup. Nedá sa to vrátiť, ani z koša. Ak chcete mať kópiu,
        stiahnite si najprv zálohu.
      </p>
      {!open ? (
        <Button variant="destructive" size="sm" className="mt-3" onClick={() => setOpen(true)}>
          <Trash2 className="size-4" aria-hidden />
          Zmazať firmu…
        </Button>
      ) : (
        <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
          <Field
            label={`Pre potvrdenie napíšte názov firmy: ${company.companyName}`}
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {remove.isError && (
            <p role="alert" className="text-sm text-destructive">
              Firmu sa nepodarilo zmazať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="destructive" size="sm" disabled={!matches || remove.isPending}>
              <Trash2 className="size-4" aria-hidden />
              {remove.isPending ? 'Mažem…' : 'Natrvalo zmazať firmu'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={remove.isPending}
              onClick={() => {
                setOpen(false)
                setName('')
              }}
            >
              Zrušiť
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
