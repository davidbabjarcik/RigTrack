import { LayoutGrid } from 'lucide-react'
import { LinkButton } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { useEventStagePlan } from './api'
import { tx, tf } from '@/lib/i18n'

const SIDE_LABELS: Record<string, string> = { front: 'vpredu', back: 'vzadu', left: 'vľavo', right: 'vpravo' }

/** V detaile eventu: uložený plán pódia (rozmer, výška, schody, plachta) s odkazom na nákres a tlač. */
export function EventStagePlan({ companyId, eventId }: { companyId: string; eventId: string }) {
  const plan = useEventStagePlan(companyId, eventId)
  if (!plan.data) return null
  const r = plan.data.request
  const details = [
    r.heightCm && tf('výška {0} cm', r.heightCm),
    (r.stairs ?? []).length > 0 && `schody ${(r.stairs ?? []).length}×`,
    (r.skirtSides ?? []).length > 0 && `plachta ${(r.skirtSides ?? []).map((side) => SIDE_LABELS[side] ?? side).join(', ')}`,
    (r.railingSides ?? []).length > 0 && tf('zábradlie {0}', (r.railingSides ?? []).map((side) => SIDE_LABELS[side] ?? side).join(', ')),
    r.catwalk && 'molo',
    (r.risers ?? []).length > 0 && `rizery ${(r.risers ?? []).length}×`,
  ].filter(Boolean)
  return (
    <section className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border bg-surface p-4" aria-label={tx('Pódium')}>
      <LayoutGrid className="size-5 shrink-0 text-accent" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{tx('Pódium')}{' '}{r.widthM} × {r.depthM} m
        </p>
        <p className="text-sm text-muted-foreground">
          {[...details, `uložené ${formatDate(plan.data.updatedAt.slice(0, 10))}`].join(' · ')}
        </p>
      </div>
      <LinkButton to={`/stage?event=${eventId}`} variant="outline" size="sm">{tx('Otvoriť plán a tlač')}</LinkButton>
    </section>
  )
}
