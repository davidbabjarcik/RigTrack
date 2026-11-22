import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchEmailPrefs, prefsKey, saveEmailPref } from './prefs'
import { tx } from '@/lib/i18n'

/**
 * E-maily: týždenný prehľad (každý, obsah podľa jeho oprávnení) a pri novom evente (admin / CEO).
 */
export function EmailPrefs({ companyId, isAdmin }: { companyId: string; isAdmin: boolean }) {
  const queryClient = useQueryClient()
  const pref = useQuery({ queryKey: prefsKey(companyId), queryFn: () => fetchEmailPrefs(companyId), retry: false })
  const save = useMutation({
    mutationFn: (patch: { email_new_event?: boolean; email_weekly?: boolean }) => saveEmailPref(companyId, patch),
    onSettled: () => queryClient.invalidateQueries({ queryKey: prefsKey(companyId) }),
  })
  const disabled = !pref.isSuccess || save.isPending
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-surface p-4">
      {(!pref.isSuccess || pref.data.weeklyReady) && (
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-0.5 size-4" checked={pref.data?.weekly ?? false} disabled={disabled} onChange={(event) => save.mutate({ email_weekly: event.target.checked })} />
          <span>
            <span className="block font-medium">{tx('Týždenný prehľad e-mailom')}</span>
            <span className="block text-sm text-muted-foreground">{tx('V pondelok ráno: akcie na najbližší týždeň, moje úlohy, faktúry po splatnosti a servis – podľa toho, čo vo firme vidíte. Keď nie je nič, e-mail nepríde.')}</span>
          </span>
        </label>
      )}
      {isAdmin && (
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-0.5 size-4" checked={pref.data?.newEvent ?? false} disabled={disabled} onChange={(event) => save.mutate({ email_new_event: event.target.checked })} />
          <span>
            <span className="block font-medium">{tx('E-mail pri novom evente')}</span>
            <span className="block text-sm text-muted-foreground">{tx('Keď niekto vo firme pridá event, príde vám e-mail s termínom a odkazom.')}</span>
          </span>
        </label>
      )}
      {(pref.isError || save.isError) && <p className="text-sm text-destructive">{tx('Nastavenie sa nepodarilo načítať alebo uložiť. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.')}</p>}
    </div>
  )
}
