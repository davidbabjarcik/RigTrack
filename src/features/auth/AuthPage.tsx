import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { BackendRequired } from '@/components/feedback/BackendRequired'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { getSupabase } from '@/lib/supabase/client'
import { useAuth } from './auth-context'

type Mode = 'signin' | 'signup' | 'reset'

const TITLES: Record<Mode, string> = {
  signin: 'Prihlásenie',
  signup: 'Registrácia',
  reset: 'Obnova hesla',
}

const SUBMIT_LABELS: Record<Mode, string> = {
  signin: 'Prihlásiť sa',
  signup: 'Vytvoriť účet',
  reset: 'Poslať odkaz',
}

function AuthForm() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    const auth = getSupabase().auth
    // Adresa appky vrátane podpriečinka (GitHub Pages), kam má e-mail z prihlásenia viesť.
    const origin = `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, '')

    // Hlásenia zámerne neprezrádzajú, či účet s daným e-mailom existuje.
    if (mode === 'signin') {
      const { error } = await auth.signInWithPassword({ email, password })
      if (error) {
        setError(
          error.code === 'email_not_confirmed'
            ? 'Najprv potvrďte e-mail odkazom, ktorý sme vám poslali.'
            : error.status === 400
              ? 'Nesprávny e-mail alebo heslo.'
              : 'Prihlásenie zlyhalo. Skúste to znova.',
        )
      }
    } else if (mode === 'signup') {
      const { error } = await auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName.trim() }, emailRedirectTo: origin },
      })
      if (error) {
        setError(
          error.code === 'weak_password' ? 'Heslo je príliš slabé. Zvoľte dlhšie.' : 'Registrácia zlyhala. Skúste to znova.',
        )
      } else {
        setNotice('Poslali sme vám e-mail s potvrdzovacím odkazom. Po potvrdení sa môžete prihlásiť.')
        setMode('signin')
        setPassword('')
      }
    } else {
      const { error } = await auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/update-password` })
      if (error) setError('Odoslanie zlyhalo. Skúste to znova o chvíľu.')
      else setNotice('Ak účet s týmto e-mailom existuje, poslali sme naň odkaz na nastavenie nového hesla.')
    }
    setBusy(false)
  }

  return (
    <div className="rounded-2xl border bg-surface p-6">
      <h1 className="mb-5 text-xl font-semibold">{TITLES[mode]}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === 'signup' && (
          <Field
            label="Meno a priezvisko"
            autoComplete="name"
            required
            maxLength={120}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        )}
        <Field
          label="E-mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode !== 'reset' && (
          <Field
            label="Heslo"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={mode === 'signup' ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-lg bg-muted p-3 text-sm">
            {notice}
          </p>
        )}

        <Button type="submit" disabled={busy}>
          {busy ? 'Čakajte…' : SUBMIT_LABELS[mode]}
        </Button>
      </form>

      <div className="mt-5 flex flex-col items-start gap-2 text-sm">
        {mode !== 'signin' && (
          <button type="button" className="text-accent hover:underline" onClick={() => switchMode('signin')}>
            Mám účet — prihlásiť sa
          </button>
        )}
        {mode !== 'signup' && (
          <button type="button" className="text-accent hover:underline" onClick={() => switchMode('signup')}>
            Vytvoriť nový účet
          </button>
        )}
        {mode === 'signin' && (
          <button type="button" className="text-accent hover:underline" onClick={() => switchMode('reset')}>
            Zabudnuté heslo
          </button>
        )}
      </div>
    </div>
  )
}

export function AuthPage() {
  const { session } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (session) return <Navigate to={from} replace />
  return (
    <BackendRequired>
      <AuthForm />
    </BackendRequired>
  )
}
