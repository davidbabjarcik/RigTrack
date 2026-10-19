import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { errorDetail } from '@/lib/supabase/errors'
import { CHECK_LEVEL_LABELS, checkLevelKeys, saveCheckLevels, useCheckLevels, type CheckLevelDays } from './levels'

/** Nastavenia → Úrovne kontroly: po koľkých dňoch kontrolovať pri úrovni malá / stredná / veľká. */
export function CheckLevelsSettings({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient()
  const { days, query } = useCheckLevels(companyId)
  const [draft, setDraft] = useState<CheckLevelDays | null>(null)
  const value = draft ?? days
  const save = useMutation({
    mutationFn: () => saveCheckLevels(companyId, value),
    onSuccess: () => setDraft(null),
    onSettled: () => queryClient.invalidateQueries({ queryKey: checkLevelKeys.days(companyId) }),
  })
  const valid = (['low', 'normal', 'high'] as const).every((key) => Number.isInteger(value[key]) && value[key] >= 1 && value[key] <= 3650)

  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="text-sm text-muted-foreground">
        Platí pre <strong>cases a racky</strong> (ako často kontrolovať obsah) aj pre <strong>prevádzkové hodiny</strong> techniky (ako často odčítať).
        Pri každom case či technike potom vyberiete úroveň. Úroveň „{CHECK_LEVEL_LABELS.none}“ sa nekontroluje.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {(['low', 'normal', 'high'] as const).map((level) => (
          <Field
            key={level}
            label={`${CHECK_LEVEL_LABELS[level]} – každých (dní)`}
            type="number"
            inputMode="numeric"
            min={1}
            max={3650}
            value={Number.isNaN(value[level]) ? '' : value[level]}
            onChange={(e) => setDraft({ ...value, [level]: e.target.valueAsNumber })}
          />
        ))}
      </div>
      {query.isError && <p className="mt-2 text-sm text-destructive">Úrovne sa nedajú uložiť – táto časť databázy ešte nie je pripravená, kontaktujte vývojára aplikácie.</p>}
      {save.isError && <p className="mt-2 text-sm text-destructive">Uloženie zlyhalo. {errorDetail(save.error)}</p>}
      <Button className="mt-3" size="sm" disabled={!draft || !valid || save.isPending} onClick={() => save.mutate()}>
        Uložiť
      </Button>
    </div>
  )
}
