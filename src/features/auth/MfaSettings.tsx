import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, ShieldOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { tx } from '@/lib/i18n'
import { disableMfa, listTotpFactors, mfaKeys, startEnroll, verifyCode } from './mfa'

/**
 * Nastavenia → Účet: dvojfaktorové prihlásenie. Zapnutie: QR kód do aplikácie v mobile a overenie prvým kódom.
 * Odporúča sa hlavne adminom a CEO (faktúry, výplaty, celá firma).
 */
export function MfaSettings({ recommended }: { recommended: boolean }) {
  const queryClient = useQueryClient()
  const factors = useQuery({ queryKey: mfaKeys.factors, queryFn: listTotpFactors, retry: false })
  const [setup, setSetup] = useState<{ factorId: string; qr: string; secret: string } | null>(null)
  const [code, setCode] = useState('')
  const refresh = () => queryClient.invalidateQueries({ queryKey: mfaKeys.factors })
  const start = useMutation({ mutationFn: startEnroll, onSuccess: (value) => (setSetup(value), setCode('')) })
  const confirm = useMutation({
    mutationFn: () => verifyCode(setup!.factorId, code),
    onSuccess: () => {
      setSetup(null)
      void refresh()
    },
  })
  const disable = useMutation({ mutationFn: disableMfa, onSettled: refresh })
  const active = factors.data?.find((factor) => factor.verified)

  if (factors.isPending) return null
  if (factors.isError) return <p className="text-sm text-muted-foreground">{tx('Dvojfaktorové prihlásenie nie je v tejto inštalácii dostupné.')}</p>

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-surface p-4 text-sm">
      {active ? (
        <>
          <p className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="size-5" aria-hidden />
            {tx('Dvojfaktorové prihlásenie je zapnuté')}
            <span className="font-normal text-muted-foreground">({formatDate(active.createdAt.slice(0, 10))})</span>
          </p>
          <p className="text-muted-foreground">{tx('Pri prihlásení zadáte okrem hesla aj kód z aplikácie v mobile. Bez kódu sa k dátam nedostane nikto, ani s vaším heslom.')}</p>
          <div>
            <Button
              size="sm"
              variant="outline"
              disabled={disable.isPending}
              onClick={() => window.confirm(tx('Vypnúť dvojfaktorové prihlásenie? Účet bude chránený len heslom.')) && disable.mutate(active.id)}
            >
              <ShieldOff className="size-4" aria-hidden />{tx('Vypnúť')}
            </Button>
          </div>
          {disable.isError && <p role="alert" className="text-destructive">{tx('Nepodarilo sa vypnúť. Odhláste sa, prihláste s kódom a skúste znova.')}</p>}
        </>
      ) : setup ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (code.replace(/\s/g, '').length === 6) confirm.mutate()
          }}
        >
          <p className="font-medium">{tx('1. Naskenujte QR kód v aplikácii (Google Authenticator, Microsoft Authenticator, 1Password…)')}</p>
          <img src={setup.qr} alt={tx('QR kód pre aplikáciu na overenie')} className="size-48 rounded-lg bg-white p-2" />
          <p className="text-muted-foreground">
            {tx('Alebo zadajte kľúč ručne:')} <code className="rounded bg-muted px-1 py-0.5 break-all select-all">{setup.secret}</code>
          </p>
          <label className="flex flex-col gap-1 font-medium">
            {tx('2. Zadajte 6-miestny kód z aplikácie')}
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              className="h-11 w-40 rounded-lg border bg-background px-3 text-center text-xl tracking-[0.3em]"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/[^\d ]/g, ''))}
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={confirm.isPending || code.replace(/\s/g, '').length !== 6}>{tx('Zapnúť')}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSetup(null)}>{tx('Zrušiť')}</Button>
          </div>
          {confirm.isError && <p role="alert" className="text-destructive">{tx('Kód nesedí. Skontrolujte čas v mobile a zadajte aktuálny kód.')}</p>}
        </form>
      ) : (
        <>
          <p className="flex items-center gap-2 font-medium">
            <ShieldCheck className="size-5 text-muted-foreground" aria-hidden />
            {tx('Dvojfaktorové prihlásenie je vypnuté')}
          </p>
          <p className="text-muted-foreground">
            {tx('Okrem hesla aj kód z aplikácie v mobile – kto ukradne heslo, bez mobilu sa k dátam nedostane.')}
            {recommended && <strong className="text-foreground"> {tx('Ako admin alebo CEO máte prístup k celej firme – odporúčame zapnúť.')}</strong>}
          </p>
          <div>
            <Button size="sm" disabled={start.isPending} onClick={() => start.mutate()}>
              <ShieldCheck className="size-4" aria-hidden />{tx('Zapnúť dvojfaktorové prihlásenie')}
            </Button>
          </div>
          {start.isError && <p role="alert" className="text-destructive">{tx('Nepodarilo sa začať. Skúste znova o chvíľu.')}</p>}
        </>
      )}
    </div>
  )
}
