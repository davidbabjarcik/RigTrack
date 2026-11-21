import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, LayoutTemplate } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { tx } from '@/lib/i18n'
import type { CompanyEvent } from './model'
import { saveTemplate, templateFrom, templateKeys } from './templates'

/** Uloží event (techniku, posádku, časy, miesto a elektrinu) ako šablónu pre ďalšie eventy. */
export function SaveTemplateButton({ companyId, event }: { companyId: string; event: CompanyEvent }) {
  const queryClient = useQueryClient()
  const save = useMutation({
    mutationFn: (name: string) => saveTemplate(companyId, name, templateFrom(event)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: templateKeys.list(companyId) }),
  })
  const ask = () => {
    const name = window.prompt(tx('Názov šablóny (napr. Svadba – základ). Šablóna s rovnakým názvom sa prepíše.'), event.name)
    if (name?.trim()) save.mutate(name)
  }
  return (
    <Button variant="outline" size="sm" disabled={save.isPending} onClick={ask} title={save.isError ? tx('Šablónu sa nepodarilo uložiť (migrácia 0181).') : undefined}>
      {save.isSuccess ? <Check className="size-4" aria-hidden /> : <LayoutTemplate className="size-4" aria-hidden />}
      {save.isSuccess ? tx('Šablóna uložená') : save.isError ? tx('Nepodarilo sa uložiť') : tx('Uložiť ako šablónu')}
    </Button>
  )
}
