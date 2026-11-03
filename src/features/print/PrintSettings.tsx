import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMembers } from '@/features/companies/useMembers'
import { errorDetail } from '@/lib/supabase/errors'
import { cn } from '@/lib/utils'
import { clampQrMm, printKeys, QR_MM_MAX, QR_MM_MIN, QR_SIZE_LABELS, QR_SIZES, saveCompanyPrefs, useCompanyPrefs, type CompanyPrefs } from './api'

/**
 * Nastavenia → Zoznamy → Tlač a kľúčové slová: kam sa tlačia QR štítky (A4 alebo Brother), ich veľkosť na A4
 * a komu sa priradia úlohy z @todo a @toprint.
 */
export function PrintSettings({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient()
  const prefs = useCompanyPrefs(companyId)
  const members = useMembers(companyId)
  const save = useMutation({
    mutationFn: (patch: Partial<CompanyPrefs>) => saveCompanyPrefs(companyId, prefs.data ?? {}, patch),
    onSettled: () => queryClient.invalidateQueries({ queryKey: printKeys.prefs(companyId) }),
  })
  const current = prefs.data ?? {}
  const chip = (on: boolean) => cn('h-9 rounded-lg border px-3 text-sm', on ? 'border-primary bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')
  const people = (key: 'todoAssignees' | 'toprintAssignees', title: string, hint: string) => {
    const chosen = current[key] ?? []
    return (
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-sm font-medium">{title}</legend>
        <p className="text-xs text-muted-foreground">{hint}</p>
        <div className="flex flex-wrap gap-1.5">
          {(members.data ?? []).map((member) => {
            const on = chosen.includes(member.userId)
            return (
              <button
                key={member.userId}
                type="button"
                aria-pressed={on}
                disabled={save.isPending}
                onClick={() => save.mutate({ [key]: on ? chosen.filter((id) => id !== member.userId) : [...chosen, member.userId] })}
                className={cn('h-8 rounded-full border px-3 text-sm', on ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}
              >
                {member.fullName || member.email}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">{chosen.length === 0 ? 'Nikto nevybraný – úloha bude pre toho, kto kľúčové slovo napísal.' : `Úlohu dostanú: ${chosen.length} ${chosen.length === 1 ? 'človek' : 'ľudia'}.`}</p>
      </fieldset>
    )
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl border bg-surface p-4">
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">QR štítky tlačiť na</legend>
        <div className="flex flex-wrap gap-1">
          <button type="button" aria-pressed={(current.qrTarget ?? 'a4') === 'a4'} disabled={save.isPending} onClick={() => save.mutate({ qrTarget: 'a4' })} className={chip((current.qrTarget ?? 'a4') === 'a4')}>
            A4 (väčšie – skenujú sa aj iPhonom)
          </button>
          <button type="button" aria-pressed={current.qrTarget === 'brother'} disabled={save.isPending} onClick={() => save.mutate({ qrTarget: 'brother' })} className={chip(current.qrTarget === 'brother')}>
            Štítky (páska)
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Adresy, DMX módy a odber sa tlačia vždy na pásku (štítky).</p>
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Veľkosť QR na A4</legend>
        <div className="flex flex-wrap gap-1">
          {QR_SIZES.map((size) => (
            <button key={size} type="button" aria-pressed={(current.qrSize ?? 'medium') === size} disabled={save.isPending} onClick={() => save.mutate({ qrSize: size })} className={chip((current.qrSize ?? 'medium') === size)}>
              {QR_SIZE_LABELS[size]}
            </button>
          ))}
        </div>
        {current.qrSize === 'custom' && (
          <label className="mt-2 flex items-center gap-2 text-sm">
            Strana QR kódu
            <input
              key={current.qrMm ?? 50}
              type="number"
              min={QR_MM_MIN}
              max={QR_MM_MAX}
              className="h-9 w-24 rounded-lg border bg-background px-2"
              defaultValue={current.qrMm ?? 50}
              onBlur={(event) => {
                const value = clampQrMm(Number(event.target.value))
                if (value !== current.qrMm) save.mutate({ qrMm: value })
              }}
            />
            mm <span className="text-xs text-muted-foreground">({QR_MM_MIN}–{QR_MM_MAX} mm; iPhone spoľahlivo číta od cca 30 mm)</span>
          </label>
        )}
      </fieldset>
      {people('todoAssignees', 'Komu ukázať úlohy z @todo (31121800)', '@todo v políčku (napr. pri váhe) vytvorí úlohu „Doplniť: …“. Do čísla 31121800, do dátumu 31. 12. 1800.')}
      {people('toprintAssignees', 'Komu ukázať úlohy z @toprint (01001800)', '@toprint v políčku (napr. pri čísle case) vytvorí úlohu „Vytlačiť: …“ a štítok dá do tlačovej fronty. Do čísla 01001800, do dátumu 1. 1. 1800.')}
      {(save.isError || prefs.isError) && (
        <p className="text-sm text-destructive">
          {/company_prefs/.test(String(save.error?.message ?? '')) ? 'Nastavenia tlače ešte databáza nepozná – spustite v Supabase supabase/update-all.sql (migrácia 0120).' : `Nepodarilo sa uložiť. ${errorDetail(save.error)}`}
        </p>
      )}
    </div>
  )
}
