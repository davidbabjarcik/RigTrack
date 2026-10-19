import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchEmailNewEvent, prefsKey, saveEmailNewEvent } from './prefs'

/** Admin / CEO: chcem e-mail, keď niekto pridá nový event. */
export function EmailPrefs({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient()
  const pref = useQuery({ queryKey: prefsKey(companyId), queryFn: () => fetchEmailNewEvent(companyId), retry: false })
  const save = useMutation({
    mutationFn: (value: boolean) => saveEmailNewEvent(companyId, value),
    onSettled: () => queryClient.invalidateQueries({ queryKey: prefsKey(companyId) }),
  })
  return (
    <div className="rounded-xl border bg-surface p-4">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 size-4"
          checked={pref.data ?? false}
          disabled={!pref.isSuccess || save.isPending}
          onChange={(event) => save.mutate(event.target.checked)}
        />
        <span>
          <span className="block font-medium">E-mail pri novom evente</span>
          <span className="block text-sm text-muted-foreground">Keď niekto vo firme pridá event, príde vám e-mail s termínom a odkazom.</span>
        </span>
      </label>
      {(pref.isError || save.isError) && <p className="mt-2 text-sm text-destructive">Nastavenie sa nepodarilo načítať alebo uložiť. Ak ste ešte nespustili migráciu 0057, urobte to.</p>}
    </div>
  )
}
