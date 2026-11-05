import { useMutation } from '@tanstack/react-query'
import { Download, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { downloadText } from '@/lib/download'
import { getSupabase } from '@/lib/supabase/client'
import { tx } from '@/lib/i18n'

/** GDPR: stiahnuť svoje osobné údaje (JSON) a zmazať svoj účet po potvrdení e-mailom. */
export function MyDataSettings({ email }: { email: string }) {
  const [confirm, setConfirm] = useState('')
  const [asking, setAsking] = useState(false)
  const exportData = useMutation({
    mutationFn: async () => {
      const { data, error } = await getSupabase().rpc('export_my_data')
      if (error) throw error
      downloadText(`rigtrack-moje-udaje-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json')
    },
  })
  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await getSupabase().rpc('delete_my_account', { _confirm_email: confirm })
      if (error) throw error
      await getSupabase().auth.signOut()
    },
  })

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-surface p-4 text-sm">
      <p className="text-muted-foreground">{tx('Kópia vašich osobných údajov zo všetkých firiem (profil, zariadenia, dochádzka, súhlasy…). Údaje firmy (technika, eventy) exportuje admin v Nastaveniach → Import a export. Viac v')}{' '}<Link to="/ochrana-sukromia" className="text-accent hover:underline">{tx('Ochrane súkromia')}</Link>.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={exportData.isPending} onClick={() => exportData.mutate()}>
          <Download className="size-4" aria-hidden />
          {exportData.isPending ? 'Pripravujem…' : tx('Stiahnuť moje údaje (JSON)')}
        </Button>
        {!asking && (
          <Button variant="destructive" size="sm" onClick={() => setAsking(true)}>
            <Trash2 className="size-4" aria-hidden />{tx('Zmazať môj účet')}</Button>
        )}
      </div>
      {exportData.isError && <p className="text-destructive">{tx('Údaje sa nepodarilo pripraviť (treba migráciu 0136).')}</p>}
      {asking && (
        <form
          className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3"
          onSubmit={(event) => {
            event.preventDefault()
            remove.mutate()
          }}
        >
          <p>{tx('Zmaže sa váš účet, osobný profil, zariadenia, dochádzka a odbery upozornení. Záznamy firmy (karta zamestnanca, výkazy, história zmien) ostanú vo firme bez prepojenia na účet. Nedá sa to vrátiť. Pre potvrdenie napíšte svoj e-mail')}{' '}<strong>{email}</strong>:
          </p>
          <input aria-label={tx('Potvrdenie e-mailom')} className="h-9 rounded-lg border bg-background px-2" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="destructive" size="sm" disabled={remove.isPending || confirm.trim().toLowerCase() !== email.toLowerCase()}>{tx('Natrvalo zmazať účet')}</Button>
            <Button variant="ghost" size="sm" onClick={() => setAsking(false)}>{tx('Zrušiť')}</Button>
          </div>
          {remove.isError && <p className="text-destructive">{(remove.error as { message?: string }).message ?? tx('Účet sa nepodarilo zmazať.')}</p>}
        </form>
      )}
    </div>
  )
}
