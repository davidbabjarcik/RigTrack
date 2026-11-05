import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { BackendRequired } from '@/components/feedback/BackendRequired'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { getSupabase } from '@/lib/supabase/client'
import { useAuth } from './auth-context'
import { formatRemaining, loginLockStatus, signInGuarded, TURNSTILE_SITE_KEY, type Lock } from './loginGuard'
import { Turnstile, type TurnstileHandle } from './Turnstile'
import { useLang, useT } from '@/lib/i18n'

type Mode = 'signin' | 'signup' | 'reset'

const TITLES: Record<Mode, [string, string]> = {
  signin: ['Prihlásenie', 'Sign in'],
  signup: ['Vytvorenie účtu z pozvánky', 'Create an account from an invitation'],
  reset: ['Obnova hesla', 'Reset password'],
}

const SUBMIT_LABELS: Record<Mode, [string, string]> = {
  signin: ['Prihlásiť sa', 'Sign in'],
  signup: ['Vytvoriť účet', 'Create account'],
  reset: ['Poslať odkaz', 'Send link'],
}

/** Hlášky zo servera prihlásenia (sú po slovensky) v angličtine. */
const SERVER_EN: Record<string, string> = {
  'Nesprávny e-mail alebo heslo.': 'Wrong e-mail or password.',
  'Najprv potvrďte e-mail odkazom, ktorý sme vám poslali.': 'Please confirm your e-mail first using the link we sent you.',
  'Overenie, že nie ste robot, zlyhalo. Skúste to znova.': 'The human check failed. Please try again.',
  'Príliš veľa pokusov. Skúste to o chvíľu.': 'Too many attempts. Try again in a moment.',
  'Prihlásenie zlyhalo. Skúste to znova.': 'Sign-in failed. Please try again.',
  'Prihlásenie zlyhalo – skontrolujte pripojenie a skúste to znova.': 'Sign-in failed – check your connection and try again.',
  'Prihlásenie sa teraz nedá overiť. Skúste to o chvíľu.': 'Sign-in cannot be verified right now. Try again in a moment.',
  'Zadajte e-mail a heslo.': 'Enter your e-mail and password.',
}

function AuthForm() {
  // ?mode=signup (z úvodnej stránky „Mám pozvánku“) otvorí rovno vytvorenie účtu.
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>(() => (params.get('mode') === 'signup' ? 'signup' : 'signin'))
  const t = useT()
  const lang = useLang()
  const pick = (pair: [string, string]) => t(pair[0], pair[1])
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
      setError(t('Počkajte na overenie, že nie ste robot.', 'Please wait for the human check.'))
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
        } else setError(lang === 'en' ? (SERVER_EN[result.message] ?? result.message) : result.message)
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
            ? t('Heslo je príliš slabé. Zvoľte dlhšie.', 'The password is too weak. Choose a longer one.')
            : error.code === 'captcha_failed'
              ? t('Overenie, že nie ste robot, zlyhalo. Skúste to znova.', 'The human check failed. Please try again.')
            : error.status === 403 || /pozv/i.test(error.message)
              ? t('Pre tento e-mail nemáme pozvánku. Účet sa dá vytvoriť len s e-mailom, na ktorý vás pozval admin firmy.', 'There is no invitation for this e-mail. You can only create an account with the e-mail your company admin invited.')
              : t('Vytvorenie účtu zlyhalo. Skúste to znova.', 'Creating the account failed. Please try again.'),
        )
      } else {
        setNotice(t('Poslali sme vám e-mail s potvrdzovacím odkazom. Po potvrdení sa môžete prihlásiť.', 'We sent you an e-mail with a confirmation link. After confirming you can sign in.'))
        setMode('signin')
        setPassword('')
      }
    } else {
      const { error } = await auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/update-password`, captchaToken })
      if (error) setError(error.code === 'captcha_failed' ? t('Overenie, že nie ste robot, zlyhalo. Skúste to znova.', 'The human check failed. Please try again.') : t('Odoslanie zlyhalo. Skúste to znova o chvíľu.', 'Sending failed. Try again in a moment.'))
      else setNotice(t('Ak účet s týmto e-mailom existuje, poslali sme naň odkaz na nastavenie nového hesla.', 'If an account with this e-mail exists, we sent it a link to set a new password.'))
    }
    setBusy(false)
  }

  return (
    <div className="rounded-2xl border bg-surface p-6">
      <h1 className="mb-5 text-xl font-semibold">{pick(TITLES[mode])}</h1>

      {mode === 'signup' && (
        <p className="mb-4 rounded-lg bg-muted p-3 text-sm">
          {t(
            'RigTrack funguje len na pozvánky. Účet si vytvoríte s e-mailom, na ktorý vás pozval admin firmy – po prihlásení pozvánku uvidíte.',
            'RigTrack works by invitation only. Create your account with the e-mail your company admin invited – you will see the invitation after signing in.',
          )}
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === 'signup' && (
          <Field
            label={t('Meno a priezvisko', 'Full name')}
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
              {t('Mám aspoň 16 rokov a súhlasím s', 'I am at least 16 years old and agree to the')}{' '}
              <a href={`${import.meta.env.BASE_URL}podmienky-pouzivania`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                {t('podmienkami používania', 'terms of use')}
              </a>
              . {t('Ako narábame s údajmi:', 'How we handle data:')}{' '}
              <a href={`${import.meta.env.BASE_URL}ochrana-sukromia`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                {t('ochrana súkromia', 'privacy policy')}
              </a>
              .
            </span>
          </label>
        )}
        {mode !== 'reset' && (
          <Field
            label={t('Heslo', 'Password')}
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
            <p className="text-destructive">
              {t(
                'Príliš veľa neúspešných pokusov o prihlásenie. Z bezpečnostných dôvodov je prihlasovanie dočasne zablokované.',
                'Too many failed sign-in attempts. For security reasons signing in is temporarily blocked.',
              )}
            </p>
            <p className="mt-1">
              {t('Skúste to znova o', 'Try again in')} <span className="font-mono text-base font-semibold tabular-nums">{formatRemaining(lock.until - now)}</span>
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
          {busy
            ? t('Čakajte…', 'Please wait…')
            : needsCaptcha && !captcha && !locked
              ? t('Overujem…', 'Verifying…')
              : locked && lock
                ? `${t('Zablokované', 'Blocked')} – ${formatRemaining(lock.until - now)}`
                : pick(SUBMIT_LABELS[mode])}
        </Button>
      </form>

      <div className="mt-5 flex flex-col items-start gap-2 text-sm">
        {mode !== 'signin' && (
          <button type="button" className="text-accent hover:underline" onClick={() => switchMode('signin')}>
            {t('Mám účet — prihlásiť sa', 'I have an account — sign in')}
          </button>
        )}
        {mode !== 'signup' && (
          <button type="button" className="text-accent hover:underline" onClick={() => switchMode('signup')}>
            {t('Mám pozvánku – vytvoriť účet', 'I have an invitation – create an account')}
          </button>
        )}
        {mode === 'signin' && (
          <button type="button" className="text-accent hover:underline" onClick={() => switchMode('reset')}>
            {t('Zabudnuté heslo', 'Forgot password')}
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
