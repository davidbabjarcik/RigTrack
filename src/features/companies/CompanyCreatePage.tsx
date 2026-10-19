import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { companyKeys, createCompany } from './api'
import { fetchSuggestedProfiles, saveSuggestedProfile, type SuggestedProfile } from './partnerCompany'
import { useCompany } from './company-context'

export function CompanyCreatePage() {
  const { session } = useAuth()
  const { setActive } = useCompany()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [profile, setProfile] = useState<SuggestedProfile | null>(null)
  // Firmy, kde je človek zapísaný ako kontakt, ponúknu svoje údaje (bez migrácie 0064 nič).
  const suggestions = useQuery({ queryKey: ['suggested-company-profiles'], queryFn: fetchSuggestedProfiles, retry: false })

  const create = useMutation({
    mutationFn: async (companyName: string) => {
      const id = await createCompany(companyName)
      if (profile) await saveSuggestedProfile(id, profile).catch(() => {})
      return id
    },
    onSuccess: async (companyId) => {
      await queryClient.invalidateQueries({ queryKey: companyKeys.memberships(session!.user.id) })
      setActive(companyId)
      navigate('/')
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    create.mutate(name.trim())
  }

  return (
    <div className="rounded-2xl border bg-surface p-6">
      <h1 className="mb-1 text-xl font-semibold">Nová firma</h1>
      <p className="mb-5 text-sm text-muted-foreground">Stanete sa jej adminom a môžete pozvať ďalších členov.</p>
      {(suggestions.data ?? []).length > 0 && (
        <div className="mb-4 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
          <p className="font-medium">Návrh z firiem, s ktorými spolupracujete:</p>
          <ul className="mt-2 flex flex-col gap-2">
            {suggestions.data!.map((item) => (
              <li key={`${item.name}-${item.ico}`} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {item.name}
                  <span className="text-muted-foreground">{[item.ico && ` · IČO ${item.ico}`, item.address && ` · ${item.address}`].filter(Boolean).join('')}</span>
                </span>
                <Button
                  variant={profile === item ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setProfile(item)
                    setName(item.name)
                  }}
                >
                  {profile === item ? 'Použité' : 'Použiť'}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="Názov firmy"
          required
          maxLength={120}
          pattern=".*\S.*"
          title="Zadajte názov firmy"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {create.isError && (
          <p role="alert" className="text-sm text-destructive">
            Firmu sa nepodarilo vytvoriť. Skúste to znova.
          </p>
        )}
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Vytváram…' : 'Vytvoriť firmu'}
        </Button>
      </form>
      <Link to="/company/select" className="mt-5 inline-block text-sm text-accent hover:underline">
        Späť na výber firmy
      </Link>
    </div>
  )
}
