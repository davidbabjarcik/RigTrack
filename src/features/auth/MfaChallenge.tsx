import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { getSupabase } from '@/lib/supabase/client'
import { tx } from '@/lib/i18n'
import { verifyLoginCode } from './mfa'

/** Po prihlásení heslom: 6-miestny kód z aplikácie v mobile. Bez neho appka (ani databáza) dáta neukáže. */
export function MfaChallenge({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const verify = useMutation({
    mutationFn: () => verifyLoginCode(code),
    onSuccess: async () => {
      // Dáta načítané pred zadaním kódu boli prázdne – načítať znova.
      await queryClient.invalidateQueries()
      onDone()
    },
  })
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
      <form
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border bg-surface p-6 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault()
          if (code.replace(/\s/g, '').length === 6) verify.mutate()
        }}
      >
        <ShieldCheck className="size-8 text-accent" aria-hidden />
        <div>
          <h1 className="text-xl font-semibold">{tx('Overenie kódom')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tx('Máte zapnuté dvojfaktorové prihlásenie. Zadajte 6-miestny kód z aplikácie v mobile (napr. Google Authenticator).')}</p>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {tx('Kód')}
          <input
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            className="h-12 rounded-lg border bg-background px-3 text-center text-2xl tracking-[0.4em]"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/[^\d ]/g, ''))}
          />
        </label>
        <Button type="submit" className="h-11" disabled={verify.isPending || code.replace(/\s/g, '').length !== 6}>
          {verify.isPending ? tx('Overujem…') : tx('Overiť')}
        </Button>
        {verify.isError && <p role="alert" className="text-sm text-destructive">{tx('Kód nesedí alebo vypršal. Skúste aktuálny kód.')}</p>}
        <button type="button" className="text-sm text-muted-foreground hover:text-foreground hover:underline" onClick={() => void getSupabase().auth.signOut()}>
          {tx('Odhlásiť sa')}
        </button>
      </form>
    </div>
  )
}
