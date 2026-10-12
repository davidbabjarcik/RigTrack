import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BackendRequired } from '@/components/feedback/BackendRequired'
import { LoadingScreen } from '@/components/feedback/LoadingScreen'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { getSupabase } from '@/lib/supabase/client'
import { useAuth } from './auth-context'

function UpdatePasswordForm() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return <LoadingScreen />
  // Odkaz z e-mailu prihlási používateľa; bez session je odkaz neplatný alebo expirovaný.
  if (!session) {
    return (
      <div className="rounded-2xl border bg-surface p-6 text-center">
        <p className="mb-4">Odkaz na obnovu hesla je neplatný alebo už vypršal.</p>
        <Link to="/auth" className="font-medium text-accent hover:underline">
          Späť na prihlásenie
        </Link>
      </div>
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await getSupabase().auth.updateUser({ password })
    setBusy(false)
    if (error) setError('Heslo sa nepodarilo zmeniť. Skúste iné alebo to zopakujte.')
    else navigate('/', { replace: true })
  }

  return (
    <div className="rounded-2xl border bg-surface p-6">
      <h1 className="mb-5 text-xl font-semibold">Nové heslo</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="Nové heslo"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? 'Čakajte…' : 'Uložiť heslo'}
        </Button>
      </form>
    </div>
  )
}

export function UpdatePasswordPage() {
  return (
    <BackendRequired>
      <UpdatePasswordForm />
    </BackendRequired>
  )
}
