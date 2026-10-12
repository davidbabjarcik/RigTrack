import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { companyKeys, createCompany } from './api'
import { useCompany } from './company-context'

export function CompanyCreatePage() {
  const { session } = useAuth()
  const { setActive } = useCompany()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')

  const create = useMutation({
    mutationFn: createCompany,
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
