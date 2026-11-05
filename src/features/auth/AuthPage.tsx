import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { BackendRequired } from '@/components/feedback/BackendRequired'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { getSupabase } from '@/lib/supabase/client'
import { useAuth } from './auth-context'
import { formatRemaining, loginLockStatus, signInGuarded, TURNSTILE_SITE_KEY, type Lock } from './loginGuard'
import { Turnstile, type TurnstileHandle } from './Turnstile'

type Mode = 'signin' | 'signup' | 'reset'

const TITLES: Record<Mode, string> = {
  signin: 'Prihlásenie',
  signup: 'Vytvorenie účtu z pozvánky',
  reset: 'Obnova hesla',
}

const SUBMIT_LABELS: Record<Mode, string> = {
  signin: 'Prihlásiť sa',
  signup: 'Vytvoriť účet',
  reset: 'Poslať odkaz',
}

function AuthForm() {
  // ?mode=signup (z úvodnej stránky „Mám pozvánku“) otvorí rovno vytvorenie účtu.
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>(() => (params.get('mode') === 'signup' ? 'signup' : 'signin'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  // Registrácia od 16 rokov (vek digitálneho súhlasu v SR, § 15 zákona č. 18/2018 Z. z.).
  const [adult, setAdult] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // Overenie, že nie ste robot (Cloudflare Turnstile) – token platí na jeden pokus.
  const [captcha, setCaptcha] = useState<string | null>(null)
  const captchaRef = useRef<TurnstileHandle>(null)
  const [captchaDown, setCaptchaDown] = useState(false)
  const needsCaptcha = TURNSTILE_SITE_KEY !== '' && !captchaDown
  // Blok po zlých pokusoch – koniec určuje server; tu sa len odpočítava.
  const [lock, setLock] = useState<Lock | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    let alive = true
    void loginLockStatus().then((value) => alive && setLock(value))
    return () => {
      alive = false
    }
  }, [])
  useEffect(() => {
    if (!lock) return
    const timer = window.setInterval(() => {
      setNow(Date.now())
      // Po uplynutí sa overí na serveri, či sa už dá prihlásiť.
      if (Date.now() >= lock.until) {
        window.clearInterval(timer)
        void loginLockStatus().then(setLock)
      }
    }, 500)
    return () => window.clearInterval(timer)
  }, [lock])
  const locked = mode === 'signin' && lock !== null && lock.until > now

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
    if (needsCaptcha && !captcha) {
      setError('Počkajte na overenie, že nie ste robot.')
      setBusy(false)
      return
    }
    const captchaToken = captcha ?? undefined
    // Token sa dá použiť len raz – na ďalší pokus treba nový.
    captchaRef.current?.reset()
    if (mode === 'signin') {
      if (locked) {
        setBusy(false)
        return
      }
      const result = await signInGuarded(email, password, captchaToken)
      if (!result.ok) {
        if (result.lock) {
          setLock(result.lock)
          setNow(Date.now())
          setPassword('')
        } else setError(result.message)
      }
    } else if (mode === 'signup') {
      const { error } = await auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName.trim(), age_confirmed: adult, terms_accepted_at: new Date().toISOString() }, emailRedirectTo: origin, captchaToken },
      })
      if (error) {
        setError(
          error.code === 'weak_password'
            ? 'Heslo je príliš slabé. Zvoľte dlhšie.'
            : error.code === 'captcha_failed'
              ? 'Overenie, že nie ste robot, zlyhalo. Skúste to znova.'
            : error.status === 403 || /pozv/i.test(error.message)
              ? 'Pre tento e-mail nemáme pozvánku. Účet sa dá vytvoriť len s e-mailom, na ktorý vás pozval admin firmy.'
              : 'Vytvorenie účtu zlyhalo. Skúste to znova.',
        )
      } else {
        setNotice('Poslali sme vám e-mail s potvrdzovacím odkazom. Po potvrdení sa môžete prihlásiť.')
        setMode('signin')
        setPassword('')
      }
    } else {
      const { error } = await auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/update-password`, captchaToken })
      if (error) setError(error.code === 'captcha_failed' ? 'Overenie, že nie ste robot, zlyhalo. Skúste to znova.' : 'Odoslanie zlyhalo. Skúste to znova o chvíľu.')
      else setNotice('Ak účet s týmto e-mailom existuje, poslali sme naň odkaz na nastavenie nového hesla.')
    }
    setBusy(false)
  }

  return (
    <div className="rounded-2xl border bg-surface p-6">
      <h1 className="mb-5 text-xl font-semibold">{TITLES[mode]}</h1>

      {mode === 'signup' && (
        <p className="mb-4 rounded-lg bg-muted p-3 text-sm">
          RigTrack funguje len na pozvánky. Účet si vytvoríte s e-mailom, na ktorý vás pozval admin firmy – po prihlásení pozvánku uvidíte.
        </p>
      )}
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
        {mode === 'signup' && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 size-4" required checked={adult} onChange={(e) => setAdult(e.target.checked)} />
            <span>
              Mám aspoň 16 rokov a súhlasím s{' '}
              <a href={`${import.meta.env.BASE_URL}podmienky-pouzivania`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                podmienkami používania
              </a>
              . Ako narábame s údajmi:{' '}
              <a href={`${import.meta.env.BASE_URL}ochrana-sukromia`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                ochrana súkromia
              </a>
              .
            </span>
          </label>
        )}
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

        {TURNSTILE_SITE_KEY !== '' && !locked && <Turnstile ref={captchaRef} onToken={setCaptcha} onUnavailable={setCaptchaDown} />}

        {locked && lock && (
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="text-destructive">Príliš veľa neúspešných pokusov o prihlásenie. Z bezpečnostných dôvodov je prihlasovanie dočasne zablokované.</p>
            <p className="mt-1">
              Skúste to znova o <span className="font-mono text-base font-semibold tabular-nums">{formatRemaining(lock.until - now)}</span>
            </p>
          </div>
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

        <Button type="submit" disabled={busy || locked || (needsCaptcha && !captcha)}>
          {busy ? 'Čakajte…' : needsCaptcha && !captcha && !locked ? 'Overujem…' : locked && lock ? `Zablokované – ${formatRemaining(lock.until - now)}` : SUBMIT_LABELS[mode]}
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
            Mám pozvánku – vytvoriť účet
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
