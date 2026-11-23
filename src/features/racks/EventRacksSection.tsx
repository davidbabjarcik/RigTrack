import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Server } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import type { Membership } from '@/features/companies/company-context'
import type { CompanyEvent } from '@/features/events/model'
import { tf, tx } from '@/lib/i18n'
import { can } from '@/lib/permissions'
import { copyRack, fetchRacks, rackKeys } from './api'

/** Racky akcie: zoznam a vloženie šablóny (kusy sa pridajú do techniky akcie a rezervujú). */
export function EventRacksSection({ company, event }: { company: Membership; event: CompanyEvent }) {
  const companyId = company.companyId
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const racks = useQuery({ queryKey: rackKeys.list(companyId), queryFn: () => fetchRacks(companyId), retry: false })
  const [template, setTemplate] = useState('')
  const insert = useMutation({
    mutationFn: () => copyRack(template, racks.data?.find((rack) => rack.id === template)?.name ?? '', false, event.id),
    onSuccess: async (id) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: rackKeys.list(companyId) }), queryClient.invalidateQueries({ queryKey: ['company', companyId, 'events'] })])
      navigate(`/racks/${id}`)
    },
  })
  if (!racks.data) return null
  const mine = racks.data.filter((rack) => rack.eventId === event.id)
  const templates = racks.data.filter((rack) => rack.isTemplate)
  const canInsert = can(company, 'racks.edit') && templates.length > 0
  if (mine.length === 0 && !canInsert) return null

  return (
    <CollapsibleSection id="event.racks" title={<span className="inline-flex items-center gap-2"><Server className="size-4" aria-hidden />{tf('Racky ({0})', mine.length)}</span>}>
      {mine.length > 0 && (
        <ul className="mb-3 divide-y overflow-hidden rounded-xl border bg-surface">
          {mine.map((rack) => (
            <li key={rack.id}>
              <Link to={`/racks/${rack.id}`} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted">
                <span className="min-w-0 flex-1 font-medium">{rack.name}</span>
                <span className="text-muted-foreground">{rack.units} U</span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {canInsert && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm font-medium">
            {tx('Pridať rack zo šablóny')}
            <select className="h-10 rounded-lg border bg-background px-2 font-normal" value={template} onChange={(changed) => setTemplate(changed.target.value)}>
              <option value="">{tx('— vyberte šablónu —')}</option>
              {templates.map((rack) => (
                <option key={rack.id} value={rack.id}>
                  {rack.name} ({rack.units} U)
                </option>
              ))}
            </select>
          </label>
          <Button disabled={!template || insert.isPending} onClick={() => insert.mutate()}>
            {insert.isPending ? tx('Pridávam…') : tx('Pridať do akcie')}
          </Button>
          <p className="basis-full text-xs text-muted-foreground">{tx('Kusy z racku sa pridajú do techniky akcie (pack list) a v termíne akcie sa rezervujú.')}</p>
          {insert.isError && <p className="basis-full text-sm text-destructive">{tx('Rack sa nepodarilo pridať.')}</p>}
        </div>
      )}
    </CollapsibleSection>
  )
}
