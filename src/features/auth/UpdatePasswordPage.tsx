import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BackendRequired } from '@/components/feedback/BackendRequired'
import { LoadingScreen } from '@/components/feedback/LoadingScreen'
import { Button } from '@/components/ui/button'
import { PasswordField } from '@/components/ui/field'
import { getSupabase } from '@/lib/supabase/client'
import { useAuth } from './auth-context'
import { tx, useLang } from '@/lib/i18n'
import { PasswordHint } from './PasswordHint'
import { PASSWORD_MIN, passwordOk } from './passwordRules'

function UpdatePasswordForm() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lang = useLang()

  if (loading) return <LoadingScreen />
  // Odkaz z e-mailu prihlási používateľa; bez session je odkaz neplatný alebo expirovaný.
  if (!session) {
    return (
      <div className="rounded-2xl border bg-surface p-6 text-center">
        <p className="mb-4">{tx('Odkaz na obnovu hesla je neplatný alebo už vypršal.')}</p>
        <Link to="/auth" className="font-medium text-accent hover:underline">{tx('Späť na prihlásenie')}</Link>
      </div>
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!passwordOk(password)) return setError(tx('Heslo nespĺňa požiadavky pod políčkom.'))
    setBusy(true)
    setError(null)
    const { error } = await getSupabase().auth.updateUser({ password })
    setBusy(false)
    if (error) setError(error.code === 'weak_password' ? tx('Heslo je príliš slabé – potrebuje aspoň 10 znakov, malé a veľké písmeno, číslicu a symbol.') : tx('Heslo sa nepodarilo zmeniť. Skúste iné alebo to zopakujte.'))
    else navigate('/', { replace: true })
  }

  return (
    <div className="rounded-2xl border bg-surface p-6">
      <h1 className="mb-5 text-xl font-semibold">{tx('Nové heslo')}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <PasswordField
          label={tx('Nové heslo')}
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordHint password={password} lang={lang === 'en' ? 'en' : 'sk'} />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? tx('Čakajte…') : tx('Uložiť heslo')}
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
